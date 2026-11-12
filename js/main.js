import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as S from './surface.js';
import { PRESETS, CATEGORIES, ART_FONTS, buildPreset, buildThumb, drawLayer } from './gallery.js';
import { Effects, FX_TYPES } from './fx.js';
import { packCard, unpackCard, imageToDataURL, loadImage } from './share.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = S.clamp;

const PAPERS = [
  ['#f7f5f0', 'White'], ['#efe6d2', 'Cream'], ['#f1d3d0', 'Blush'], ['#cfdac4', 'Sage'], ['#cfdcea', 'Sky'], ['#1f2a44', 'Navy'],
];
const BGS = [['#ffffff', 'White'], ['#f3efe8', 'Linen'], ['#e7ecef', 'Mist'], ['#e6dccf', 'Oak'], ['#1d1d21', 'Night']];

const DEFAULTS = {
  shape: 'asis', fit: 'fill', mode: 'designed', amount: 0.5, pickColor: '#c9a24a', border: false, borderWidth: 0.35,
  foil: 'gold', foilCustom: '#d4af37', finish: 'mirror', emboss: 0.6, picEmboss: 0.1,
  paper: '#f7f5f0', paperTex: 'cotton', insideCover: 'plain',
  coverText: '', coverFont: 'Great Vibes', coverInk: 'foil', coverInkColor: '#2b2b2b', coverSize: 0.5, coverY: 0.2,
  letter: '', letterFont: 'Caveat', letterAlign: 'center', letterInk: '#2a2a2a', letterStyle: 'ink', letterSize: 0.5, motif: 'star', insert: true, name: '',
  bg: '#ffffff', light: 1, shimmer: true,
  fx: 'none', fxMode: 'always', fxAmount: 0.5,
  brushMode: 'add', brushSize: 0.035,
};
const LOCAL_KEYS = ['brushMode', 'brushSize'];
const SHARE_KEYS = Object.keys(DEFAULTS).filter((k) => !LOCAL_KEYS.includes(k));
const SCENE_KEYS = ['bg', 'light', 'shimmer', 'name', 'brushSize', 'fx', 'fxMode', 'fxAmount'];
// editing these is about the front of the card, these about the inside: the card turns to show them
const FRONT_KEYS = ['shape', 'fit', 'mode', 'amount', 'pickColor', 'border', 'borderWidth', 'foil', 'foilCustom', 'finish', 'emboss', 'picEmboss', 'coverText', 'coverFont', 'coverInk', 'coverInkColor', 'coverSize', 'coverY'];
const INSIDE_KEYS = ['letter', 'letterFont', 'letterAlign', 'letterInk', 'letterStyle', 'letterSize', 'motif', 'insert', 'insideCover'];

// What each setting needs rebuilt: L=layout (everything), F=front+inside cover, I=letter page, B=back, E=edges, S=scene
const FLAGS = {
  shape: 'L', fit: 'L',
  mode: 'F', amount: 'F', pickColor: 'F', border: 'F', borderWidth: 'F', emboss: 'F', picEmboss: 'F', insideCover: 'F',
  coverText: 'F', coverFont: 'F', coverInk: 'F', coverInkColor: 'F', coverSize: 'F', coverY: 'F',
  foil: 'FI', foilCustom: 'FI', finish: 'FI',
  paper: 'FIBE', paperTex: 'FIB',
  letter: 'I', letterFont: 'I', letterAlign: 'I', letterInk: 'I', letterStyle: 'I', letterSize: 'I', motif: 'I', insert: 'I',
  bg: 'S', light: 'S', shimmer: 'S', name: '', brushMode: '', brushSize: '',
  fx: 'S', fxMode: 'S', fxAmount: 'S',
};

let state = { ...DEFAULTS };
let source = null; // { image, designed, cardRect, hasAlpha, presetId }
let current = { kind: 'preset', id: 'lovely' };
let custom = null; // { source, state, paint, url }
let L = null;
let maskRes = null;
let paint = null, paintW = 0, paintH = 0;
let pendingPaintImg = null;
let lastLinkSig = null;

// ------------------------------------------------------------------ three.js scene
const stage = $('#stage');
const gl = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);

// A photo-studio style environment: soft gradient dome + a few softboxes, so foil
// always has something bright to reflect and glints as the card turns.
function studioEnvironment() {
  const env = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(20, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP;
        void main(){
          float y = vP.y;
          vec3 top = vec3(1.0, 0.98, 0.95) * 1.15;
          vec3 mid = vec3(0.72, 0.70, 0.68);
          vec3 bot = vec3(0.30, 0.28, 0.27);
          vec3 c = y > 0.0 ? mix(mid, top, pow(y, 0.7)) : mix(mid, bot, pow(-y, 0.6));
          // warm/cool bands to give metals some life
          c *= 1.0 + 0.10 * sin(atan(vP.z, vP.x) * 3.0);
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  env.add(dome);
  const box = (w, h, x, y, z, k, tint = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(6, 4, -4, 5, 8, 5.5); // key softbox, front-left high
  box(3, 8, 7, 1, 5, 3.2, 0xfff1dc); // warm strip, right
  box(8, 2, 0, 9, -2, 2.6); // overhead
  box(2.5, 2.5, -8, -1, 2, 2.0, 0xdfe8ff); // cool kicker, left
  box(4, 1.2, 2, -5, 8, 1.6); // low bounce card
  const t = pmrem.fromScene(env, 0.02).texture;
  env.traverse((o) => {
    o.geometry && o.geometry.dispose();
    o.material && o.material.dispose();
  });
  return t;
}
scene.environment = studioEnvironment();
scene.environmentIntensity = 0.9;
void RoomEnvironment;

const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);
camera.position.set(0, 0, 6);

const hemi = new THREE.HemisphereLight(0xffffff, 0xe8e2da, 0.35);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.3);
key.position.set(-1.6, 2.4, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 1, far: 12 });
key.shadow.radius = 22;
key.shadow.blurSamples = 25;
key.shadow.bias = -0.0006;
scene.add(key, key.target);

const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16, depthWrite: false }));
wall.position.z = -0.14;
wall.receiveShadow = true;
wall.renderOrder = -1;
scene.add(wall);

const tiltGroup = new THREE.Group();
const spreadGroup = new THREE.Group();
const pageGroup = new THREE.Group();
const coverPivot = new THREE.Group();
scene.add(tiltGroup);
tiltGroup.add(spreadGroup);
spreadGroup.add(pageGroup, coverPivot);

const T = 0.007;
const foilUniforms = { foilBoost: { value: 0.55 } };
function mkMat() {
  const m = new THREE.MeshPhysicalMaterial({ roughness: 1, metalness: 1, color: 0xffffff });
  // Foil reads brighter than a plain PBR metal: lift the reflected light on metallic pixels only.
  m.onBeforeCompile = (shader) => {
    shader.uniforms.foilBoost = foilUniforms.foilBoost;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float foilBoost;\nvoid main() {')
      .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n\tradiance *= 1.0 + metalnessFactor * foilBoost;');
  };
  return m;
}
const mats = {
  front: mkMat(), inside: mkMat(), page: mkMat(), back: mkMat(),
  edge: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 }),
};
let geo = null;

function tex(c, srgb = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = maxAniso;
  t.needsUpdate = true;
  return t;
}

function applySurface(mat, s) {
  const old = [mat.map, mat.roughnessMap, mat.normalMap, mat.iridescenceMap, mat.alphaMap];
  mat.map = tex(s.color, true);
  const orm = tex(s.orm);
  mat.roughnessMap = orm;
  mat.metalnessMap = orm;
  mat.normalMap = tex(s.normal);
  mat.normalScale.set(1, 1);
  const holo = S.isHolo(state) && s.mask;
  mat.iridescence = holo ? 1 : 0;
  mat.iridescenceMap = holo ? tex(s.mask) : null;
  mat.iridescenceIOR = 1.8;
  mat.iridescenceThicknessRange = [160, 760];
  if (s.alpha) {
    mat.alphaMap = tex(s.alpha);
    mat.alphaTest = 0.5;
  } else {
    mat.alphaMap = null;
    mat.alphaTest = 0;
  }
  mat.needsUpdate = true;
  new Set(old).forEach((t) => t && t.dispose());
}

