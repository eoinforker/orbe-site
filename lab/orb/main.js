/*
  Orbe lab: the orb as a photographed object.

  A clear glass sphere (MeshPhysicalMaterial with transmission) holds a cobalt liquid that is
  ray traced analytically inside it: refraction at the wall and at the surface, total internal
  reflection under the surface, Beer Lambert absorption, a meniscus where the liquid meets the
  glass, and a slight dispersion (each colour channel is traced with its own index). The paper
  ground is shaded from a baked light transport map (tools in the handoff notes): the ratio of
  light reaching the paper with the orb present to without it, traced from the same studio HDRI,
  so the shadow carries the blue caustic. Far from the orb the ground is exactly Paper.

  The engraved ring at the equator marks typical for your size (50 in 100, half the volume).
  The liquid is filled by volume to the example creator's score.
*/
import * as THREE from "three";
import { RGBELoader } from "../../assets/vendor/three-addons/RGBELoader.js";
import { mountWordmark } from "../../assets/r5/wordmark.js";
import { reserve, cleanHandle } from "../../assets/r5/reserve.js";
import { example } from "../../assets/r5/examples.js";

const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);
const root = document.documentElement;

/* ---------- the example: beats N in 100 channels its size ---------- */
const ex = example("channel");
const BEATS = ex.result.parts.find((p) => p.key === "reach").score;
for (const n of document.querySelectorAll("[data-beats]")) n.textContent = String(BEATS);
for (const n of document.querySelectorAll("[data-ex-name]")) n.textContent = ex.name;
$("[data-orb-label]")?.setAttribute("aria-label", `A glass orb on paper, filled with blue liquid to ${BEATS} in 100. A fine line engraved round its middle marks typical for your size; the liquid sits well above it.`);

/* ---------- wordmark and the one action ---------- */
mountWordmark($("[data-wordmark]"), { animate: !root.classList.contains("still") });
const form = $("[data-reserve]");
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = form.querySelector("input");
  const status = form.querySelector("[data-status]");
  const h = cleanHandle(input.value);
  if (!h) { status.textContent = "Type the handle you want, like @fieldrecordings."; input.focus(); return; }
  status.textContent = `Opening your email to reserve @${h}.`;
  const r = await reserve({ handle: h, kind: "channel" });
  if (r.ok && r.via === "api") status.textContent = `@${h} is reserved for you.`;
  else if (!r.ok && r.reason === "taken") status.textContent = `@${h} is taken. Try another.`;
});

/* ---------- geometry of the object, in sphere radii ---------- */
const R = 1, RI = 0.965;
/* the fill reads by height, the way an eye reads a gauge: 0 in 100 at the bottom of the
   inside, 50 (typical for your size) at the middle where the line is cut, and 100 at the
   brim, set below the top so a dome of clear glass always shows above the liquid */
const BRIM = 0.6;
const levelFor = (p) => (p <= 0.5 ? RI * (2 * p - 1) : BRIM * (2 * p - 1));
const LEVEL = levelFor(BEATS / 100);
const ZERO = levelFor(0.5); /* the equator */
/* the cohort behind: [across, behind, size, fill in 100], in hero radii from the hero, as the camera sees it.
   Made up, like the example: a spread of creators the hero's size, most of them below 93. */
const COHORT_LAYOUT = [[2.2, 3.4, 0.62, 61], [-0.9, 7.2, 0.58, 38], [5.2, 11.5, 0.6, 74], [0.9, 10.4, 0.55, 50], [8.4, 9.0, 0.55, 27], [-3.6, 10.6, 0.52, 86], [3.0, 15.5, 0.5, 45]];
const LIQUIDS = {
  cobalt: { sigma: [4.2, 1.75, 0.32], name: "cobalt", bake: "assets/ground-w05.hdr" },
  sky: { sigma: [1.0, 0.24, 0.06], name: "sky", bake: "assets/ground-w05-sky.hdr" },
};
const LIQUID = LIQUIDS[params.get("liquid")] ?? LIQUIDS.cobalt;
root.dataset.liquid = LIQUID.name;

/* the camera: a long lens, a little above the surface */
const ELEV = THREE.MathUtils.degToRad(+(params.get("el") ?? 21));
/* the studio: Poly Haven "White Studio 05" (CC0), and the paper's light baked from it in Cycles */
const ENV = { hdr: "assets/white_studio_05_1k.hdr", bake: LIQUID.bake, key: [0.805, 0.593] };
const AZIM = Math.atan2(ENV.key[1], ENV.key[0]) + THREE.MathUtils.degToRad(+(params.get("az") ?? 38)); /* the key light sits behind, to the left */
const LENS = 7.2; /* focal length in orb radii of screen: keeps the perspective of a long lens at any size */

