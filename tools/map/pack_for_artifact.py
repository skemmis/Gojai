"""Pack the drawn map for the published play page (an artifact holds at most 511 files): z13-15 as-is, z16 rebuilt at 1024 px from its z17 children, so a build with maxzoom 16 keeps z17 detail.

  python3 tools/map/pack_for_artifact.py apps/map/drawn-tiles/drawn OUT/drawn   (then build with tiles.json maxzoom 16)
"""
import os, shutil, sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
shutil.rmtree(dst, ignore_errors=True)
for z in ("13", "14", "15"):
    shutil.copytree(os.path.join(src, z), os.path.join(dst, z))
n = 0
for x in os.listdir(os.path.join(src, "16")):
    for f in os.listdir(os.path.join(src, "16", x)):
        y = int(f.split(".")[0]); xi = int(x)
        base = Image.open(os.path.join(src, "16", x, f)).convert("RGBA").resize((1024, 1024), Image.LANCZOS)
        for dx in (0, 1):
            for dy in (0, 1):
                p = os.path.join(src, "17", str(2 * xi + dx), f"{2 * y + dy}.webp")
                if os.path.exists(p):
                    base.paste(Image.open(p).convert("RGBA"), (dx * 512, dy * 512))
        os.makedirs(os.path.join(dst, "16", x), exist_ok=True)
        base.save(os.path.join(dst, "16", x, f), "WEBP", quality=80)
        n += 1
print("z16 tiles", n)
