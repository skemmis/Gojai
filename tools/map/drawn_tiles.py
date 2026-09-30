# Cut the hand-drawn map (the stitched 600 m "cores" from the Gemini map pipeline) into web-mercator
# XYZ tiles for MapScreen's base layer.
#   python3 tools/map/drawn_tiles.py [/mnt/project-files/gojai-ui/map-full] [apps/map/drawn-tiles/drawn] [--pack-only]
# Each core is the middle 600 m of a 900 m tile window centred on (cx, cy) in tiles.json, drawn in a local
# flat projection (metres east/north of the centre). Output: 512 px webp tiles, z13-17, only where drawn,
# packed into a few pack-N.bin files with a byte index in tiles.json, so a published page carries a handful of
# files instead of ~850 (MapScreen serves the tiles out of the packs). Loose tiles go to a scratch dir.
import json, math, os, sys
import numpy as np
from PIL import Image
SRC = '/mnt/project-files/gojai-ui/map-full'
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = args[0] if args else SRC
OUT = args[1] if len(args) > 1 else os.path.join(os.path.dirname(__file__), '../../apps/map/drawn-tiles/drawn')
LOOSE = os.environ.get('LOOSE', '/tmp/drawn-loose'); PACK_MB = 8
TS, ZMIN, ZMAX, Q = 512, 13, 17, 72
meta = json.load(open(f'{SRC}/tiles.json')); T = meta['tiles']
LAT0 = meta['origin'][1]; KX = 111320*math.cos(math.radians(LAT0)); KY = 111320
STEP = meta['step_m']; C = 1365                      # core px for 600 m
by = {(t['i'], t['j']): t for t in T}
cache = {}
def core(i, j):
    if (i, j) not in cache:
        t = by.get((i, j)); p = t and f"{SRC}/cores/{t['id']}.png"
        cache[(i, j)] = np.asarray(Image.open(p).convert('RGB')) if p and os.path.exists(p) else None
    return cache[(i, j)]
O = meta['origin']
def sample(lng, lat):
    """lng/lat arrays -> RGB + mask, nearest core, bilinear-ish via nearest pixel."""
    ex = (lng-O[0])*KX; ny = (lat-O[1])*KY           # metres from origin (tile x+0_y+0 centre)
    i = np.round(ex/STEP).astype(int); j = np.round(-ny/STEP).astype(int)
    rgb = np.zeros(lng.shape+(3,), np.uint8); m = np.zeros(lng.shape, bool)
    for (ii, jj) in set(zip(i.ravel().tolist(), j.ravel().tolist())):
        c = core(ii, jj)
        if c is None: continue
        t = by[(ii, jj)]
        sel = (i == ii) & (j == jj)
        px = ((lng[sel]-t['cx'])*KX/STEP + 0.5)*C; py = (0.5-(lat[sel]-t['cy'])*KY/STEP)*C
        px = np.clip(px.astype(int), 0, C-1); py = np.clip(py.astype(int), 0, C-1)
        rgb[sel] = c[py, px]; m[sel] = True
    return rgb, m
def tile_bounds(z, x, y):
    n = 2**z
    lng = lambda X: X/n*360-180
    lat = lambda Y: math.degrees(math.atan(math.sinh(math.pi*(1-2*Y/n))))
    return lng(x), lat(y+1), lng(x+1), lat(y)
lng_min = min(t['cx'] for t in T) - 0.006; lng_max = max(t['cx'] for t in T) + 0.006
lat_min = min(t['cy'] for t in T) - 0.005; lat_max = max(t['cy'] for t in T) + 0.005
if '--pack-only' not in sys.argv:
    PAPER = np.array([0xEC, 0xE3, 0xCF], np.uint8)
    count = 0; size = 0
    for z in range(ZMIN, ZMAX+1):
        n = 2**z
        x0 = int((lng_min+180)/360*n); x1 = int((lng_max+180)/360*n)
        ty = lambda la: int((1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*n)
        y0, y1 = ty(lat_max), ty(lat_min)
        for x in range(x0, x1+1):
            for y in range(y0, y1+1):
                w, s, e, nn = tile_bounds(z, x, y)
                u = (np.arange(TS)+0.5)/TS
                lng = w + (e-w)*u[None, :].repeat(TS, 0)
                # mercator rows
                Y = y + u[:, None].repeat(TS, 1)
                lat = np.degrees(np.arctan(np.sinh(np.pi*(1-2*Y/n))))
                rgb, m = sample(lng, lat)
                if not m.any(): continue
                a = np.where(m, 255, 0).astype(np.uint8)
                os.makedirs(f'{LOOSE}/{z}/{x}', exist_ok=True)
                p = f'{LOOSE}/{z}/{x}/{y}.webp'
                Image.fromarray(np.dstack([rgb, a])).save(p, quality=Q, method=6)
                count += 1; size += os.path.getsize(p)
        print('z', z, 'tiles so far', count, f'{size/1e6:.1f} MB', flush=True)
# pack: tiles in z/x/y order, a new pack every ~8 MB; index "z/x/y" -> [pack, offset, length]
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.startswith('pack-'): os.remove(f'{OUT}/{f}')
index, packs, buf = {}, [], bytearray()
def flush():
    global buf
    if buf: open(f'{OUT}/pack-{len(packs)}.bin', 'wb').write(buf); packs.append(f'pack-{len(packs)}.bin'); buf = bytearray()
for z in sorted(int(d) for d in os.listdir(LOOSE) if d.isdigit()):
    for x in sorted(int(d) for d in os.listdir(f'{LOOSE}/{z}')):
        for y in sorted(int(f[:-5]) for f in os.listdir(f'{LOOSE}/{z}/{x}')):
            b = open(f'{LOOSE}/{z}/{x}/{y}.webp', 'rb').read()
            if len(buf) + len(b) > PACK_MB * 1e6: flush()
            index[f'{z}/{x}/{y}'] = [len(packs), len(buf), len(b)]; buf += b
flush()
json.dump(dict(minzoom=ZMIN, maxzoom=ZMAX, tileSize=TS, bounds=[lng_min, lat_min, lng_max, lat_max], packs=packs, index=index),
          open(f'{OUT}/tiles.json', 'w'), separators=(',', ':'))
print(len(index), 'tiles in', len(packs), 'packs')
