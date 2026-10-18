/*
  text-reveal: two small serif text blocks in opposite corners (top left, bottom right)
  that materialise through a WebGL mask reveal. One offscreen 2D canvas holds both
  blocks; a fragment shader dissolves them in along a cloudy, domain warped fbm front
  with a soft diagonal bias, un-blurring each part with a ring blur as it is uncovered,
  plus a small drift and grow so the text settles into place. A per cycle seed means no
  two reveals dissolve the same. Progress is a critically damped spring (the exit spring
  is stiffer, so it clears quicker than it arrives). Phases: in, hold, out, swap pair.
  The plate leans toward the cursor with one shared texture space parallax offset.

  mount(el, opts) -> { destroy }
    opts.pairs   [{ top: [..], bottom: [..] }]   phrase pairs to rotate through
    opts.bg      plate colour      (default Orbe paper)
    opts.ink     text colour       (default Orbe ink)
    opts.edge    rule colour       (default Orbe linen)
    opts.font    css font family   (default Newsreader)
*/

const VERT = `
  attribute vec2 aPosition;
  attribute vec2 aUV;
  varying vec2 vUV;
  void main(){
    vUV = aUV;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// The reveal shader. The source's additive edge glow and halo are removed (Orbe: no
// glows); the passing front keeps its blur, drift, grow and a faint colour split.
const FRAG = `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2  uTexel;
  uniform float uProgress;
  uniform float uMaxBlur;
  uniform float uTime;
  uniform float uAspect;
  uniform float uSeed;
  uniform vec2  uParTL;
  uniform vec2  uParBR;
  uniform vec2  uCursor;
  uniform float uHover;
  uniform float uReverse;
  varying vec2 vUV;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }

  vec4 blurTex(vec2 uv, float radius){
    if (radius < 0.35) return texture2D(uTex, uv);
    vec2 r1 = uTexel * radius;
    vec2 r2 = uTexel * radius * 2.0;
    vec4 sum = texture2D(uTex, uv);
    float wsum = 1.0;
    for (int i = 0; i < 8; i++){
      float a = float(i) * 0.785398;
      vec2 dir = vec2(cos(a), sin(a));
      sum += texture2D(uTex, uv + dir * r1) * 0.75; wsum += 0.75;
      sum += texture2D(uTex, uv + dir * r2) * 0.5;  wsum += 0.5;
    }
    return sum / wsum;
  }

  float fbm(vec2 p){
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 4; i++){
      v += amp * noise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  void main(){
    float region = smoothstep(0.35, 0.65, (vUV.x + vUV.y) * 0.5);
    vec2 par = mix(uParTL, uParBR, region);
    vec2 baseUV = vUV + par;

    if (uProgress >= 0.999) { gl_FragColor = texture2D(uTex, baseUV); return; }

    float p = uProgress * 1.3;
    vec2 sd = vec2(uSeed * 1.7, uSeed * -1.3);
    vec2 rc = (vUV - 0.5) * vec2(uAspect, 1.0);

    float diag = smoothstep(0.18, 0.82, (vUV.x + vUV.y) * 0.5);
    diag = mix(diag, 1.0 - diag, uReverse);
    diag += (fbm(vUV * 1.3 + sd) - 0.5) * 0.08;

    vec2 warp = vec2(fbm(vUV * 3.2 + sd + uTime * 0.05 + 11.0),
                     fbm(vUV * 3.2 - sd - uTime * 0.04 - 7.0)) - 0.5;
    float turb = fbm(vUV * 5.5 + warp * 1.7 + sd + uTime * 0.06);
    float stipple = noise(vUV * vec2(uAspect, 1.0) * 46.0 + sd * 3.0);

    float mask = mix(diag, turb, 0.28);
    mask = mix(mask, stipple, 0.14);

    vec2 cur = (vUV - uCursor) * vec2(uAspect, 1.0);
    float near = 1.0 - smoothstep(0.0, 0.32, length(cur));
    mask -= near * uHover * 0.28;

    float reveal = smoothstep(p + 0.22, p - 0.22, mask);
    if (reveal <= 0.0) discard;

    float blurAmt = smoothstep(p - 0.34, p + 0.22, mask);
    vec2 drift = (-rc * 0.010 + vec2(0.0, 0.006)) * blurAmt;
    float grow = 1.0 + 0.03 * blurAmt;
    vec2 suv = (baseUV - 0.5) / grow + 0.5 + drift;

    float radius = blurAmt * uMaxBlur;
    vec4 tex = blurTex(suv, radius);

    float fw = 0.30;
    float front = smoothstep(p - fw, p, mask) * smoothstep(p + fw, p, mask);
    front *= 1.0 - smoothstep(0.8, 1.0, uProgress);
    float ab = front * 1.2 * uTexel.x * uMaxBlur;
    if (ab > 0.0001) {
      tex.r = blurTex(suv + vec2(ab, 0.0), radius).r;
      tex.b = blurTex(suv - vec2(ab, 0.0), radius).b;
    }

    gl_FragColor = vec4(tex.rgb, tex.a * reveal);
  }
`;

const DEFAULT_PAIRS = [
  {
    top: ["a free rating of your work,", "set against creators your size."],
    bottom: ["read from what you were paid,", "not from what someone guessed."],
  },
  {
    top: ["no follower maths,", "no estimates, no guesswork."],
    bottom: ["just the payouts on record,", "kept every time money moves."],
  },
  {
    top: ["orbe earns a share", "only when money moves."],
    bottom: ["so the rating stays free,", "and the record stays yours."],
  },
];

const HOLD_MS = 1600;
const OUT_HOLD_MS = 260;
const MAX_BLUR = 16;
const K_IN = 16;
const K_OUT = 22;
const DAMP = 1.12;
const REVEALED_AT = 0.95;
const GONE_AT = 0.02;
const PARALLAX_AMP = 0.006;
const TL_ANCHOR = [0.16, 0.18];
const BR_ANCHOR = [0.84, 0.82];

const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'/></filter><rect width='140' height='140' filter='url(#n)'/></svg>",
  );

class RevealGL {
  constructor() {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%", display: "block",
    });
    this.ok = false;
    this.tex = null;
    this.texW = 1;
    this.texH = 1;
    this.loc = {};
    let gl = null;
    try { gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }); } catch (e) { gl = null; }
    if (!gl) return;
    this.gl = gl;
    try { this.prog = this.build(VERT, FRAG); } catch (e) { return; }
    this.aPos = gl.getAttribLocation(this.prog, "aPosition");
    this.aUV = gl.getAttribLocation(this.prog, "aUV");
    for (const u of ["uTex", "uTexel", "uProgress", "uMaxBlur", "uTime", "uAspect", "uSeed",
      "uParTL", "uParBR", "uCursor", "uHover", "uReverse"]) {
      this.loc[u] = gl.getUniformLocation(this.prog, u);
    }
    const data = new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.ok = true;
  }

  build(vs, fs) {
    const gl = this.gl;
    const c = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, c(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, c(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "program link failed");
    return p;
  }

  setTexture(art) {
    if (!this.ok) return;
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);
    this.tex = tex;
    this.texW = art.width;
    this.texH = art.height;
  }

  resize(w, h, dpr) {
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    if (this.ok) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(progress, maxBlur, time, aspect, seed, parTL, parBR, cursor, hover, reverse) {
    if (!this.ok || !this.tex) return;
    const gl = this.gl;
    const L = this.loc;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.aUV);
    gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, 16, 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(L.uTex, 0);
    gl.uniform2f(L.uTexel, 1 / this.texW, 1 / this.texH);
    gl.uniform1f(L.uProgress, progress);
    gl.uniform1f(L.uMaxBlur, maxBlur);
    gl.uniform1f(L.uTime, time);
    gl.uniform1f(L.uAspect, aspect);
    gl.uniform1f(L.uSeed, seed);
    gl.uniform2f(L.uParTL, parTL[0], parTL[1]);
    gl.uniform2f(L.uParBR, parBR[0], parBR[1]);
    gl.uniform2f(L.uCursor, cursor[0], cursor[1]);
    gl.uniform1f(L.uHover, hover);
    gl.uniform1f(L.uReverse, reverse);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    if (!this.ok) return;
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    if (this.quad) gl.deleteBuffer(this.quad);
    if (this.prog) gl.deleteProgram(this.prog);
    const ext = gl.getExtension("WEBGL_lose_context");
    if (ext) ext.loseContext();
  }
}

// Both corner blocks drawn into one canvas at the card's size. On a tall (phone) card
// the lines may run wider, since the blocks are stacked far apart vertically.
function renderCornerText(o) {
  const dpr = o.dpr;
  const cssW = Math.max(1, Math.round(o.cardW));
  const cssH = Math.max(1, Math.round(o.cardH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = o.fill;
  ctx.textBaseline = "top";

  const tall = cssH / cssW > 0.7;
  const pad = Math.round(Math.max(16, cssW * (tall ? 0.06 : 0.035)));
  const maxLineW = cssW * (tall ? 0.84 : 0.52);
  const all = [...o.top, ...o.bottom];
  let fontSize = Math.max(18, Math.min(40, cssW * (tall ? 0.06 : 0.03)));
  for (let i = 0; i < 30; i++) {
    ctx.font = `400 ${fontSize}px ${o.font}`;
    const widest = Math.max(...all.map((l) => ctx.measureText(l).width));
    if (widest <= maxLineW || fontSize <= 14) break;
    fontSize -= 1;
  }
  const lineH = fontSize * 1.32;
  ctx.font = `400 ${fontSize}px ${o.font}`;

  ctx.textAlign = "left";
  o.top.forEach((line, i) => ctx.fillText(line, pad, pad + i * lineH));
  ctx.textAlign = "right";
  const startY = cssH - pad - o.bottom.length * lineH;
  o.bottom.forEach((line, i) => ctx.fillText(line, cssW - pad, startY + i * lineH));
  return canvas;
}

function springStep(pos, vel, target, k, damp, dt) {
  const c = 2 * Math.sqrt(k) * damp;
  const accel = -k * (pos - target) - c * vel;
  const v = vel + accel * dt;
  return [pos + v * dt, v];
}

export function mount(el, opts = {}) {
  const pairs = opts.pairs && opts.pairs.length ? opts.pairs : DEFAULT_PAIRS;
  const BG = opts.bg || "#F3F0E8";
  const INK = opts.ink || "#141311";
  const EDGE = opts.edge || "#E7E2D7";
  const fontCss = opts.font || '"Newsreader", Georgia, serif';
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const host = el;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  host.style.backgroundColor = BG;
  host.style.userSelect = "none";
  host.setAttribute("aria-hidden", "true");

  const added = [];
  const layer = (css) => {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;pointer-events:none;" + css;
    host.appendChild(d);
    added.push(d);
    return d;
  };
  // A soft chalk wash over the paper plate, then grain on top.
  layer(
    "inset:-8%;background-image:" + [
      "radial-gradient(55% 75% at 18% 12%, rgba(251,250,246,0.95), transparent 60%)",
      "radial-gradient(48% 66% at 82% 22%, rgba(251,250,246,0.7), transparent 62%)",
      "radial-gradient(42% 52% at 8% 85%, rgba(251,250,246,0.7), transparent 60%)",
      "radial-gradient(52% 60% at 92% 88%, rgba(251,250,246,0.6), transparent 62%)",
    ].join(","),
  );
  const grain = layer(`inset:0;background-image:url("${GRAIN_SVG}");background-size:140px 140px;opacity:0.09;mix-blend-mode:multiply;z-index:2`);

  let W = host.clientWidth || 1;
  let H = host.clientHeight || 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const gl = new RevealGL();
  const useGL = gl.ok;
  let fallback = null;
  if (useGL) {
    gl.resize(W, H, dpr);
    host.insertBefore(gl.canvas, grain);
  } else {
    fallback = document.createElement("canvas");
    Object.assign(fallback.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
    host.insertBefore(fallback, grain);
  }

  let index = 0;
  let seed = 1.7;

  const paint = () => {
    const pair = pairs[index];
    const art = renderCornerText({ top: pair.top, bottom: pair.bottom, font: fontCss, fill: INK, cardW: W, cardH: H, dpr });
    if (useGL) gl.setTexture(art);
    else {
      fallback.width = art.width;
      fallback.height = art.height;
      fallback.getContext("2d").drawImage(art, 0, 0);
    }
  };
  paint();

  let pTgtX = 0.5, pTgtY = 0.5, pCurX = 0.5, pCurY = 0.5;
  let cursorUV = [-1, -1];
  let hoverTgt = 0, hoverCur = 0;
  const onMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const b = host.getBoundingClientRect();
    const ux = (e.clientX - b.left) / b.width;
    const uy = (e.clientY - b.top) / b.height;
    pTgtX = ux; pTgtY = uy;
    cursorUV = [ux, uy];
    hoverTgt = 1;
  };
  const onLeave = () => { pTgtX = 0.5; pTgtY = 0.5; hoverTgt = 0; };
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);

  let phase = "in";
  let phaseStart = 0;
  let progress = 0, vel = 0, target = 1;
  let clock = 0, last = 0, raf = 0, running = false, held = 0;

  const loop = () => {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    clock += dt;

    const k = target > 0.5 ? K_IN : K_OUT;
    [progress, vel] = springStep(progress, vel, target, k, DAMP, dt);

    if (phase === "in") {
      if (progress >= REVEALED_AT) { phase = "hold"; phaseStart = now; }
    } else if (phase === "hold") {
      if (now - phaseStart >= HOLD_MS) { phase = "out"; phaseStart = now; target = 0; }
    } else if (progress <= GONE_AT && now - phaseStart >= OUT_HOLD_MS) {
      index = (index + 1) % pairs.length;
      seed = ((seed * 1.618) % 7) + 0.3;
      paint();
      phase = "in"; phaseStart = now; progress = 0; vel = 0; target = 1;
    }

    const pk = 1 - Math.pow(0.0009, dt);
    pCurX += (pTgtX - pCurX) * pk;
    pCurY += (pTgtY - pCurY) * pk;
    hoverCur += (hoverTgt - hoverCur) * (1 - Math.pow(0.002, dt));
    const amp = PARALLAX_AMP * hoverCur;
    const parTL = [(pCurX - TL_ANCHOR[0]) * amp, (pCurY - TL_ANCHOR[1]) * amp];
    const parBR = [(pCurX - BR_ANCHOR[0]) * amp, (pCurY - BR_ANCHOR[1]) * amp];

    const p = Math.max(0, Math.min(1, progress));
    const reverse = phase === "out" ? 1 : 0;
    if (useGL) {
      gl.draw(p, MAX_BLUR, clock, W / Math.max(1, H), seed, parTL, parBR, cursorUV, hoverCur, reverse);
      held += ((phase === "hold" ? 1 : 0) - held) * (1 - Math.pow(0.02, dt));
      const breathe = Math.sin(clock * 0.45) * 0.5 + 0.5;
      gl.canvas.style.transform = `scale(${(1 + held * breathe * 0.0015).toFixed(4)})`;
    }
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running || !useGL) return;
    running = true;
    phase = "in"; phaseStart = performance.now(); last = phaseStart;
    progress = 0; vel = 0; target = 1;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const renderStill = () => {
    if (useGL) gl.draw(1, 0, 0, W / Math.max(1, H), seed, [0, 0], [0, 0], [-1, -1], 0, 0);
  };

  let onScreen = false;
  let hidden = document.hidden;
  const sync = () => {
    if (reduced) return;
    if (onScreen && !hidden) start();
    else stop();
  };
  const io = new IntersectionObserver((es) => { onScreen = es[0] ? es[0].isIntersecting : false; sync(); }, { threshold: 0.15 });
  io.observe(host);
  const onVis = () => { hidden = document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVis);

  let resizeT = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const nw = host.clientWidth || 1;
      const nh = host.clientHeight || 1;
      if (nw < 2 || nh < 2 || (nw === W && nh === H)) return;
      W = nw; H = nh;
      if (useGL) gl.resize(W, H, dpr);
      paint();
      if (reduced || !running) renderStill();
    }, 120);
  });
  ro.observe(host);

  // Warm the face so the texture is set in Newsreader, not the fallback.
  let disposed = false;
  if (document.fonts && document.fonts.load) {
    document.fonts.load(`400 24px ${fontCss}`).then(() => {
      if (disposed) return;
      paint();
      if (reduced) renderStill();
    }, () => {});
  }
  if (reduced) renderStill();

  return {
    destroy() {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      clearTimeout(resizeT);
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.destroy();
      if (gl.canvas.parentNode) gl.canvas.parentNode.removeChild(gl.canvas);
      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
      added.forEach((d) => d.parentNode && d.parentNode.removeChild(d));
    },
  };
}