function clearGroup(g) {
  for (const c of [...g.children]) {
    g.remove(c);
    c.geometry && c.geometry.dispose();
  }
}

function buildGeometry() {
  clearGroup(pageGroup);
  clearGroup(coverPivot);
  const k = 1.5 / Math.max(L.rect.w, L.rect.h);
  const rw = L.rect.w * k, rh = L.rect.h * k;
  const e = mats.edge;
  if (L.pageCut) {
    const pf = new THREE.Mesh(new THREE.PlaneGeometry(rw, rh), mats.page);
    pf.position.z = T * 0.75;
    const pb = new THREE.Mesh(new THREE.PlaneGeometry(rw, rh), mats.back);
    pb.rotation.y = Math.PI;
    pb.position.z = T * 0.25;
    pf.castShadow = pb.castShadow = true;
    pf.receiveShadow = true;
    pageGroup.add(pf, pb);
  } else {
    const page = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, T), [e, e, e, e, mats.page, mats.back]);
    page.position.z = T / 2;
    page.castShadow = page.receiveShadow = true;
    pageGroup.add(page);
  }

  coverPivot.position.set(-rw / 2, 0, T + 0.0015);
  let cw = rw, ch = rh, dx = 0, dy = 0;
  if (!L.dieCut) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, T), [e, e, e, e, mats.front, mats.inside]);
    cover.position.set(rw / 2, 0, T / 2);
    cover.castShadow = true;
    coverPivot.add(cover);
  } else {
    cw = L.W * k;
    ch = L.H * k;
    dx = (L.W / 2 - (L.rect.x + L.rect.w / 2)) * k;
    dy = -(L.H / 2 - (L.rect.y + L.rect.h / 2)) * k;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), mats.front);
    f.position.set(rw / 2 + dx, dy, T * 0.75);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), mats.inside);
    b.rotation.y = Math.PI;
    b.position.set(rw / 2 + dx, dy, T * 0.25);
    f.castShadow = b.castShadow = true;
    coverPivot.add(f, b);
  }
  coverPivot.add(liveGroup);
  coverPivot.children.forEach((c) => c.isMesh && (c.receiveShadow = true));
  const a = rw / 2 + dx - cw / 2, b = rw / 2 + dx + cw / 2;
  geo = {
    rw, rh,
    // where the printed front sits inside the cover pivot (for placing living layers)
    face: { cx: rw / 2 + dx, cy: dy, w: cw, h: ch, z: L.dieCut ? T * 0.75 : T },
    closed: { x0: Math.min(0, a), x1: Math.max(rw, b) },
    open: { x0: Math.min(-b, 0), x1: Math.max(rw, -a) },
    y0: Math.min(-rh / 2, dy - ch / 2),
    y1: Math.max(rh / 2, dy + ch / 2),
  };
  buildLive();
}

// ------------------------------------------------------------------ living layers
// Some cards (the "Happiness" cat) carry painted layers that live on top of the card in 3D:
// they keep their foil, cast tiny shadows, and move — breathing, swaying, fluttering, floating.
const liveGroup = new THREE.Group();
let live = [];

function spriteSurface(ly) {
  const w = ly.canvas.width, h = ly.canvas.height;
  const c = S.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(ly.canvas, 0, 0);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const mc = S.makeCanvas(w, h);
  const mx = mc.getContext('2d', { willReadFrequently: true });
  mx.drawImage(ly.mask, 0, 0);
  const md = mx.getImageData(0, 0, w, h).data;
  const o = S.makeCanvas(w, h);
  const ox = o.getContext('2d');
  const oi = ox.createImageData(w, h), od = oi.data;
  const F = S.isHolo(state) ? [0.92, 0.9, 0.97] : S.foilRGB(state);
  const rough = (S.FINISH[state.finish] || S.FINISH.mirror).rough;
  // The card is lit at roughly 2x, which would clip the painting's soft whites (all the fur detail).
  // Pre-darken the painted (non-foil) pixels in linear light so they land back in range.
  const lut = new Uint8ClampedArray(256);
  const tone = ly.tone ?? 1; // painted near-white subjects (the cat's fur) ask for a lower tone
  for (let v = 0; v < 256; v++) lut[v] = Math.pow(Math.pow(v / 255, 2.2) * tone, 1 / 2.2) * 255;
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const mv = md[p + 3] / 255;
    d[p] = S.lerp(lut[d[p]], d[p], mv);
    d[p + 1] = S.lerp(lut[d[p + 1]], d[p + 1], mv);
    d[p + 2] = S.lerp(lut[d[p + 2]], d[p + 2], mv);
    if (mv > 0) {
      d[p] = S.lerp(d[p], F[0] * 255, mv);
      d[p + 1] = S.lerp(d[p + 1], F[1] * 255, mv);
      d[p + 2] = S.lerp(d[p + 2], F[2] * 255, mv);
    }
    od[p] = 255;
    od[p + 1] = S.lerp(0.8, rough, mv) * 255;
    od[p + 2] = mv * 255;
    od[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ox.putImageData(oi, 0, 0);
  return { color: c, orm: o };
}

function buildLive() {
  for (const it of live) it.dispose();
  live = [];
  liveGroup.clear();
  if (!source || !source.layers || !L || !geo) return;
  const F = geo.face;
  const k = F.w / L.W; // world units per texture pixel
  const sxp = L.draw.w / L.iw, syp = L.draw.h / L.ih;
  const ppx = k * sxp; // world units per artwork pixel
  liveGroup.position.set(F.cx - F.w / 2, F.cy + F.h / 2, F.z + 0.0004);
  for (const ly of source.layers) {
    const tx = L.draw.x + ly.x * sxp, ty = L.draw.y + ly.y * syp;
    const root = new THREE.Group();
    root.position.set(tx * k, -ty * k, ly.z);
    root.rotation.z = -(ly.rot || 0);
    const sc = (ly.scale || 1) * ppx;
    const cw = ly.canvas.width * sc, ch = ly.canvas.height * sc;
    const surf = spriteSurface(ly);
    const mat = mkMat();
    mat.map = tex(surf.color, true);
    const orm = tex(surf.orm);
    mat.roughnessMap = orm;
    mat.metalnessMap = orm;
    mat.transparent = true;
    mat.alphaTest = 0.03;
    mat.depthWrite = false;
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mat.map, alphaTest: 0.5 });
    const offX = (ly.canvas.width / 2 - ly.ax) * sc, offY = -(ly.canvas.height / 2 - ly.ay) * sc;
    const meshes = [], hinges = [];
    if (ly.anim.type === 'flutter') {
      // two wings hinged at the body so they can beat up off the card
      for (const side of [-1, 1]) {
        const hinge = new THREE.Group();
        hinge.userData.side = side;
        const g = new THREE.PlaneGeometry(cw / 2, ch);
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, side < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
        const mesh = new THREE.Mesh(g, mat);
        mesh.position.set(offX + (side * cw) / 4, offY, 0);
        hinge.add(mesh);
        root.add(hinge);
        meshes.push(mesh);
        hinges.push(hinge);
      }
    } else {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), mat);
      mesh.position.set(offX, offY, 0);
      root.add(mesh);
      meshes.push(mesh);
    }
    for (const mesh of meshes) {
      // stack in the painting's order (body, tail, head, then butterflies…), not by camera distance
      mesh.renderOrder = 10 + live.length;
      mesh.castShadow = !['float', 'twinkle', 'fall', 'glow', 'burst', 'flicker'].includes(ly.anim.type);
      mesh.customDepthMaterial = depth;
    }
    liveGroup.add(root);
    live.push({
      ly, root, mat, depth, hinges, ppx,
      base: root.position.clone(),
      baseRot: root.rotation.z,
      dispose() {
        mat.map.dispose();
        mat.roughnessMap.dispose();
        mat.dispose();
        depth.dispose();
        meshes.forEach((m) => m.geometry.dispose());
      },
    });
  }
}

function updateLiveTextures() {
  for (const it of live) {
    const surf = spriteSurface(it.ly);
    const old = [it.mat.map, it.mat.roughnessMap];
    it.mat.map = tex(surf.color, true);
    const orm = tex(surf.orm);
    it.mat.roughnessMap = orm;
    it.mat.metalnessMap = orm;
    it.depth.map = it.mat.map;
    it.mat.needsUpdate = it.depth.needsUpdate = true;
    old.forEach((t) => t.dispose());
  }
}

