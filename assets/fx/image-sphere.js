/*
  image-sphere: a cloud of creator work orbiting on an invisible sphere. Each tile is a
  textured plane at a point on the sphere, all inside one group that slowly turns by
  itself and spins when dragged (with flick inertia). Every plane is billboarded (its
  quaternion is the inverse of the group's) so it always faces the camera; planes nearer
  the camera scale up, the hovered one scales up further, all eased. Hover by raycast.
  A tap brings one tile to the front and dims the rest; tap again or Escape to let go.
  Plain three.js meshes, no shaders.

  mount(el, opts) -> { destroy }
    opts.images  [{ url }] or [url]   default: procedural creator tiles (no photos)
    opts.count   tile count when generating   (default 30)
*/

import * as THREE from "../vendor/three-0.160.0.module.min.js";
import { creatorTiles } from "./creator-tiles.js";

const RADIUS = 180;
const PLANE_SIZE = 50;
const AUTO_ROT_Y = 0.0011;
const AUTO_ROT_X = 0.0003;
const DRAG_EASE = 0.2;
const HOVER_SCALE = 1.2;
const SCALE_EASE = 0.1;
const OPACITY_EASE = 0.08;
const INERTIA_DECAY = 0.94;
const FLICK_SCALE = 0.9;
const CLICK_SLOP = 6;
const FOCUS_EASE = 0.14;
const FOCUS_DISTANCE = 300;
const FOCUS_FILL = 0.62;
const BACKDROP_DIM = 0.16;
// Camera distance that frames the whole cloud with a little air around it.
const FIT = (RADIUS + 40) / (Math.tan((25 * Math.PI) / 360) * 0.94);
const FOV = 25;