/* ---------- layout: where the orb sits, from the page's own slot ---------- */
const hero = $("[data-hero]");
const slot = $("[data-slot]");
const tags = { zero: $("[data-tag=zero]"), you: $("[data-tag=you]") };
function layout() {
  const h = hero.getBoundingClientRect();
  const s = slot.getBoundingClientRect();
  return { W: h.width, H: h.height, cx: s.left - h.left + s.width / 2, cy: s.top - h.top + s.height / 2, rp: s.width / 2 };
}

const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
function frame(L) {
  const fullW = 2 * Math.max(L.cx, L.W - L.cx), fullH = 2 * Math.max(L.cy, L.H - L.cy);
  const fpx = LENS * L.rp;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(fullH / 2 / fpx));
  const D = R * Math.sqrt(1 + (fpx / L.rp) ** 2);
  camera.position.set(Math.cos(ELEV) * Math.cos(AZIM + Math.PI) * D, Math.sin(ELEV) * D, Math.cos(ELEV) * Math.sin(AZIM + Math.PI) * D);
  camera.lookAt(0, 0, 0);
  camera.aspect = fullW / fullH;
  camera.setViewOffset(fullW, fullH, fullW / 2 - L.cx, fullH / 2 - L.cy, L.W, L.H);
  camera.near = D - 6; camera.far = D + 60;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/* labels: a hairline from the glass to the words, at the ring and at the surface.
   The height comes from the rightmost point of each ring as seen; the start from the glass's outline there. */
const _v = new THREE.Vector3();
function toScreen(L, p) { _v.copy(p).project(camera); return [(_v.x * 0.5 + 0.5) * L.W, (-_v.y * 0.5 + 0.5) * L.H]; }
function place(L, level) {
  const [ox, oy] = toScreen(L, new THREE.Vector3(0, 0, 0));
  const rs = L.rp; /* the camera is placed so the outline's radius on screen is the slot's radius */
  const put = (el, y, rr) => {
    if (!el) return;
    let best = null;
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const s = toScreen(L, new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr));
      if (!best || s[0] > best[0]) best = s;
    }
    const dy = best[1] - oy;
    const x = ox + Math.sqrt(Math.max(0, rs * rs - dy * dy));
    el.style.setProperty("--x", `${(x - L.cx) / L.rp}`);
    el.style.setProperty("--y", `${(best[1] - L.cy) / L.rp}`);
  };
  put(tags.zero, ZERO, R);
  put(tags.you, level, Math.sqrt(Math.max(0, RI * RI - level * level)));
}

/* ---------- static fallback (no WebGL, reduced motion, or ?still) ---------- */
const STILL = root.classList.contains("still");
function hasWebGL2() {
  try { const c = document.createElement("canvas"); return !!c.getContext("webgl2"); } catch (e) { return false; }
}
const canvas = $("[data-canvas]");
if (STILL || !hasWebGL2()) {
  root.classList.add("fallback");
  const relayout = () => { const L = layout(); frame(L); place(L, LEVEL); };
  relayout();
  addEventListener("resize", relayout);
  root.classList.add("ready");
} else {
  start().catch((err) => {
    console.warn("Orb fell back to the still:", err);
    root.classList.add("fallback");
    root.classList.add("ready");
  });
}

