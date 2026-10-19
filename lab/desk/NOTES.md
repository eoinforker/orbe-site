# Orbe's desk: notes and reusable pieces

One hero screen at `site/lab/desk/`: an Odin-style sentence over a baked three.js desk whose monitor runs a 1-bit TypeSafe-style window. Every figure comes from the Orbe engine at load.

## Files

| File | What |
|---|---|
| `index.html`, `style.css`, `main.js` | The page, the sentence, the rotation and pause control, the reserve form, the engine labels, the band, the footer |
| `scene.js` | three.js desk: baked statics, live orbs and sheets, physics, framing, pointer |
| `screen.js` | The 1-bit window drawn to a canvas (period chrome) |
| `paper.js` | The record slip and the fee ledger, drawn to canvases |
| `assets/desk.glb`, `desk-light.png`, `ground-light.png` | Blender model and baked irradiance lightmaps |
| `assets/build/desk.py`, `post.py` | The Blender 4.2 script that models and bakes the desk, and the encoder for the lightmaps |
| `assets/still-*.webp` | No-WebGL stills, one per kind, desktop and `-phone` |
| `assets/vendor/three-addons/` | GLTFLoader, BufferGeometryUtils and RoomEnvironment from three 0.160.0 (MIT, `LICENSE`) |
| `assets/fonts/DepartureMono-Regular.woff2` | Departure Mono 1.500, Helena Zhang, SIL OFL 1.1 (`DepartureMono-OFL.txt`) |

Query flags: `?still` (no motion), `?nogl` (the fallback), `?kind=podcast` (open on a kind).

## Reusable pieces

### 1. TypeSafe-grade window chrome (`screen.js`)
A 1-bit desktop drawn at native resolution (256 x 192), thresholded to ink and paper, then scaled up 6x with no smoothing. It has a solid title bar, a zoom box, an inner groove rule, a hard 2px drop shadow, a stippled desktop and a menu bar whose glyph is a small filled orb.

```js
import { createScreen } from "../lab/desk/screen.js";   // needs the Departure Mono @font-face from style.css
await document.fonts.load('11px "Departure Mono"');
const s = createScreen();
s.draw({ handle: "@fieldrecordings", n: 93, peers: "channels", sizeBand: "250k to 1M subscribers" }, 1, false);
document.body.append(s.canvas);   // or new THREE.CanvasTexture(s.canvas)
```
Its rules: Departure Mono only at 11 or 22px, integer coordinates, two inks. For HTML windows in Studio, copy the same geometry: a 14px ink title bar, a 1px frame, the groove 2px inside it, and a 2px hard shadow.

### 2. Odin rotating word (`main.js`, `swapWord` and `.slot` in `style.css`)
The slot's width animates over 450ms with cubic-bezier(0.45, 0, 0.2, 1), so the line re-centres. The old word moves up 100% in 360ms while its characters fade. The new characters rise from translateY(100%) over 360ms, staggered 24ms. The entrance is Odin's measured 1100ms reveal after 220ms (`@keyframes say-in`). To reuse it, copy `chars()`, `swapWord()` and the `.slot` rules; markup is `<span class="slot" data-slot><span class="w">word</span></span>`. It goes round once, then stops, with a Pause, Play or Again button (WCAG 2.2.2).

### 3. The desk (`scene.js` + assets)
`createDesk({ canvas, room, still, onFirstFrame })` returns `{ setKind(d), setRack(levels), setLedger(rows), drop(), onFrame }`:
- `room()` returns the rect to frame the desk into;
- `onFrame` receives projected anchor points for HTML labels.
- Statics are one draw call: vertex-colour albedo times a baked irradiance lightmap, so palette colours can change without a rebake.
- `makeOrb(R, inner)` is a glass orb whose liquid surface is a world-space clipping plane plus a disc, so it stays level, sloshes and springs to a new score.
- The physics is a small custom solver (circles and sheets on one plane, a spring hand, friction tuned to settle in under 2s). The renderer sleeps when nothing moves.
- To rebake: `blender -b -P assets/build/desk.py -- OUT 32 1024`, then `python3 assets/build/post.py OUT`, then copy the glb and the PNGs.

## Known gaps
- On the phone the desk is small and the window text is barely legible; the window needs a phone-only layout (one figure, 3 lines).
- At 93 the orb reads as a full blue ball; the fill only becomes legible at lower scores (podcast, 63).
- Lighting is soft and clean but plain beside Bruno Simon's toon-lit world: there is no sound, no time of day, and no consequence beyond sliding.
- The paper for the channel is Nova Plays (the record engine's only money fixture), not Field Recordings; the other kinds show a personal best instead of money.