export function mount(el, opts = {}) {
  const host = el;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  host.style.touchAction = "pan-y";

  let w = host.clientWidth || 1;
  let h = host.clientHeight || 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) {
    return { destroy() {} };
  }
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(w, h, false);
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block", cursor: "grab" });
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 2000);
  const group = new THREE.Group();
  scene.add(group);
  const planes = [];

  // Keep the whole sphere in frame on a tall phone card as well as a wide one.
  const fitCamera = () => {
    const aspect = w / h;
    camera.aspect = aspect;
    camera.position.z = aspect < 1 ? FIT / Math.max(0.5, aspect) : FIT;
    camera.updateProjectionMatrix();
  };
  fitCamera();

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-2, -2);
  let hovered = null;
  let focused = null;
  let rotationX = 0, rotationY = 0, currentRotationX = 0, currentRotationY = 0;
  let baseRotationX = 0.3, baseRotationY = 0;
  let dragging = false, startX = 0, startY = 0, velX = 0, velY = 0, lastDX = 0, lastDY = 0;
  const invQuat = new THREE.Quaternion();
  const worldPos = new THREE.Vector3();
  const centerPos = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  let raf = 0, running = false, disposed = false;

  // Tiles: a seeded, even-ish spread over the sphere so no two clump.
  const addPlanes = (list) => {
    const loader = new THREE.TextureLoader();
    const n = list.length;
    list.forEach((item, i) => {
      const url = typeof item === "string" ? item : item.url;
      loader.load(url, (tex) => {
        if (disposed) return;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        const aspect = (tex.image.width || 1) / (tex.image.height || 1);
        const pw = aspect >= 1 ? PLANE_SIZE * aspect * 0.82 : PLANE_SIZE * aspect;
        const ph = aspect >= 1 ? PLANE_SIZE * 0.82 : PLANE_SIZE;
        const geo = new THREE.PlaneGeometry(pw, ph);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
        mat.opacity = reduced ? 1 : 0;
        const plane = new THREE.Mesh(geo, mat);
        // golden spiral points, jittered, with a little radial depth
        const y = 1 - ((i + 0.5) / n) * 2;
        const rr = Math.sqrt(1 - y * y);
        const t = i * 2.39996 + (Math.random() - 0.5) * 0.5;
        const r = RADIUS + (Math.random() - 0.5) * 70;
        plane.position.set(Math.cos(t) * rr * r, y * r, Math.sin(t) * rr * r);
        plane.userData = { isHovered: false, opacity: mat.opacity, focus: 0, home: plane.position.clone() };
        group.add(plane);
        planes.push(plane);
        if (!running) renderStill();
      });
    });
  };

  if (opts.images && opts.images.length) addPlanes(opts.images);
  else creatorTiles({ count: opts.count || 30, seed: 7, size: 256 }).then((t) => { if (!disposed) addPlanes(t); });

  const localMouse = (cx, cy) => {
    const rect = host.getBoundingClientRect();
    mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((cy - rect.top) / rect.height) * 2 - 1);
  };
  const pick = () => {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(planes, false);
    return hits.length ? hits[0].object : null;
  };

  let downX = 0, downY = 0, downId = null;
  const onDown = (e) => {
    dragging = true;
    downId = e.pointerId;
    startX = downX = e.clientX;
    startY = downY = e.clientY;
    velX = velY = lastDX = lastDY = 0;
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e) => {
    localMouse(e.clientX, e.clientY);
    if (dragging && e.pointerId === downId) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      rotationY += dx;
      rotationX -= dy;
      lastDX = dx; lastDY = dy;
      startX = e.clientX; startY = e.clientY;
      if (reduced) renderStill();
    }
  };
  const release = () => {
    if (!dragging) return;
    dragging = false;
    velY = lastDX * FLICK_SCALE;
    velX = -lastDY * FLICK_SCALE;
    canvas.style.cursor = "grab";
  };
  const onUp = (e) => {
    if (!dragging || e.pointerId !== downId) return;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    release();
    if (moved <= CLICK_SLOP && running) {
      velX = velY = 0;
      localMouse(e.clientX, e.clientY);
      const hit = pick();
      focused = focused ? (hit === focused ? null : hit) : hit;
    }
  };
  const onLeave = (e) => {
    if (e.pointerType === "mouse") { release(); mouse.set(-2, -2); }
  };
  const onCancel = () => { dragging = false; canvas.style.cursor = "grab"; };
  const onKey = (e) => { if (e.key === "Escape" && focused) focused = null; };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  host.addEventListener("pointerleave", onLeave);
  window.addEventListener("keydown", onKey);

  const hoverDetection = () => {
    const next = pick();
    if (next !== hovered) {
      if (hovered) hovered.userData.isHovered = false;
      hovered = next;
      if (hovered) hovered.userData.isHovered = true;
    }
    canvas.style.cursor = dragging ? "grabbing" : hovered ? "pointer" : "grab";
  };

  const applyRotation = () => {
    currentRotationX += (rotationX - currentRotationX) * DRAG_EASE;
    currentRotationY += (rotationY - currentRotationY) * DRAG_EASE;
    group.rotation.x = baseRotationX + currentRotationX * 0.002;
    group.rotation.y = baseRotationY + currentRotationY * 0.002;
  };

  const loop = () => {
    if (!running) return;
    if (!dragging && (velX !== 0 || velY !== 0)) {
      rotationY += velY;
      rotationX -= velX;
      velX *= INERTIA_DECAY;
      velY *= INERTIA_DECAY;
      if (Math.abs(velX) < 0.01) velX = 0;
      if (Math.abs(velY) < 0.01) velY = 0;
    }
    if (!focused) {
      baseRotationY += AUTO_ROT_Y;
      baseRotationX += AUTO_ROT_X;
    }
    applyRotation();

    if (!dragging && !focused) hoverDetection();
    else if (focused && hovered) { hovered.userData.isHovered = false; hovered = null; }
    const anyFocused = focused !== null;

    centerPos.set(0, 0, camera.position.z - FOCUS_DISTANCE);
    const viewH = 2 * FOCUS_DISTANCE * Math.tan((camera.fov * Math.PI) / 360);
    const fill = camera.aspect < 1 ? FOCUS_FILL * camera.aspect * 0.9 : FOCUS_FILL;
    const focusScale = (viewH * fill) / PLANE_SIZE;

    invQuat.copy(group.quaternion).invert();
    for (const plane of planes) {
      plane.quaternion.copy(invQuat);
      const u = plane.userData;
      const f = u.focus + ((plane === focused ? 1 : 0) - u.focus) * FOCUS_EASE;
      u.focus = f;
      if (f > 0.0005) {
        tmpPos.copy(centerPos);
        group.worldToLocal(tmpPos);
        plane.position.copy(u.home).lerp(tmpPos, f);
      } else if (!plane.position.equals(u.home)) {
        plane.position.copy(u.home);
      }
      plane.getWorldPosition(worldPos);
      const zScale = 0.8 + worldPos.z / 2000;
      let target = u.isHovered ? zScale * HOVER_SCALE : zScale;
      target += (focusScale - target) * f;
      const s = plane.scale.x + (target - plane.scale.x) * SCALE_EASE;
      plane.scale.set(s, s, s);
      const want = anyFocused ? BACKDROP_DIM + (1 - BACKDROP_DIM) * f : 1;
      u.opacity += (want - u.opacity) * OPACITY_EASE;
      plane.material.opacity = u.opacity;
      plane.renderOrder = f > 0.5 ? 1 : 0;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };

  function renderStill() {
    applyRotation();
    invQuat.copy(group.quaternion).invert();
    for (const plane of planes) {
      plane.quaternion.copy(invQuat);
      plane.getWorldPosition(worldPos);
      const z = 0.8 + worldPos.z / 2000;
      plane.scale.set(z, z, z);
      plane.userData.opacity = 1;
      plane.material.opacity = 1;
    }
    renderer.render(scene, camera);
  }

  const start = () => {
    if (running || disposed) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  let onScreen = false;
  let hidden = document.hidden;
  const sync = () => {
    if (reduced) return;
    if (onScreen && !hidden) start(); else stop();
  };
  const io = new IntersectionObserver((es) => { onScreen = es[0] ? es[0].isIntersecting : false; sync(); }, { threshold: 0.05 });
  io.observe(host);
  const onVis = () => { hidden = document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVis);

  const ro = new ResizeObserver(() => {
    if (disposed) return;
    const nw = host.clientWidth, nh = host.clientHeight;
    if (!nw || !nh) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    fitCamera();
    if (!running) renderStill();
  });
  ro.observe(host);

  return {
    destroy() {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      for (const plane of planes) {
        plane.geometry.dispose();
        if (plane.material.map) plane.material.map.dispose();
        plane.material.dispose();
      }
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}