/* ---------- the renderer ---------- */
async function start() {
  /* Tone mapping: identity up to Paper, then a soft shoulder for highlights, so the paper
     around the orb is exactly the page's Paper and only speculars are compressed. */
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    "vec3 CustomToneMapping( vec3 color ) { return color; }",
    `vec3 CustomToneMapping( vec3 color ) {
      color *= toneMappingExposure;
      const float k = 0.905;
      vec3 over = max( color - k, 0.0 );
      return min( color, vec3( k ) ) + ( 1.0 - k ) * ( 1.0 - exp( -over / ( 1.0 - k ) ) );
    }`
  );

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: params.has("capture") });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.CustomToneMapping;
  renderer.toneMappingExposure = 1;
  const PAPER = new THREE.Color("#F3F0E8"); /* converted to linear by the colour manager */
  renderer.setClearColor(PAPER, 1);

  const [hdr, bake] = await Promise.all([
    new RGBELoader().loadAsync(ENV.hdr),
    new RGBELoader().loadAsync(ENV.bake),
  ]);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  hdr.minFilter = THREE.LinearFilter; hdr.magFilter = THREE.LinearFilter;
  hdr.generateMipmaps = false;
  hdr.needsUpdate = true;
  bake.colorSpace = THREE.NoColorSpace;
  bake.wrapS = bake.wrapT = THREE.ClampToEdgeWrapping;
  bake.minFilter = THREE.LinearFilter; bake.magFilter = THREE.LinearFilter; bake.generateMipmaps = false;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(hdr);
  pmrem.dispose();

  const scene = new THREE.Scene();
  const ENV_SCALE = 1.0;

  /* ground: Paper, times the baked light transport */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2).translate(0, -R, 0),
    new THREE.ShaderMaterial({
      dithering: true,
      uniforms: { uBake: { value: bake }, uExtent: { value: 6 }, uPaper: { value: PAPER.clone() }, uPlate: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uHasPlate: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform sampler2D uBake; uniform float uExtent; uniform vec3 uPaper; varying vec3 vW;
        uniform sampler2D uPlate; uniform vec2 uRes; uniform float uHasPlate;
        #include <common>
        #include <dithering_pars_fragment>
        /* the blue light cast through the liquid, held to a cobalt tint: the paper's warmth times a
           blue ratio drifts toward lavender, so green follows blue part of the way */
        vec3 castTint(vec3 r){ float l = dot(r, vec3(0.2126, 0.7152, 0.0722)); r = mix(vec3(l), r, 0.7); return vec3(r.r, mix(r.g, r.b, 0.4), r.b); }
        void main(){
          vec2 uv = vW.xz / (2.0 * uExtent) + 0.5;
          vec3 rho = texture2D(uBake, vec2(uv.x, 1.0 - uv.y)).rgb;
          float r = length(vW.xz) / uExtent;
          rho = mix(castTint(rho), vec3(1.0), smoothstep(0.62, 0.97, r));
          /* behind the hero: the cohort, rendered once and thrown out of focus */
          vec3 base = uHasPlate > 0.5 ? texture2D(uPlate, gl_FragCoord.xy / uRes).rgb : uPaper;
          gl_FragColor = vec4(base * rho, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <dithering_fragment>
        }`,
    })
  );
  scene.add(ground);

  /* the liquid, traced inside a proxy sphere */
  const liquidMat = new THREE.ShaderMaterial({
    uniforms: {
      uEnv: { value: hdr }, uEnvScale: { value: ENV_SCALE }, uBake: { value: bake }, uExtent: { value: 6 },
      uPaper: { value: PAPER.clone() }, uRi: { value: RI }, uH: { value: LEVEL }, uN: { value: new THREE.Vector3(0, 1, 0) },
      uSigma: { value: new THREE.Vector3(...LIQUID.sigma) }, uMen: { value: 0.012 }, uMenW: { value: 0.03 },
      uRip: { value: new THREE.Vector4(0, 0, 0, 0) }, uRipT: { value: 0 }, uZero: { value: ZERO }, uLineW: { value: 0.003 },
      uC: { value: new THREE.Vector3() }, uS: { value: 1 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LIQUID_FRAG,
  });
  const liquid = new THREE.Mesh(new THREE.SphereGeometry(RI, 160, 120), liquidMat);
  scene.add(liquid);

  /* the glass: physically based transmission, with a dispersion patch (one refraction per channel) */
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.09, ior: 1.5,
    envMap: envRT.texture, envMapIntensity: ENV_SCALE, specularIntensity: 1, side: params.has("front") ? THREE.FrontSide : THREE.DoubleSide,
    attenuationColor: new THREE.Color("#F2F6F1"), attenuationDistance: 1.4,
  });
  glassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uDisp = { value: 0.028 };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <transmission_pars_fragment>", "uniform float uDisp;\n" + THREE.ShaderChunk.transmission_pars_fragment.replace(
        /vec3 transmissionRay = getVolumeTransmissionRay\( n, v, thickness, ior, modelMatrix \);[\s\S]*?vec4 transmittedLight = getTransmissionSample\( refractionCoords, roughness, ior \);/,
        `vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
        vec4 transmittedLight = vec4( 0.0 );
        for ( int c = 0; c < 3; c ++ ) {
          float iorC = ior * ( 1.0 + uDisp * ( float( c ) - 1.0 ) );
          vec3 ray = getVolumeTransmissionRay( n, v, thickness, iorC, modelMatrix );
          vec4 ndc = projMatrix * viewMatrix * vec4( position + ray, 1.0 );
          vec2 uvc = ( ndc.xy / ndc.w + 1.0 ) / 2.0;
          vec4 s = getTransmissionSample( uvc, roughness, iorC );
          if ( c == 0 ) transmittedLight.r = s.r; else if ( c == 1 ) { transmittedLight.g = s.g; transmittedLight.a = s.a; } else transmittedLight.b = s.b;
        }`
      ));
  };
  const glass = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 144), glassMat);
  scene.add(glass);

  /* the engraved line: a frosted cut just proud of the outer surface */
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.sqrt(R * R - ZERO * ZERO) + 0.0006, 0.0017, 6, 480).rotateX(Math.PI / 2).translate(0, ZERO, 0),
    new THREE.MeshStandardMaterial({ color: 0xe9ecec, roughness: 0.62, metalness: 0, envMap: envRT.texture, envMapIntensity: 0.95 })
  );
  scene.add(ring);

  /* ---------- the cohort: creators your size, behind the hero and out of focus ----------
     Rendered once per size into a plate (paper, their glass and liquid, their baked shadows),
     blurred like a long lens at a wide aperture, and laid on the paper the hero stands on. */
  const plateScene = new THREE.Scene();
  const fwd = new THREE.Vector3(Math.cos(AZIM), 0, Math.sin(AZIM));
  const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
  const COHORT = params.has("solo") ? [] : COHORT_LAYOUT.map(([x, z, sc, p]) => ({
    c: new THREE.Vector3().addScaledVector(side, x).addScaledVector(fwd, z).setY(sc - R), s: sc, p,
  }));
  const plateGround = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2).translate(0, -R, 0),
    new THREE.ShaderMaterial({
      uniforms: { uBake: { value: bake }, uExtent: { value: 6 }, uPaper: { value: PAPER.clone() },
        uOrbs: { value: COHORT.map((o) => new THREE.Vector4(o.c.x, o.c.z, o.s, 0)).concat(Array(8).fill(new THREE.Vector4(0, 0, 1, 1))).slice(0, 8) } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform sampler2D uBake; uniform float uExtent; uniform vec3 uPaper; uniform vec4 uOrbs[8]; varying vec3 vW;
        vec3 castTint(vec3 r){ float l = dot(r, vec3(0.2126, 0.7152, 0.0722)); r = mix(vec3(l), r, 0.7); return vec3(r.r, mix(r.g, r.b, 0.4), r.b); }
        void main(){
          vec3 rho = vec3(1.0);
          for (int i = 0; i < 8; i++) {
            if (uOrbs[i].w > 0.5) continue;
            vec2 q = (vW.xz - uOrbs[i].xy) / uOrbs[i].z;
            vec2 uv = q / (2.0 * uExtent) + 0.5;
            vec3 r = castTint(texture2D(uBake, vec2(uv.x, 1.0 - uv.y)).rgb);
            rho *= mix(r, vec3(1.0), smoothstep(0.62, 0.97, length(q) / uExtent));
          }
          gl_FragColor = vec4(uPaper * rho, 1.0);
        }`,
    })
  );
  plateScene.add(plateGround);
  const sphereRI = new THREE.SphereGeometry(RI, 96, 72), sphereR = new THREE.SphereGeometry(R, 96, 72);
  for (const o of COHORT) {
    const m = liquidMat.clone();
    m.uniforms.uC.value = o.c.clone(); m.uniforms.uS.value = o.s; m.uniforms.uH.value = levelFor(o.p / 100);
    m.uniforms.uN.value = new THREE.Vector3(0, 1, 0);
    const lq = new THREE.Mesh(sphereRI, m); lq.position.copy(o.c); lq.scale.setScalar(o.s);
    const gl = new THREE.Mesh(sphereR, glassMat); gl.position.copy(o.c); gl.scale.setScalar(o.s);
    plateScene.add(lq, gl);
  }
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const fsScene = new THREE.Scene(); fsScene.add(fsQuad);
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec3 c = vec3(0.0); float w = 0.0;
        for (int i = -12; i <= 12; i++) { float x = float(i); float k = exp(-x * x / 50.0); c += texture2D(uTex, vUv + uDir * x).rgb * k; w += k; }
        gl_FragColor = vec4(c / w, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  fsQuad.material = blurMat;
  const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
  const plateRT = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, samples: 4 });
  const blurA = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false });
  const blurB = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false });
  function renderPlate() {
    if (!COHORT.length) { ground.material.uniforms.uHasPlate.value = 0; return; }
    const db = renderer.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(2, Math.round(db.x / 2)), h = Math.max(2, Math.round(db.y / 2));
    plateRT.setSize(w, h); blurA.setSize(w, h); blurB.setSize(w, h);
    const tm = renderer.toneMapping;
    renderer.setRenderTarget(plateRT); renderer.clear(); renderer.render(plateScene, camera);
    /* blur radius follows the orb's size on screen, so the depth of field reads the same at any width */
    const px = (L.rp / 260) * 1.25 * (db.x / L.W) / 2;
    for (let pass = 0; pass < 2; pass++) {
      blurMat.uniforms.uTex.value = pass ? blurB.texture : plateRT.texture; blurMat.uniforms.uDir.value.set(px / w, 0);
      renderer.setRenderTarget(blurA); renderer.render(fsScene, fsCam);
      blurMat.uniforms.uTex.value = blurA.texture; blurMat.uniforms.uDir.value.set(0, px / h);
      renderer.setRenderTarget(blurB); renderer.render(fsScene, fsCam);
    }
    renderer.setRenderTarget(null); renderer.toneMapping = tm;
    const gu = ground.material.uniforms;
    gu.uPlate.value = blurB.texture; gu.uRes.value.copy(db); gu.uHasPlate.value = 1;
  }

  /* ---------- size, DPR, frame ---------- */
  let L = layout();
  let dprCap = Math.min(window.devicePixelRatio || 1, 2);
  if (params.has("dpr")) dprCap = +params.get("dpr");
  function resize() {
    L = layout();
    const px = L.W * L.H;
    const dpr = Math.min(dprCap, Math.sqrt(4.2e6 / Math.max(px, 1)));
    renderer.setPixelRatio(Math.max(1, dpr));
    renderer.setSize(L.W, L.H, false);
    frame(L);
    renderPlate();
    wake();
  }
  addEventListener("resize", resize);
  new ResizeObserver(resize).observe(hero);

  /* ---------- motion: a damped tilt of the surface plus ripples ---------- */
  const S = {
    level: params.has("capture") || params.has("nofill") ? LEVEL : ZERO, fillT: 0,
    tilt: new THREE.Vector2(), vel: new THREE.Vector2(), target: new THREE.Vector2(),
    grav: new THREE.Vector2(), rip: [], t: 0, last: 0, running: false,
  };
  const OMEGA = 2 * Math.PI * 1.55, ZETA = 0.42; /* settles (2%) in about 0.95 s */
  const camRight = () => new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
  const camFwd = () => new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).multiplyScalar(-1).setY(0).normalize();

  let pointer = null;
  addEventListener("pointermove", (e) => {
    const h = hero.getBoundingClientRect();
    const x = e.clientX - h.left, y = e.clientY - h.top;
    if (pointer) {
      const dx = (x - pointer.x) / L.rp, dy = (y - pointer.y) / L.rp;
      /* a flick of the pointer nudges the liquid the way it moved */
      S.vel.x += THREE.MathUtils.clamp(dx, -0.6, 0.6) * 1.5;
      S.vel.y += THREE.MathUtils.clamp(dy, -0.6, 0.6) * 0.9;
      const over = Math.hypot(x - L.cx, y - L.cy) < L.rp * 0.98;
      if (over && Math.hypot(dx, dy) > 0.02) ripple(x, y);
    }
    pointer = { x, y };
    /* and the pointer's place tilts the gravity a touch, as if the hand held the orb */
    S.target.set(THREE.MathUtils.clamp((x - L.cx) / (L.W * 0.5), -1, 1) * 0.1, THREE.MathUtils.clamp((y - L.cy) / (L.H * 0.5), -1, 1) * 0.06);
    wake();
  }, { passive: true });
  addEventListener("pointerleave", () => { pointer = null; S.target.set(0, 0); wake(); });

  /* device tilt: the liquid stays level with the world while the phone turns */
  let base = null, askedTilt = false;
  function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    const g = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(e.gamma - base.g, -20, 20));
    const b = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(e.beta - base.b, -14, 14));
    S.grav.set(-Math.sin(g) * 0.9, Math.sin(b) * 0.5);
    wake();
  }
  addEventListener("deviceorientation", onTilt);
  hero.addEventListener("pointerdown", () => {
    if (askedTilt) return; askedTilt = true;
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") D.requestPermission().catch(() => {});
  });

  const ray = new THREE.Raycaster();
  function ripple(x, y) {
    ray.setFromCamera(new THREE.Vector2((x / L.W) * 2 - 1, -(y / L.H) * 2 + 1), camera);
    const n = liquidMat.uniforms.uN.value;
    const plane = new THREE.Plane(n.clone(), -S.level);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, p)) return;
    if (p.length() > RI) return;
    const now = S.t;
    const last = S.rip[0];
    if (last && now - last.t0 < 0.12) return;
    S.rip.unshift({ p: p.clone(), t0: now, a: 0.011 });
    S.rip.length = Math.min(S.rip.length, 1);
  }

  function step(dt) {
    S.t += dt;
    /* fill from the line to the score, once */
    if (S.level < LEVEL - 1e-4) {
      S.fillT = Math.min(1, S.fillT + dt / 1.6);
      const e = 1 - Math.pow(1 - S.fillT, 3);
      const prev = S.level;
      S.level = ZERO + (LEVEL - ZERO) * e;
      S.vel.y -= (S.level - prev) * 0.6;
    }
    const tgt = S.target.clone().add(S.grav);
    const ax = -OMEGA * OMEGA * (S.tilt.x - tgt.x) - 2 * ZETA * OMEGA * S.vel.x;
    const ay = -OMEGA * OMEGA * (S.tilt.y - tgt.y) - 2 * ZETA * OMEGA * S.vel.y;
    S.vel.x += ax * dt; S.vel.y += ay * dt;
    S.tilt.x += S.vel.x * dt; S.tilt.y += S.vel.y * dt;
    S.tilt.clampLength(0, 0.32);
  }
  function apply() {
    const r = camRight(), f = camFwd();
    const n = new THREE.Vector3(0, 1, 0).addScaledVector(r, S.tilt.x).addScaledVector(f, -S.tilt.y).normalize();
    const u = liquidMat.uniforms;
    u.uN.value.copy(n);
    u.uH.value = S.level;
    const rp = S.rip[0];
    if (rp) {
      const age = S.t - rp.t0;
      const amp = rp.a * Math.exp(-age / 0.28);
      u.uRip.value.set(rp.p.x, rp.p.y, rp.p.z, amp);
      u.uRipT.value = age;
      if (amp < 1e-4) S.rip.length = 0;
    } else u.uRip.value.w = 0;
    place(L, S.level);
  }
  const energy = () => S.vel.lengthSq() + S.tilt.clone().sub(S.target.clone().add(S.grav)).lengthSq() * OMEGA * OMEGA + (S.rip.length ? 1 : 0) + (S.level < LEVEL - 1e-4 ? 1 : 0);

  /* stepped clock for captures: ?capture&t=1.2 renders the state at that time, then stops */
  function render() { apply(); renderer.render(scene, camera); }
  let adapt = { n: 0, sum: 0 };
  function loop(now) {
    if (!S.running) return;
    const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 1 / 60);
    if (S.last) { adapt.n++; adapt.sum += now - S.last; }
    S.last = now;
    /* keep 60 fps: if frames run long, render fewer pixels */
    if (adapt.n === 40) {
      const avg = adapt.sum / adapt.n;
      if (avg > 21 && renderer.getPixelRatio() > 1) { dprCap = Math.max(1, renderer.getPixelRatio() * 0.8); resize(); }
      adapt = { n: 0, sum: 0 };
    }
    for (let i = 0, k = Math.ceil(dt / (1 / 120)); i < k; i++) step(dt / k);
    render();
    if (energy() < 2e-6) { S.running = false; S.last = 0; render(); return; }
    requestAnimationFrame(loop);
  }
  function wake() {
    if (params.has("capture")) { render(); return; }
    if (S.running) return;
    S.running = true; S.last = 0;
    requestAnimationFrame(loop);
  }

  resize();
  if (params.has("capture")) {
    /* advance the simulation on a fixed clock, then render one frame */
    const t = +(params.get("t") ?? 0);
    for (let i = 0; i < Math.round(t * 120); i++) step(1 / 120);
    render();
    window.__orb = {
      step: (sec, input) => { if (input) Object.assign(S, input(S, THREE)); for (let i = 0; i < Math.round(sec * 120); i++) step(1 / 120); render(); return true; },
      ripple: (x, y) => { ripple(x, y); render(); },
      state: () => ({ tilt: S.tilt.toArray(), vel: S.vel.toArray(), level: S.level }),
      render,
    };
  } else wake();
  root.classList.add("ready", "live");
  window.__orbReady = true;
}