function animateLive(t) {
  if (!live.length) return;
  const still = state.fxMode === 'off';
  for (const it of live) {
    const { ly, root, base } = it;
    const a = ly.anim, ph = a.ph || 0;
    const breath = still ? 0 : Math.sin(t * 1.8);
    switch (a.type) {
      case 'breathe':
        root.scale.set(1 - 0.006 * breath, 1 + 0.02 * breath, 1);
        break;
      case 'head':
        root.position.y = base.y + a.amp * it.ppx * breath;
        root.rotation.z = it.baseRot + (still ? 0 : 0.03 * Math.sin(t * 0.55) + 0.01 * breath);
        break;
      case 'sway': {
        // swing about the anchor (stems from their base, lanterns from their string)
        if (still) break;
        let r = a.amp * Math.sin(t * (a.speed || 1) + ph);
        if (a.flick) {
          const f = (t * 0.13 + 0.3) % 1;
          if (f < 0.07) r += 0.07 * Math.sin((f / 0.07) * Math.PI * 2);
        }
        root.rotation.z = it.baseRot - r;
        break;
      }
      case 'bob': {
        if (still) break;
        root.position.y = base.y + (a.amp || 6) * it.ppx * Math.sin(t * (a.speed || 1) + ph);
        root.position.x = base.x + (a.ax || 0) * it.ppx * Math.sin(t * (a.speed || 1) * 0.7 + ph);
        root.rotation.z = it.baseRot + (a.rot ?? 0.03) * Math.sin(t * (a.speed || 1) * 0.8 + ph + 1);
        break;
      }
      case 'drift': {
        if (still) break;
        root.position.x = base.x + (a.amp || 14) * it.ppx * Math.sin(t * (a.speed || 0.35) + ph);
        root.position.y = base.y + 3 * it.ppx * Math.sin(t * (a.speed || 0.35) * 1.7 + ph);
        break;
      }
      case 'pulse': {
        // a heartbeat: two quick beats, then rest
        const f = still ? 0 : (t * (a.speed || 0.8) + ph) % 1;
        const beat = Math.exp(-(((f - 0.08) / 0.05) ** 2)) + 0.65 * Math.exp(-(((f - 0.26) / 0.05) ** 2));
        const s = 1 + (a.amp || 0.05) * beat;
        root.scale.set(s, s, 1);
        break;
      }
      case 'orbit': {
        // travel round a tilted ellipse (a planet's ring); fade out while behind the planet
        const th = (still ? 0 : t * (a.speed || 0.3)) + ph;
        const ex = Math.cos(th) * a.rx, ey = Math.sin(th) * a.ry;
        const c = Math.cos(a.tilt || 0), s = Math.sin(a.tilt || 0);
        const dx = ex * c - ey * s, dy = ex * s + ey * c;
        root.position.x = base.x + dx * it.ppx;
        root.position.y = base.y - dy * it.ppx;
        let hide = 0;
        if (a.hideR && Math.sin(th) < 0) {
          const ox = it.ly.x + dx - a.hideC[0], oy = it.ly.y + dy - a.hideC[1];
          hide = 1 - Math.min(1, Math.max(0, (Math.hypot(ox, oy) - a.hideR + 20) / 30));
        }
        it.mat.opacity = 1 - hide;
        break;
      }
      case 'spin':
        if (!still) root.rotation.z = it.baseRot - (t * (a.speed || 0.1) + ph);
        break;
      case 'glint': {
        if (still) break;
        const s = Math.sin(t * (a.speed || 1.4) + ph);
        root.scale.setScalar(1 + (a.amp || 0.06) * s);
        root.rotation.z = it.baseRot + 0.07 * Math.sin(t * 0.9 + ph);
        break;
      }
      case 'flicker': {
        const n = still ? 0 : Math.sin(t * 13 + ph) * 0.5 + Math.sin(t * 23.7 + ph * 2) * 0.3 + Math.sin(t * 6.1 + ph) * 0.2;
        root.scale.set(1 - 0.05 * n, 1 + 0.12 * n, 1);
        root.rotation.z = it.baseRot + 0.05 * Math.sin(t * 4.3 + ph);
        it.mat.opacity = 0.88 + 0.12 * n;
        break;
      }
      case 'glow':
        it.mat.opacity = still ? 0.8 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (a.speed || 5) + ph) * (0.7 + 0.3 * Math.sin(t * 17 + ph)));
        break;
      case 'burst': {
        // a firework that blooms, hangs, and fades, then blooms again
        if (still) break;
        const p = (t * (a.speed || 0.3) + ph) % 1;
        const grow = 1 - Math.pow(1 - Math.min(1, p * 3), 3);
        root.scale.setScalar(0.25 + 0.8 * grow);
        root.position.y = base.y - 22 * it.ppx * Math.max(0, p - 0.3);
        it.mat.opacity = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.4);
        break;
      }
      case 'fall': {
        // drifts down across the card (snow, confetti, leaves) and quietly starts again
        if (still) {
          it.mat.opacity = 0;
          break;
        }
        const range = a.range || 900;
        const p = (t * (a.speed || 0.06) + ph) % 1;
        root.position.y = base.y - (p - 0.5) * range * it.ppx;
        root.position.x = base.x + Math.sin(t * 1.1 + ph * 9) * (a.amp || 24) * it.ppx;
        root.rotation.z = it.baseRot + (a.spin ?? 1) * (t * 0.8 + ph * 5);
        if (a.flip) root.scale.set(Math.cos(t * 2.6 + ph * 7), 1, 1);
        it.mat.opacity = Math.min(1, p * 8, (1 - p) * 8);
        break;
      }
      case 'flutter': {
        if (still) break;
        root.position.x = base.x + Math.sin(t * 0.55 + ph) * (a.range || 26) * it.ppx;
        root.position.y = base.y + Math.sin(t * 0.83 + ph * 1.7) * (a.range || 26) * 0.7 * it.ppx;
        root.position.z = base.z + 0.006 * (1 + Math.sin(t * 1.2 + ph));
        root.rotation.z = it.baseRot + 0.12 * Math.sin(t * 0.7 + ph);
        const beat = 0.5 + 0.5 * Math.sin(t * (a.beat || 9) + ph * 3);
        const ang = 0.12 + (a.lift || 1.1) * beat;
        for (const h of it.hinges) h.rotation.y = h.userData.side < 0 ? ang : -ang;
        break;
      }
      case 'float': {
        if (still) {
          it.mat.opacity = 0;
          break;
        }
        const p = (t * (a.speed || 0.2) + ph) % 1;
        root.position.x = base.x + ((a.drift ?? 55) * p + 8 * Math.sin(t * 2 + ph * 6)) * it.ppx;
        root.position.y = base.y + (a.rise || 150) * p * it.ppx;
        const s = a.grow === false ? 1 : 0.55 + 0.7 * p;
        root.scale.set(s, s, 1);
        root.rotation.z = a.grow === false ? it.baseRot + 0.2 * Math.sin(t * 2 + ph) : 0.25 - 0.4 * p;
        it.mat.opacity = Math.sin(p * Math.PI);
        break;
      }
      case 'twinkle': {
        const s = still ? 0.6 : 0.5 + 0.5 * Math.sin(t * 2.3 + ph);
        const k = 0.2 + 0.9 * s * s * s;
        root.scale.set(k, k, 1);
        root.rotation.z = still ? 0 : t * 0.4 + ph;
        it.mat.opacity = 0.3 + 0.7 * s;
        break;
      }
      default:
        break;
    }
  }
}

// ------------------------------------------------------------------ rebuild pipeline
const fontPromises = new Map();
function ensureFont(spec) {
  if (!spec) return Promise.resolve();
  if (!fontPromises.has(spec)) fontPromises.set(spec, document.fonts.load(spec).catch(() => {}));
  return fontPromises.get(spec);
}
function fontsFor(st) {
  return Promise.all([
    ensureFont((S.COVER_FONTS[st.coverFont] || S.COVER_FONTS.Inter)(40)),
    ensureFont((S.LETTER_FONTS[st.letterFont] || S.LETTER_FONTS.Caveat)(40)),
    ensureFont('500 20px Inter'),
  ]);
}

