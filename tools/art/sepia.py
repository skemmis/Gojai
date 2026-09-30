"""Lock grey artwork to the house sepia ramp (ink #2A1E14 to paper #ECE3CF).

    python3 tools/art/sepia.py apps/play/src/assets/enemy-*.webp

Rewrites each file in place. Neutral pixels are mapped by brightness onto the
ramp; coloured pixels (a red drip, a pink wash) are kept as they are; alpha
is untouched. Running it twice changes nothing visible.
"""
import sys
import numpy as np
from PIL import Image

INK = np.array([0x2A, 0x1E, 0x14], float)
PAPER = np.array([0xEC, 0xE3, 0xCF], float)

for path in sys.argv[1:]:
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(float)
    rgb, alpha = a[..., :3], a[..., 3:]
    lum = rgb @ [0.299, 0.587, 0.114]
    t = np.clip((lum - 20) / 215, 0, 1)[..., None]
    sepia = INK + (PAPER - INK) * t
    # Keep real colour: fully for strong spot ink, blended for the in-between
    chroma = (rgb.max(2) - rgb.min(2))[..., None]
    keep = np.clip((chroma - 35) / 30, 0, 1)
    out = sepia * (1 - keep) + rgb * keep
    Image.fromarray(np.concatenate([np.clip(out, 0, 255), alpha], 2).astype(np.uint8)).save(path, quality=90, method=6)
    print("sepia", path)