/* ---------- the liquid shader ---------- */
const LIQUID_FRAG = /* glsl */ `
uniform sampler2D uEnv; uniform float uEnvScale; uniform sampler2D uBake; uniform float uExtent; uniform vec3 uPaper;
uniform float uRi; uniform float uH; uniform vec3 uN; uniform vec3 uSigma; uniform float uMen; uniform float uMenW;
uniform vec4 uRip; uniform float uRipT; uniform float uZero; uniform float uLineW; uniform vec3 uC; uniform float uS;
varying vec3 vW;
#include <common>

vec3 envL( vec3 d ) {
  vec2 uv = vec2( atan( d.z, d.x ) * RECIPROCAL_PI2 + 0.5, asin( clamp( d.y, -1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5 );
  return texture2D( uEnv, uv ).rgb * uEnvScale;
}
vec3 castTint( vec3 r ) { float l = dot( r, vec3( 0.2126, 0.7152, 0.0722 ) ); r = mix( vec3( l ), r, 0.7 ); return vec3( r.r, mix( r.g, r.b, 0.4 ), r.b ); }
vec3 groundL( vec3 p, vec3 d ) {
  float t = ( -1.0 - p.y ) / d.y;
  vec3 q = p + d * t;
  vec2 uv = q.xz / ( 2.0 * uExtent ) + 0.5;
  vec3 rho = mix( castTint( texture2D( uBake, vec2( uv.x, 1.0 - uv.y ) ).rgb ), vec3( 1.0 ), smoothstep( 0.62, 0.97, length( q.xz ) / uExtent ) );
  return uPaper * rho;
}
/* what a ray leaving the orb sees: the paper, or the studio */
vec3 world( vec3 pl, vec3 d ) {
  vec3 p = uC + pl * uS; /* the trace runs in the orb's own units; the paper is in the world's */
  vec3 g = d.y < -0.002 ? groundL( p, d ) : envL( d );
  return d.y < 0.03 && d.y > -0.03 ? mix( envL( d ), groundL( p, vec3( d.x, min( d.y, -0.002 ), d.z ) ), smoothstep( 0.03, -0.03, d.y ) ) : g;
}
float fres( float cosi, float eta ) {
  float s2 = eta * eta * ( 1.0 - cosi * cosi );
  if ( s2 >= 1.0 ) return 1.0;
  float ct = sqrt( 1.0 - s2 );
  float rs = ( eta * cosi - ct ) / ( eta * cosi + ct );
  float rp = ( cosi - eta * ct ) / ( cosi + eta * ct );
  return 0.5 * ( rs * rs + rp * rp );
}
vec2 sph( vec3 o, vec3 d, float r ) {
  float b = dot( o, d ); float c = dot( o, o ) - r * r; float h = b * b - c;
  if ( h < 0.0 ) return vec2( -1.0 );
  h = sqrt( h ); return vec2( -b - h, -b + h );
}
/* the surface: a plane at uH along uN, lifted by the meniscus at the glass and by a ripple */
float eta_( vec3 p ) {
  vec3 c = uN * uH;
  vec3 q = p - c; q -= uN * dot( q, uN );
  float rr = length( q );
  float rmax = sqrt( max( uRi * uRi - uH * uH, 1e-4 ) );
  float m = uMen * exp( -max( rmax - rr, 0.0 ) / uMenW );
  float rip = 0.0;
  if ( uRip.w > 0.0 ) {
    vec3 a = p - uRip.xyz; a -= uN * dot( a, uN );
    float dd = length( a );
    float front = uRipT * 0.9;
    rip = uRip.w * sin( 34.0 * dd - 26.0 * uRipT ) * exp( -abs( dd - front ) * 7.0 ) / ( 1.0 + 6.0 * dd );
  }
  return m + rip;
}
/* the surface is met as a plane; the meniscus and ripples bend its normal, not its place
   (they are a few pixels tall at most), which keeps the waterline exact and free of artefacts */
float surfHit( vec3 o, vec3 d, float tmax ) {
  float dn = dot( d, uN );
  if ( abs( dn ) < 1e-5 ) return -1.0;
  float t = ( uH - dot( o, uN ) ) / dn;
  if ( t < 1e-4 || t > tmax ) return -1.0;
  if ( length( o + d * t ) > uRi ) return -1.0;
  return t;
}
vec3 surfNormal( vec3 p ) {
  vec3 t1 = normalize( cross( uN, abs( uN.x ) < 0.9 ? vec3( 1, 0, 0 ) : vec3( 0, 0, 1 ) ) );
  vec3 t2 = cross( uN, t1 );
  float e = 0.0025;
  float h0 = eta_( p );
  float gx = ( eta_( p + t1 * e ) - h0 ) / e;
  float gy = ( eta_( p + t2 * e ) - h0 ) / e;
  return normalize( uN - t1 * gx - t2 * gy );
}
bool below( vec3 p ) { return dot( p, uN ) - uH < 0.0; }

/* trace one wavelength. returns radiance, and covered = whether the ray met any liquid */
vec3 trace( vec3 ro, vec3 rd, float nL, out float covered ) {
  covered = 0.0;
  vec2 ts = sph( ro, rd, uRi );
  if ( ts.y < 0.0 ) return vec3( 0.0 );
  vec3 p = ro + rd * max( ts.x, 0.0 );
  vec3 col = vec3( 0.0 );
  vec3 w = vec3( 1.0 );
  vec3 n = p / uRi;
  if ( below( p ) ) {
    float ci = clamp( -dot( rd, n ), 0.0, 1.0 );
    float F = fres( ci, 1.0 / nL );
    w *= 1.0 - F;
    rd = normalize( refract( rd, n, 1.0 / nL ) );
  } else {
    float ts2 = surfHit( p, rd, ts.y - max( ts.x, 0.0 ) );
    if ( ts2 < 0.0 ) return vec3( 0.0 );
    p += rd * ts2;
    vec3 ns = surfNormal( p );
    if ( dot( rd, ns ) > 0.0 ) return vec3( 0.0 );
    float ci = clamp( -dot( rd, ns ), 0.0, 1.0 );
    float F = fres( ci, 1.0 / nL );
    vec3 rr = reflect( rd, ns );
    col += w * F * world( p, rr );
    w *= 1.0 - F;
    rd = normalize( refract( rd, ns, 1.0 / nL ) );
  }
  covered = 1.0;
  for ( int i = 0; i < 5; i ++ ) {
    vec2 tw = sph( p + rd * 1e-4, rd, uRi );
    float twall = tw.y + 1e-4;
    float tsurf = dot( rd, uN ) > 0.0 ? surfHit( p + rd * 1e-4, rd, twall ) : -1.0;
    if ( tsurf > 0.0 ) {
      tsurf += 1e-4;
      w *= exp( -uSigma * tsurf );
      p += rd * tsurf;
      vec3 ns = surfNormal( p );
      float ci = clamp( dot( rd, ns ), 0.0, 1.0 );
      float F = fres( ci, nL );
      vec3 tdir = refract( rd, -ns, nL );
      if ( F < 1.0 ) col += w * ( 1.0 - F ) * world( p, normalize( tdir ) );
      w *= F;
      rd = reflect( rd, -ns );
    } else {
      w *= exp( -uSigma * twall );
      p += rd * twall;
      n = normalize( p );
      float ci = clamp( dot( rd, n ), 0.0, 1.0 );
      float F = fres( ci, nL );
      F = F + 0.04 * ( 1.0 - F );
      vec3 tdir = refract( rd, -n, nL );
      vec3 seen = F < 1.0 ? world( p, normalize( tdir ) ) : vec3( 0.0 );
      /* the engraved ring, seen from inside on the far wall: a frosted line that scatters the room */
      float line = 1.0 - smoothstep( uLineW * 0.5, uLineW * 1.6, abs( p.y - uZero ) );
      seen = mix( seen, vec3( 0.8 ) * uPaper, line * 0.25 );
      col += w * ( 1.0 - F ) * seen;
      w *= F;
      rd = reflect( rd, -n );
    }
    if ( max( w.r, max( w.g, w.b ) ) < 0.004 ) break;
  }
  return col;
}

void main() {
  #ifdef TONE_MAPPING
    /* the final pass: the glass in front shows this liquid through its transmission, so skip it here */
    gl_FragColor = vec4( 0.0 );
    if ( gl_FragCoord.x > -1.0 ) discard;
  #endif
  /* three rays per pixel, one per colour channel, each at its own index and its own place inside
     the pixel: a slight dispersion and a three sample antialias of the waterline in one go */
  vec3 pl = ( vW - uC ) / uS, ro = ( cameraPosition - uC ) / uS;
  vec3 dx = dFdx( pl ), dy = dFdy( pl );
  float c0, c1, c2;
  vec3 s0 = trace( ro, normalize( pl + dx * -0.30 + dy * 0.26 - ro ), 1.3290, c0 );
  vec3 s1 = trace( ro, normalize( pl + dx * 0.32 + dy * 0.10 - ro ), 1.3330, c1 );
  vec3 s2 = trace( ro, normalize( pl + dx * -0.04 + dy * -0.34 - ro ), 1.3395, c2 );
  if ( c0 + c1 + c2 < 0.5 ) discard;
  vec3 col = mix( ( s0 + s1 + s2 ) / 3.0, vec3( s0.r, s1.g, s2.b ), 0.45 );
  float r = col.r, g = col.g, b = col.b;
  gl_FragColor = vec4( r, g, b, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