let pending = new Set(), timer = null, running = false, ready = false;
function schedule(flags) {
  for (const f of flags) pending.add(f);
  if (timer) clearTimeout(timer);
  timer = setTimeout(run, 35);
}
async function run() {
  timer = null;
  if (running) {
    timer = setTimeout(run, 40);
    return;
  }
  if (!source) return;
  running = true;
  const p = pending;
  pending = new Set();
  try {
    await fontsFor(state);
    const relaid = p.has('L') || !L;
    if (relaid) {
      L = S.computeLayout(source, state);
      fitPaint();
      buildGeometry();
      ['F', 'I', 'B', 'E'].forEach((f) => p.add(f));
    }
    if (p.has('F')) rebuildFront();
    if (p.has('F') && !relaid) updateLiveTextures();
    if (p.has('F') && state.motif === 'card') p.add('I');
    if (p.has('I')) applySurface(mats.page, S.buildLetterSurface(L, state, maskRes && maskRes.mask));
    if (p.has('B')) applySurface(mats.back, S.buildBackSurface(L, state));
    if (p.has('E')) mats.edge.color.set(state.paper);
    applyScene();
    if (enter.waiting) {
      enter.waiting = false;
      enter.t = 0;
      clock.getDelta();
    }
    if (!ready) {
      ready = true;
      $('#loading').remove();
    }
  } catch (err) {
    console.error(err);
  } finally {
    running = false;
  }
}

function rebuildFront() {
  const text = S.renderCoverText(L, state);
  maskRes = S.buildMask(L, state, paint, text);
  const surf = S.buildCoverSurfaces(L, state, maskRes.mask, text);
  applySurface(mats.front, surf.front);
  applySurface(mats.inside, surf.inside);
  $('#modeNote').textContent = maskRes.note;
  drawMaskView();
}

function fitPaint() {
  if (pendingPaintImg) {
    const c = S.makeCanvas(L.W, L.H);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(pendingPaintImg, 0, 0, L.W, L.H);
    const d = ctx.getImageData(0, 0, L.W, L.H).data;
    paint = new Float32Array(L.W * L.H);
    for (let i = 0; i < paint.length; i++) paint[i] = d[i * 4] / 255;
    paintW = L.W;
    paintH = L.H;
    pendingPaintImg = null;
    return;
  }
  if (!paint) return;
  if (paintW === L.W && paintH === L.H) return;
  const out = new Float32Array(L.W * L.H);
  for (let y = 0; y < L.H; y++)
    for (let x = 0; x < L.W; x++)
      out[y * L.W + x] = paint[Math.min(paintH - 1, ((y / L.H) * paintH) | 0) * paintW + Math.min(paintW - 1, ((x / L.W) * paintW) | 0)];
  paint = out;
  paintW = L.W;
  paintH = L.H;
}

function applyScene() {
  const bg = state.bg;
  stage.style.setProperty('--stage', bg);
  const dark = S.luma(S.hexToRgb(bg)) < 0.4;
  stage.classList.toggle('dark', dark);
  wall.material.opacity = dark ? 0.35 : 0.13;
  key.intensity = 1.25 * state.light;
  hemi.intensity = 0.35 * state.light;
  scene.environmentIntensity = 0.85 * state.light;
  effects.configure(state.fx, state.fxMode, state.fxAmount, dark);
}

// ------------------------------------------------------------------ interaction + animation
let openT = 0, openTarget = 0;
let rotY = 0, rotX = 0, velY = 0, velX = 0;
let hoverX = 0, hoverY = 0, tiltX = 0, tiltY = 0;
let resetting = false;
let down = null;
let camZ = 6;
let zoom = 1;
let prevOpen = 0;
// entrance: the card rises in from below with a little twist (also used when switching cards)
const enter = { t: 1, waiting: true, dur: 0.85 };
const effects = new Effects($('#fx'));

// The old card flies up and out as a picture while the new one is being made.
function snapshotOut() {
  if (!geo || !ready) return;
  renderer.render(scene, camera);
  const c = document.createElement('canvas');
  c.width = gl.width;
  c.height = gl.height;
  c.getContext('2d').drawImage(gl, 0, 0);
  c.className = 'snap';
  stage.insertBefore(c, $('#fx'));
  const anim = c.animate(
    [
      { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
      { transform: 'translateY(-70%) rotate(-7deg) scale(0.92)', opacity: 0 },
    ],
    { duration: 700, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' }
  );
  anim.onfinish = () => c.remove();
  enter.waiting = true;
}

gl.addEventListener(
  'wheel',
  (e) => {
    // trackpad pinch (or ctrl/⌘ + scroll) zooms; a plain scroll is left alone
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoom = clamp(zoom * Math.exp(e.deltaY * 0.01), 0.55, 1.8);
  },
  { passive: false }
);

function toggleOpen(force) {
  openTarget = force === undefined ? (openTarget > 0.5 ? 0 : 1) : force ? 1 : 0;
  $('#btnOpen').classList.toggle('solid', openTarget > 0.5);
  $('#hint').textContent = openTarget > 0.5 ? 'Tap the card to close it · drag it to turn it round' : 'Tap the card to open it · drag it to turn it round';
}

gl.addEventListener('pointerdown', (e) => {
  gl.setPointerCapture(e.pointerId);
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false };
  velX = velY = 0;
  resetting = false;
  stopPlay();
});
gl.addEventListener('pointermove', (e) => {
  const r = gl.getBoundingClientRect();
  hoverX = ((e.clientX - r.left) / r.width) * 2 - 1;
  hoverY = ((e.clientY - r.top) / r.height) * 2 - 1;
  if (!down) return;
  const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
  if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
    down.moved = true;
    gl.classList.add('dragging');
  }
  if (down.moved) {
    const now = performance.now();
    const dt = Math.max(8, now - down.t) / 1000;
    rotY += dx * 0.009;
    rotX = clamp(rotX + dy * 0.006, -0.9, 0.9);
    velY = (dx * 0.009) / dt;
    velX = (dy * 0.006) / dt;
    down.t = now;
  }
  down.lx = e.clientX;
  down.ly = e.clientY;
});
function endPointer() {
  if (!down) return;
  if (!down.moved) toggleOpen();
  else if (performance.now() - down.t > 90) velX = velY = 0;
  down = null;
  gl.classList.remove('dragging');
}
gl.addEventListener('pointerup', endPointer);
gl.addEventListener('pointercancel', endPointer);
gl.addEventListener('pointerleave', () => {
  if (!down) hoverX = hoverY = 0;
});

