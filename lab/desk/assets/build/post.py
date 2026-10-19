# Normalise and encode the baked irradiance as sRGB PNG lightmaps.
import sys, json, numpy as np
from PIL import Image
out = sys.argv[1]
d = np.load(f"{out}/desk-light.npy")[::-1]
g = np.load(f"{out}/ground-light.npy")[::-1]
mask = d.sum(axis=2) > 0
dnorm = float(np.percentile(d[mask].max(axis=1), 99.7))
gnorm = float(np.median(g[0:40, 0:40].mean(axis=2)))
def enc(x):
    x = np.clip(x, 0, 1)
    return (np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055) * 255 + 0.5).astype(np.uint8)
Image.fromarray(enc(d / dnorm)).save(f"{out}/desk-light.png", optimize=True)
gg = (g / gnorm).mean(axis=2, keepdims=True).repeat(3, axis=2)
Image.fromarray(enc(gg)).save(f"{out}/ground-light.png", optimize=True)
json.dump({"desk_norm": dnorm, "ground_norm": gnorm}, open(f"{out}/bake.json", "w"))
print(dnorm, gnorm, d.max())