function resetView() {
  rotY = Math.atan2(Math.sin(rotY), Math.cos(rotY));
  resetting = true;
  velX = velY = 0;
  zoom = 1;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (!geo) {
    renderer.render(scene, camera);
    return;
  }
  // opening
  const sp = dt / 1.05;
  openT += clamp(openTarget - openT, -sp, sp);
  const e = ease(openT);
  coverPivot.rotation.y = -Math.PI * 0.985 * e;
  coverPivot.position.z = T + 0.0015 + Math.sin(e * Math.PI) * 0.05;

  const cxC = -geo.rw / 2 + (geo.closed.x0 + geo.closed.x1) / 2;
  const cxO = -geo.rw / 2 + (geo.open.x0 + geo.open.x1) / 2;
  spreadGroup.position.x = -S.lerp(cxC, cxO, e);
  spreadGroup.position.y = -(geo.y0 + geo.y1) / 2;

  // drag inertia / reset
  if (!down) {
    if (resetting) {
      rotY += (0 - rotY) * (1 - Math.pow(0.002, dt));
      rotX += (0 - rotX) * (1 - Math.pow(0.002, dt));
      if (Math.abs(rotY) < 0.001 && Math.abs(rotX) < 0.001) resetting = false;
    } else {
      rotY += velY * dt;
      rotX += velX * dt;
      velY *= Math.pow(0.03, dt);
      velX *= Math.pow(0.03, dt);
      rotX += (0 - rotX) * (1 - Math.pow(0.25, dt));
    }
  }
  // the card leans away from the cursor, like a finger pressing on it, so the foil catches the light
  const follow = 1 - Math.pow(0.006, dt);
  const lean = down ? 0 : 1;
  tiltY += (hoverX * 0.36 * lean - tiltY) * follow;
  tiltX += (hoverY * 0.24 * lean - tiltX) * follow;
  const sh = state.shimmer ? 1 : 0;

  // entrance / card switch
  let ey = 0, ez = 0;
  if (enter.waiting) ey = -40;
  else if (enter.t < 1) {
    enter.t = Math.min(1, enter.t + dt / enter.dur);
    const k = 1 - enter.t;
    const out = 1 - Math.pow(k, 3);
    ey = -(1 - out) * (geo.y1 - geo.y0) * 1.6;
    ez = k * k * 0.22;
  }
  tiltGroup.position.y = ey;
  tiltGroup.rotation.set(rotX + tiltX + Math.sin(t * 0.7) * 0.025 * sh - ez * 0.8, rotY + tiltY + Math.sin(t * 0.45) * 0.06 * sh, ez);

  animateLive(t);

  // burst of the occasion's animation as the card opens
  if (openT > 0.55 && prevOpen <= 0.55 && state.fxMode !== 'off') effects.burst(1);
  prevOpen = openT;
  scene.environmentRotation.set(0, (state.shimmer ? Math.sin(t * 0.3) * 0.7 : 0) + hoverX * 0.6, 0);
  key.position.set(-1.6 + hoverX * 1.4, 2.4 - hoverY * 1.2, 5);

  // camera framing
  const w = S.lerp(geo.closed.x1 - geo.closed.x0, geo.open.x1 - geo.open.x0, e);
  const h = geo.y1 - geo.y0;
  const tanv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const viewerMode = document.body.classList.contains('viewer');
  const SH = Math.max(200, stage.clientHeight);
  const padTop = viewerMode ? 90 : 56, padBot = viewerMode ? 50 : 110;
  const availH = Math.max(0.35, (SH - padTop - padBot) / SH);
  const target = Math.max((h * 1.3) / availH / 2 / tanv, (w * 1.22) / 2 / (tanv * camera.aspect)) * zoom;
  camZ += (target - camZ) * (1 - Math.pow(0.02, dt));
  const shift = ((padBot - padTop) / 2 / SH) * 2 * camZ * tanv;
  camera.position.set(0, -shift, camZ);
  camera.lookAt(0, -shift, 0);

  renderer.render(scene, camera);

  // effects layer follows the card on screen
  const ppu = SH / (2 * camZ * tanv);
  effects.card.x = stage.clientWidth / 2;
  effects.card.y = SH / 2 - shift * ppu;
  effects.card.w = w * ppu;
  effects.card.h = h * ppu;
  effects.step(dt);

  // autoplay progress under the active thumbnail
  if (playing && playStart) {
    const pr = clamp((performance.now() - playStart) / PLAY_MS, 0, 1);
    $$('.thumb.on .prog').forEach((el) => (el.style.width = pr * 40 + '%'));
  }
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  effects.resize(w, h);
  drawMaskView();
}
new ResizeObserver(resize).observe(stage);

// ------------------------------------------------------------------ mask preview + paint
const mv = $('#maskView');
const mvWrap = $('#maskWrap');
const brushEl = $('#brush');
let overlayDirty = false;

function drawMaskView() {
  if (!L) return;
  const m = state.mode === 'paint' && paint ? paint : maskRes && maskRes.mask;
  if (!m) return;
  const maxW = Math.max(160, mvWrap.clientWidth - 2);
  const s = Math.min(maxW / L.W, 220 / L.H);
  const cw = Math.round(L.W * s), ch = Math.round(L.H * s);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (mv.width !== cw * dpr) {
    mv.width = cw * dpr;
    mv.height = ch * dpr;
  }
  mv.style.width = cw + 'px';
  mv.style.height = ch + 'px';
  const ctx = mv.getContext('2d');
  ctx.clearRect(0, 0, mv.width, mv.height);
  if (!L.dieCut) {
    ctx.fillStyle = state.paper;
    ctx.fillRect(0, 0, mv.width, mv.height);
  }
  ctx.globalAlpha = 0.55;
  ctx.drawImage(L.artCanvas, 0, 0, mv.width, mv.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(S.maskOverlay(L, m, state), 0, 0, mv.width, mv.height);
}

function mvPoint(e) {
  const r = mv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * L.W, y: ((e.clientY - r.top) / r.height) * L.H, cx: e.clientX - r.left, cy: e.clientY - r.top, r };
}
let painting = null;
function stamp(x, y) {
  const R = state.brushSize * Math.max(L.W, L.H);
  const x0 = Math.max(0, (x - R) | 0), x1 = Math.min(L.W - 1, (x + R + 1) | 0);
  const y0 = Math.max(0, (y - R) | 0), y1 = Math.min(L.H - 1, (y + R + 1) | 0);
  const add = state.brushMode !== 'erase';
  for (let yy = y0; yy <= y1; yy++)
    for (let xx = x0; xx <= x1; xx++) {
      const d = Math.hypot(xx - x, yy - y);
      if (d > R) continue;
      const v = S.smoothstep(R, R * 0.55, d);
      const i = yy * L.W + xx;
      paint[i] = add ? Math.max(paint[i], v) : paint[i] * (1 - v);
    }
}
mv.addEventListener('pointerdown', (e) => {
  if (!L) return;
  const p = mvPoint(e);
  if (state.mode === 'colour') {
    const i = ((Math.floor(p.y) * L.W + Math.floor(p.x)) * 4) | 0;
    const rgb = [L.art[i] / 255, L.art[i + 1] / 255, L.art[i + 2] / 255];
    if (L.art[i + 3] > 10) set('pickColor', S.rgbToHex(rgb));
    return;
  }
  if (state.mode !== 'paint') {
    set('mode', 'paint');
  }
  ensurePaint();
  mv.setPointerCapture(e.pointerId);
  painting = { x: p.x, y: p.y };
  stamp(p.x, p.y);
  queueOverlay();
});
mv.addEventListener('pointermove', (e) => {
  if (!L) return;
  const p = mvPoint(e);
  if (state.mode === 'paint') {
    const R = state.brushSize * Math.max(L.W, L.H) * (p.r.width / L.W) * 2;
    brushEl.style.display = 'block';
    brushEl.style.width = brushEl.style.height = R + 'px';
    brushEl.style.left = p.cx + (mv.offsetLeft || 0) + 'px';
    brushEl.style.top = p.cy + (mv.offsetTop || 0) + 'px';
  }
  if (!painting) return;
  const steps = Math.max(1, Math.ceil(Math.hypot(p.x - painting.x, p.y - painting.y) / (state.brushSize * Math.max(L.W, L.H) * 0.35)));
  for (let k = 1; k <= steps; k++) stamp(S.lerp(painting.x, p.x, k / steps), S.lerp(painting.y, p.y, k / steps));
  painting = { x: p.x, y: p.y };
  queueOverlay();
});
const endPaint = () => {
  if (!painting) return;
  painting = null;
  if (custom && current.kind === 'custom') custom.paint = paint;
  schedule('F');
  afterChange();
};
mv.addEventListener('pointerup', endPaint);
mv.addEventListener('pointercancel', endPaint);
mv.addEventListener('pointerleave', () => (brushEl.style.display = 'none'));
function queueOverlay() {
  if (overlayDirty) return;
  overlayDirty = true;
  requestAnimationFrame(() => {
    overlayDirty = false;
    drawMaskView();
  });
}
function ensurePaint() {
  if (paint && paintW === L.W && paintH === L.H) return;
  paint = maskRes ? maskRes.mask.slice() : new Float32Array(L.W * L.H);
  paintW = L.W;
  paintH = L.H;
}
$('#paintClear').addEventListener('click', () => {
  if (!L) return;
  ensurePaint();
  paint.fill(0);
  drawMaskView();
  schedule('F');
  afterChange();
});
$('#paintAll').addEventListener('click', () => {
  if (!L) return;
  ensurePaint();
  for (let i = 0; i < paint.length; i++) paint[i] = L.alpha[i] > 0.05 || !L.dieCut ? 1 : 0;
  drawMaskView();
  schedule('F');
  afterChange();
});

// ------------------------------------------------------------------ UI binding
function buildSwatches() {
  const fs = $('#foilSwatches');
  for (const [k, f] of Object.entries(S.FOILS)) fs.insertAdjacentHTML('beforeend', `<button class="sw foil" data-v="${k}" title="${f.label}"><i style="--g:${f.css}"></i></button>`);
  const fp = $('#fxPills');
  for (const [k, label] of Object.entries(FX_TYPES)) fp.insertAdjacentHTML('beforeend', `<button data-v="${k}">${label}</button>`);
  fs.insertAdjacentHTML('beforeend', `<span class="sw custom" title="Any foil colour" data-custom="foil"><input type="color" /></span>`);
  const ps = $('#paperSwatches');
  for (const [hex, name] of PAPERS) ps.insertAdjacentHTML('beforeend', `<button class="sw" data-v="${hex}" title="${name}" style="background:${hex}"></button>`);
  ps.insertAdjacentHTML('beforeend', `<span class="sw custom" title="Any paper colour" data-custom="paper"><input type="color" /></span>`);
  const bs = $('#bgSwatches');
  for (const [hex, name] of BGS) bs.insertAdjacentHTML('beforeend', `<button class="sw" data-v="${hex}" title="${name}" style="background:${hex}"></button>`);
  bs.insertAdjacentHTML('beforeend', `<span class="sw custom" title="Any colour" data-custom="bg"><input type="color" /></span>`);
  $$('.sw.custom input').forEach((inp) =>
    inp.addEventListener('input', () => {
      const k = inp.parentElement.dataset.custom;
      if (k === 'foil') {
        state.foilCustom = inp.value;
        set('foil', 'custom', true);
      } else set(k, inp.value);
    })
  );
}

function bindUI() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.pills[data-key] button[data-v]');
    if (b && !b.disabled) set(b.parentElement.dataset.key, b.dataset.v);
    const sw = e.target.closest('.swatches[data-key] .sw[data-v]');
    if (sw) set(sw.parentElement.dataset.key, sw.dataset.v);
  });
  $$('input[type=range][data-key]').forEach((el) => el.addEventListener('input', () => set(el.dataset.key, parseFloat(el.value))));
  $$('input[type=checkbox][data-key]').forEach((el) => el.addEventListener('change', () => set(el.dataset.key, el.checked)));
  $$('textarea[data-key], input[type=text][data-key], select[data-key], input[type=color][data-key]').forEach((el) =>
    el.addEventListener('input', () => set(el.dataset.key, el.value))
  );

  $('#file').addEventListener('change', (e) => {
    useFile(e.target.files[0]);
    e.target.value = '';
  });
  window.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      useFile(item.getAsFile());
    }
  });
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    dragDepth++;
    document.body.classList.add('dragover');
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove('dragover');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('dragover');
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) useFile(f);
  });

  $('#surprise').addEventListener('click', surprise);
  // writing the letter opens the card so you can watch it appear inside, like the original
  $$('textarea[data-key=letter], select[data-key=letterFont], select[data-key=letterAlign]').forEach((el) =>
    el.addEventListener('focus', () => {
      stopPlay();
      if (openTarget < 0.5) toggleOpen(true);
    })
  );
  $('textarea[data-key=coverText]').addEventListener('focus', () => openTarget > 0.5 && toggleOpen(false));
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    galleryCat = b.dataset.cat;
    stopPlay();
    renderThumbs();
  });
  $('#fxPreview').addEventListener('click', () => {
    applyScene();
    effects.burst(1);
  });
  $('#btnCopy').addEventListener('click', copyLink);
  $('#btnShare').addEventListener('click', async () => {
    const url = $('#shareUrl').value;
    if (navigator.share) {
      try {
        await navigator.share({ title: state.name ? `A card from ${state.name}` : 'A card for you', url });
      } catch (e) {
        /* cancelled */
      }
    } else copyLink();
  });
  $('#btnOpenCard').addEventListener('click', () => window.open($('#shareUrl').value, '_blank', 'noopener'));
  $('#btnPng2').addEventListener('click', savePng);
  $('#btnOpen').addEventListener('click', () => {
    stopPlay();
    toggleOpen();
  });
  $('#btnReset').addEventListener('click', resetView);
  $('#btnPlay').addEventListener('click', () => (playing ? stopPlay() : startPlay()));
  $('#btnLink').addEventListener('click', makeLink);
  $('#btnPng').addEventListener('click', savePng);
  $('#makeOwn').addEventListener('click', () => {
    document.body.classList.remove('viewer');
    history.replaceState(null, '', location.pathname);
    renderThumbs();
    syncUI();
    resize();
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      stopPlay();
      toggleOpen();
    } else if (e.key === 'r' || e.key === 'R') resetView();
  });
}

const FOIL_LABEL = (st) => (st.foil === 'custom' ? 'Custom' : S.FOILS[st.foil]?.label || '');
function syncUI() {
  $$('.pills[data-key]').forEach((g) => {
    const v = String(state[g.dataset.key]);
    g.querySelectorAll('button[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  });
  $$('.swatches[data-key]').forEach((g) => {
    const k = g.dataset.key;
    const v = String(state[k]).toLowerCase();
    let any = false;
    g.querySelectorAll('.sw[data-v]').forEach((b) => {
      const on = b.dataset.v.toLowerCase() === v;
      b.classList.toggle('on', on);
      any = any || on;
    });
    const c = g.querySelector('.sw.custom');
    if (c) {
      c.classList.toggle('on', !any);
      const col = k === 'foil' ? state.foilCustom : state[k];
      c.style.background = !any ? col : '';
      c.querySelector('input').value = col.startsWith('#') ? col : '#d4af37';
    }
  });
  $$('input[type=range][data-key]').forEach((el) => (el.value = state[el.dataset.key]));
  $$('input[type=checkbox][data-key]').forEach((el) => (el.checked = !!state[el.dataset.key]));
  $$('textarea[data-key], input[type=text][data-key], select[data-key], input[type=color][data-key]').forEach((el) => {
    const v = state[el.dataset.key] ?? '';
    if (el.value !== v && document.activeElement !== el) el.value = v;
  });

  const m = state.mode;
  $('#rowAmount').classList.toggle('hidden', m === 'all' || m === 'paint');
  $('#rowColour').classList.toggle('hidden', m !== 'colour');
  $('#rowPaint').classList.toggle('hidden', m !== 'paint');
  $('#rowBorder').classList.toggle('hidden', !state.border);
  mvWrap.classList.toggle('picking', m === 'colour');
  mvWrap.classList.toggle('painting', m === 'paint');
  $('#maskCap').textContent = m === 'paint' ? 'Paint where the foil goes' : m === 'colour' ? 'Tap to pick a colour' : 'Where the foil goes · tap to paint';
  $('#diecutBtn').disabled = !source?.hasAlpha;
  $('#diecutBtn').title = source?.hasAlpha ? 'Cut the card out along the picture' : 'Needs a picture with a transparent background';
  $('#fitRow').classList.toggle('hidden', state.shape === 'diecut');
  $('#coverInkColor').classList.toggle('hidden', state.coverInk !== 'ink');
  $('#valFoil').textContent = FOIL_LABEL(state);
  $('#valFx').textContent = FX_TYPES[state.fx] || '';
  $('#valPaper').textContent = PAPERS.find(([h]) => h.toLowerCase() === state.paper.toLowerCase())?.[1] || 'Custom';
  $('#paperNote').textContent =
    state.shape === 'diecut'
      ? 'Your picture is cut out along its edge. This stock is the inside and the back.'
      : state.fit === 'fit'
      ? 'The stock frames your picture on the front and makes the inside and back.'
      : 'Your picture covers the front, so the stock shows inside, on the back and at the edges.';
  $('#uploadLabel').textContent = custom ? 'Change picture' : 'Upload a picture';
  $('textarea.letter').style.fontFamily = `"${state.letterFont}", cursive`;
  drawPicThumb();
  updateLinkNote();
}

function set(key, val, force = false) {
  if (!force && state[key] === val) return;
  const prev = state[key];
  state[key] = val;
  if (key === 'shape' && val === 'diecut' && !source?.hasAlpha) {
    state.shape = prev;
    return;
  }
  if (key === 'mode' && val === 'paint' && L) ensurePaint();
  if (!SCENE_KEYS.includes(key) && !LOCAL_KEYS.includes(key)) stopPlay();
  if (FRONT_KEYS.includes(key) && openTarget > 0.5) toggleOpen(false);
  if (INSIDE_KEYS.includes(key) && openTarget < 0.5) toggleOpen(true);
  if ((key === 'fx' && val !== 'none') || (key === 'fxMode' && val !== 'off'))
    setTimeout(() => {
      applyScene();
      effects.burst(0.7);
    }, 0);
  syncUI();
  const f = FLAGS[key];
  if (f) schedule(f);
  if (key === 'mode' && val === 'paint') drawMaskView();
  afterChange();
}

function afterChange() {
  if (current.kind === 'custom' && custom) {
    custom.state = { ...state };
    custom.paint = paint;
  }
  updateLinkNote();
  saveDraft();
}

function surprise() {
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const modes = ['details', 'shadows', 'all', 'designed'];
  if (source?.designed) modes.push('designed', 'designed');
  state.mode = pick(modes);
  state.amount = 0.3 + Math.random() * 0.5;
  state.foil = pick(Object.keys(S.FOILS));
  state.finish = pick(Object.keys(S.FINISH));
  state.emboss = 0.4 + Math.random() * 0.5;
  state.border = Math.random() < 0.3;
  stopPlay();
  syncUI();
  schedule('FI');
  afterChange();
}

// ------------------------------------------------------------------ pictures, presets, gallery
function downscale(img, max) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (Math.max(iw, ih) <= max) return img;
  const s = max / Math.max(iw, ih);
  const c = S.makeCanvas(iw * s, ih * s);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function useFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const im = downscale(img, 2200);
    const hasAlpha = S.detectAlpha(im);
    stopPlay();
    saveCustomSnapshot();
    const src = { image: im, designed: null, cardRect: null, hasAlpha, presetId: null };
    // keep the person's own styling if they already made a card, otherwise start clean
    const keep =
      current.kind === 'custom' && custom?.state
        ? custom.state
        : { ...DEFAULTS, bg: state.bg, light: state.light, shimmer: state.shimmer, name: state.name, letter: 'Thinking of you,\nalways.', motif: 'heart' };
    state = { ...keep, shape: hasAlpha ? 'diecut' : 'asis', mode: 'designed', coverText: keep.coverText || '' };
    snapshotOut();
    openT = 0;
    custom = { source: src, state: { ...state }, paint: null, url: null };
    current = { kind: 'custom' };
    source = src;
    paint = null;
    toggleOpen(false);
    renderThumbs();
    syncUI();
    schedule('L');
    afterChange();
    toast(hasAlpha ? 'Transparent picture found — it’s die-cut along its edge' : 'Your picture is on the card');
  } catch (e) {
    toast('That picture couldn’t be opened');
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

function saveCustomSnapshot() {
  if (current.kind === 'custom' && custom) {
    custom.state = { ...state };
    custom.paint = paint;
  }
}

function loadPreset(id, quiet = false) {
  saveCustomSnapshot();
  snapshotOut();
  openT = 0;
  const p = PRESETS.find((q) => q.id === id) || PRESETS[0];
  source = buildPreset(p.id);
  const keepScene = { bg: state.bg, light: state.light, shimmer: state.shimmer, name: state.name, brushSize: state.brushSize, fxMode: state.fxMode, fxAmount: state.fxAmount };
  state = { ...DEFAULTS, ...p.settings, ...keepScene };
  paint = null;
  current = { kind: 'preset', id: p.id };
  if (!quiet) toggleOpen(false);
  renderThumbs();
  syncUI();
  schedule('L');
  afterChange();
}

function loadCustom() {
  if (!custom) return;
  snapshotOut();
  openT = 0;
  source = custom.source;
  state = { ...state, ...(custom.state || {}) };
  paint = custom.paint || null;
  paintW = L?.W || 0;
  paintH = L?.H || 0;
  if (paint && L && paint.length !== L.W * L.H) paint = null;
  current = { kind: 'custom' };
  toggleOpen(false);
  renderThumbs();
  syncUI();
  schedule('L');
  afterChange();
}

function thumbOf(img) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = 68 / Math.max(iw, ih);
  const c = S.makeCanvas(iw * s, ih * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
// ---- gallery: thumbnails are built a few at a time in the background
const thumbCache = new Map();
const thumbSlots = new Map(); // id -> elements waiting for their picture
let galleryCat = 'All';
let thumbQueue = [];
function visiblePresets() {
  return galleryCat === 'All' ? PRESETS : PRESETS.filter((p) => p.cat === galleryCat);
}
function fillSlot(el, id) {
  const c = thumbCache.get(id);
  const ph = el.querySelector('.ph');
  if (c && ph) ph.replaceWith(cloneCanvas(c));
}
function slot(el, id) {
  if (thumbCache.has(id)) el.prepend(cloneCanvas(thumbCache.get(id)));
  else {
    el.insertAdjacentHTML('afterbegin', '<span class="ph"></span>');
    if (!thumbSlots.has(id)) thumbSlots.set(id, []);
    thumbSlots.get(id).push(el);
    if (!thumbQueue.includes(id)) thumbQueue.push(id);
  }
}
let pumping = false;
function pumpThumbs() {
  if (pumping) return;
  pumping = true;
  const next = () => {
    if (!thumbQueue.length) {
      pumping = false;
      return;
    }
    const id = thumbQueue.shift();
    if (!thumbCache.has(id)) {
      try {
        thumbCache.set(id, buildThumb(id, 120));
      } catch (e) {
        console.warn('thumb failed', id, e);
      }
    }
    (thumbSlots.get(id) || []).forEach((el) => fillSlot(el, id));
    thumbSlots.delete(id);
    setTimeout(next, 25);
  };
  next();
}
function renderThumbs() {
  thumbSlots.clear();
  const box = $('#thumbs');
  box.innerHTML = '';
  if (custom) {
    const b = document.createElement('button');
    b.className = 'thumb' + (current.kind === 'custom' ? ' on' : '');
    b.title = 'Your card';
    b.appendChild(thumbOf(custom.source.image));
    b.insertAdjacentHTML('beforeend', '<span class="tag">you</span><span class="prog"></span>');
    b.addEventListener('click', () => {
      stopPlay();
      if (current.kind !== 'custom') loadCustom();
    });
    box.appendChild(b);
  }
  for (const p of visiblePresets()) {
    const b = document.createElement('button');
    b.className = 'thumb' + (current.kind === 'preset' && current.id === p.id ? ' on' : '');
    b.title = p.name;
    b.insertAdjacentHTML('beforeend', '<span class="prog"></span>');
    slot(b, p.id);
    b.addEventListener('click', () => {
      stopPlay();
      if (!(current.kind === 'preset' && current.id === p.id)) loadPreset(p.id);
    });
    box.appendChild(b);
  }
  const on = box.querySelector('.thumb.on');
  if (on) box.scrollLeft = on.offsetLeft - box.clientWidth / 2 + on.clientWidth / 2;
  // the gallery grid in the panel
  $('#cats').innerHTML = CATEGORIES.map((c) => `<button data-cat="${c}" class="${c === galleryCat ? 'on' : ''}">${c}</button>`).join('');
  const grid = $('#ggrid');
  grid.innerHTML = '';
  for (const p of visiblePresets()) {
    const b = document.createElement('button');
    b.className = 'gcard' + (current.kind === 'preset' && current.id === p.id ? ' on' : '');
    b.title = `${p.name} · ${p.cat}`;
    b.insertAdjacentHTML('beforeend', `<span>${p.name}</span>`);
    slot(b, p.id);
    b.addEventListener('click', () => {
      stopPlay();
      if (!(current.kind === 'preset' && current.id === p.id)) loadPreset(p.id);
    });
    grid.appendChild(b);
  }
  $('#valCount').textContent = `${visiblePresets().length} cards`;
  pumpThumbs();
}
function cloneCanvas(c) {
  const n = S.makeCanvas(c.width, c.height);
  n.getContext('2d').drawImage(c, 0, 0);
  return n;
}

function drawPicThumb() {
  const box = $('#picThumb');
  if (!source) return;
  if (box._src === source.image) return;
  box._src = source.image;
  box.innerHTML = '';
  const c = thumbOf(source.image);
  if (source.layers) {
    const s = c.width / source.image.width;
    for (const ly of source.layers) drawLayer(c.getContext('2d'), ly, 'canvas', s);
  }
  box.appendChild(c);
}

// gallery autoplay: show each card, open it, close it, move on
const PLAY_MS = 6800;
let playing = false, playTimers = [], playStart = 0;
function later(ms, fn) {
  playTimers.push(setTimeout(fn, ms));
}
function startPlay() {
  playing = true;
  $('#dock').classList.add('playing');
  $('#btnPlay').innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5.5" width="3.6" height="13" rx="1"/><rect x="13.9" y="5.5" width="3.6" height="13" rx="1"/></svg>';
  const list = visiblePresets();
  const i = current.kind === 'preset' ? list.findIndex((p) => p.id === current.id) : -1;
  step(i < 0 ? 0 : i, i >= 0);
}
function step(i, already) {
  if (!playing) return;
  const list = visiblePresets();
  if (!already) loadPreset(list[i % list.length].id, true);
  toggleOpen(false);
  playStart = performance.now();
  later(1700, () => toggleOpen(true));
  later(5200, () => toggleOpen(false));
  later(PLAY_MS, () => step((i + 1) % list.length, false));
}
function stopPlay() {
  if (!playing) return;
  playing = false;
  playStart = 0;
  $('#dock').classList.remove('playing');
  playTimers.forEach(clearTimeout);
  playTimers = [];
  $$('.thumb .prog').forEach((el) => (el.style.width = '0'));
  $('#btnPlay').innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
}

// ------------------------------------------------------------------ links, drafts, export
function pick(obj, keys) {
  const o = {};
  for (const k of keys) o[k] = obj[k];
  return o;
}
function signature() {
  return JSON.stringify([current, pick(state, SHARE_KEYS), paint ? paint.length : 0]);
}
function updateLinkNote() {
  const btn = $('#btnLink'), note = $('#linkNote');
  const fresh = lastLinkSig && lastLinkSig === signature();
  $('#sharePanel').classList.toggle('hidden', !fresh);
  $('#footRow').classList.toggle('hidden', !!fresh);
  if (lastLinkSig && !fresh) {
    note.textContent = 'You changed the card since your last link.';
    btn.textContent = 'Make a new link';
  } else {
    note.textContent = '';
    btn.textContent = 'Make a link to share';
  }
}

async function copyLink() {
  const url = $('#shareUrl').value;
  let ok = false;
  try {
    await navigator.clipboard.writeText(url);
    ok = true;
  } catch (e) {
    $('#shareUrl').select();
    ok = document.execCommand && document.execCommand('copy');
  }
  const b = $('#btnCopy');
  b.textContent = ok ? 'Copied' : 'Select';
  setTimeout(() => (b.textContent = 'Copy'), 1800);
}

function paintToDataURL() {
  const s = Math.min(1, 420 / Math.max(L.W, L.H));
  const w = Math.round(L.W * s), h = Math.round(L.H * s);
  const full = S.makeCanvas(L.W, L.H);
  const fx = full.getContext('2d');
  const img = fx.createImageData(L.W, L.H);
  for (let i = 0; i < paint.length; i++) {
    const v = paint[i] * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  fx.putImageData(img, 0, 0);
  const c = S.makeCanvas(w, h);
  c.getContext('2d').drawImage(full, 0, 0, w, h);
  return c.toDataURL('image/png');
}

async function makeLink() {
  const btn = $('#btnLink');
  btn.disabled = true;
  btn.textContent = 'Making your link…';
  await new Promise((r) => setTimeout(r, 30));
  try {
    const payload = { v: 1, s: pick(state, SHARE_KEYS) };
    if (current.kind === 'preset') payload.p = current.id;
    else payload.img = imageToDataURL(source.image, 900, source.hasAlpha);
    if (state.mode === 'paint' && paint && L) payload.pm = paintToDataURL();
    const code = await packCard(payload);
    const url = `${location.origin}${location.pathname}#c=${code}`;
    $('#shareUrl').value = url;
    lastLinkSig = signature();
    updateLinkNote();
    await copyLink();
    const kb = Math.round(url.length / 1024);
    toast(`Your link is ready${kb > 2 ? ` (${kb} KB — the picture travels inside it)` : ''}`);
  } catch (e) {
    console.error(e);
    toast('Couldn’t make a link this time');
  } finally {
    btn.disabled = false;
    updateLinkNote();
  }
}

async function applyPayload(data) {
  if (data.p) {
    source = buildPreset(data.p);
    current = { kind: 'preset', id: data.p };
  } else if (data.img) {
    const img = await loadImage(data.img);
    source = { image: img, designed: null, cardRect: null, hasAlpha: S.detectAlpha(img), presetId: null };
    custom = { source, state: null, paint: null, url: data.img };
    current = { kind: 'custom' };
  }
  state = { ...DEFAULTS, ...(data.s || {}) };
  if (custom && current.kind === 'custom') custom.state = { ...state };
  if (data.pm) pendingPaintImg = await loadImage(data.pm);
}

async function initFromHash() {
  const m = location.hash.match(/#c=(.+)$/);
  if (!m) return false;
  try {
    await applyPayload(await unpackCard(m[1]));
    document.body.classList.add('viewer');
    $('#vbFrom').textContent = state.name ? `from ${state.name}` : 'tap it to open';
    return true;
  } catch (e) {
    console.warn(e);
    toast('That link couldn’t be opened');
    return false;
  }
}

let draftTimer = null;
function saveDraft() {
  if (document.body.classList.contains('viewer')) return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      const d = { v: 1, cur: current, s: pick(state, SHARE_KEYS) };
      if (custom) {
        if (!custom.url) custom.url = imageToDataURL(custom.source.image, 1400, custom.source.hasAlpha);
        d.img = custom.url;
        d.cs = custom.state ? pick(custom.state, SHARE_KEYS) : null;
      }
      localStorage.setItem('foilstudio:draft', JSON.stringify(d));
    } catch (e) {
      /* storage full or blocked: drafts are a convenience only */
    }
  }, 700);
}

async function restoreDraft() {
  let d = null;
  try {
    d = JSON.parse(localStorage.getItem('foilstudio:draft') || 'null');
  } catch (e) {
    return false;
  }
  if (!d || d.v !== 1) return false;
  try {
    if (d.img) {
      const img = await loadImage(d.img);
      custom = { source: { image: img, designed: null, cardRect: null, hasAlpha: S.detectAlpha(img), presetId: null }, state: { ...DEFAULTS, ...(d.cs || d.s) }, paint: null, url: d.img };
    }
    if (d.cur?.kind === 'custom' && custom) {
      source = custom.source;
      current = { kind: 'custom' };
      state = { ...DEFAULTS, ...d.s };
      if (state.mode === 'paint') state.mode = 'designed';
    } else {
      const id = PRESETS.some((p) => p.id === d.cur?.id) ? d.cur.id : 'lovely';
      source = buildPreset(id);
      current = { kind: 'preset', id };
      state = { ...DEFAULTS, ...d.s };
      if (state.mode === 'paint') state.mode = 'designed';
    }
    return true;
  } catch (e) {
    return false;
  }
}

function savePng() {
  renderer.render(scene, camera);
  const c = S.makeCanvas(gl.width, gl.height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = state.bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(gl, 0, 0);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = 'glimmerfold-card.png';
  a.click();
  toast('Saved a picture of your card');
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ------------------------------------------------------------------ start
async function init() {
  buildSwatches();
  bindUI();
  await Promise.all(ART_FONTS.map(ensureFont));
  const fromLink = await initFromHash();
  if (!fromLink && !(await restoreDraft())) {
    source = buildPreset('lovely');
    current = { kind: 'preset', id: 'lovely' };
    state = { ...DEFAULTS, ...PRESETS[0].settings };
  }
  resize();
  syncUI();
  schedule('L');
  frame();
  // build the gallery thumbnails once the first card is up
  setTimeout(renderThumbs, 250);
}
init();
