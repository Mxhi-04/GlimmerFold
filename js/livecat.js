// "Happiness" — a living card. The meadow and title are printed on the card; the cat, butterflies,
// sleepy z's and sparkles are separate painted layers that move on top of the card in 3D.
import { makeCanvas, blur, smoothstep, clamp } from './surface.js';
import { rng, pair } from './presets.js';
import { butterflySprite, zSprite, sparkleSprite } from './life.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- painting helpers
const STOPS = [
  [0, [138, 124, 168]],
  [0.22, [180, 168, 207]],
  [0.45, [216, 209, 232]],
  [0.66, [240, 236, 248]],
  [0.84, [252, 251, 255]],
  [1, [255, 255, 255]],
];
function ramp(t) {
  t = clamp(t, 0, 1);
  for (let k = 1; k < STOPS.length; k++) {
    if (t <= STOPS[k][0]) {
      const [t0, c0] = STOPS[k - 1], [t1, c1] = STOPS[k];
      const f = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

// Paints a soft, lit fur coat inside the white shapes `shape(ctx)` draws, with thousands of
// hair strokes that follow `flow(x, y)` (an angle) and fluff out past the edge.
// Also returns a foil mask: a fine outline plus a few glinting hairs.
function fur(w, h, shape, flow, seed, o = {}) {
  const sil = makeCanvas(w, h);
  const sx = sil.getContext('2d', { willReadFrequently: true });
  sx.fillStyle = sx.strokeStyle = '#fff';
  shape(sx);
  const d = sx.getImageData(0, 0, w, h).data;
  const N = w * h;
  const A = new Float32Array(N);
  for (let i = 0; i < N; i++) A[i] = d[i * 4 + 3] / 255;
  const soft = o.soft || 10;
  const B = blur(blur(A, w, h, soft), w, h, soft);
  const E = blur(A, w, h, 2);
  const [lx, ly] = o.light || [-0.5, -0.86];
  const T = new Float32Array(N);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (E[i] < 0.01) continue;
      const gx = B[i + 1] - B[i - 1], gy = B[i + w] - B[i - w];
      const gl = Math.hypot(gx, gy) + 1e-6;
      const nx = -gx / gl, ny = -gy / gl;
      const rim = smoothstep(0.05, 0.7, 1 - B[i]);
      const ld = nx * lx + ny * ly;
      let t = 0.76 + 0.3 * ld * rim + 0.1 * (B[i] - 0.5);
      t -= (o.ao ?? 0.34) * smoothstep(o.aoFrom ?? 0.45, 1, y / h) * (0.7 - 0.3 * ld);
      T[i] = clamp(t, 0, 1);
    }
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const px = img.data;
  for (let i = 0; i < N; i++) {
    if (A[i] <= 0) continue;
    const c = ramp(T[i]);
    px[i * 4] = c[0];
    px[i * 4 + 1] = c[1];
    px[i * 4 + 2] = c[2];
    px[i * 4 + 3] = A[i] * 255;
  }
  ctx.putImageData(img, 0, 0);
  if (o.under) o.under(ctx);
  // foil outline
  const mk = makeCanvas(w, h);
  const mctx = mk.getContext('2d');
  const mi = mctx.createImageData(w, h);
  for (let i = 0; i < N; i++) {
    const band = smoothstep(0.18, 0.42, E[i]) * (1 - smoothstep(0.55, 0.85, E[i]));
    if (band > 0) {
      mi.data[i * 4] = mi.data[i * 4 + 1] = mi.data[i * 4 + 2] = 255;
      mi.data[i * 4 + 3] = band * 255;
    }
  }
  mctx.putImageData(mi, 0, 0);
  // hair
  const R = rng(seed);
  const n = Math.round((N / 12) * (o.density || 1));
  ctx.lineCap = mctx.lineCap = 'round';
  mctx.strokeStyle = '#fff';
  for (let k = 0; k < n; k++) {
    const x = R() * w, y = R() * h;
    const i = (y | 0) * w + (x | 0);
    if (E[i] < 0.35) continue;
    const edge = 1 - smoothstep(0.15, 0.7, B[i]);
    const ang = flow(x, y) + (R() - 0.5) * 0.6;
    const len = (4 + R() * 8) * (1 + edge * 1.6) * (o.len || 1);
    let t = T[i] + (R() - 0.5) * 0.24;
    if (R() < 0.12) t += 0.25;
    const c = ramp(t);
    ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${0.45 + R() * 0.5})`;
    ctx.lineWidth = 0.8 + R() * 1.7;
    const bend = (R() - 0.5) * 0.7;
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const qx = x + Math.cos(ang + bend) * len * 0.55, qy = y + Math.sin(ang + bend) * len * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(qx, qy, ex, ey);
    ctx.stroke();
    if (edge > 0.45 && R() < (o.foilFur ?? 0.05)) {
      mctx.lineWidth = 1.4;
      mctx.beginPath();
      mctx.moveTo(x, y);
      mctx.quadraticCurveTo(qx, qy, ex, ey);
      mctx.stroke();
    }
  }
  return { canvas: out, mask: mk, ctx, mctx };
}

// draw a layer at its resting place (used for thumbnails and the inside-cover foil)
export function drawLayer(ctx, ly, key = 'canvas', s = 1) {
  const c = ly[key];
  if (!c) return;
  // things that only exist in motion (falling snow, floating z's) aren't part of the still picture
  if (ly.anim && (ly.anim.type === 'fall' || ly.anim.type === 'float')) return;
  const sc = (ly.scale || 1) * s;
  ctx.save();
  ctx.translate(ly.x * s, ly.y * s);
  ctx.rotate(ly.rot || 0);
  ctx.drawImage(c, -ly.ax * sc, -ly.ay * sc, c.width * sc, c.height * sc);
  ctx.restore();
}

// ---------------------------------------------------------------- the cat, in three layers
function catBody() {
  const w = 680, h = 470;
  const radial = (x, y) => Math.atan2(y - 190, x - 120) * 0.85 + 0.35;
  const f = fur(
    w, h,
    (c) => {
      c.beginPath();
      c.ellipse(330, 225, 292, 170, -0.03, 0, TAU);
      c.ellipse(470, 215, 188, 165, 0, 0, TAU);
      c.ellipse(140, 205, 125, 135, 0, 0, TAU);
      c.fill();
    },
    radial, 11, { ao: 0.42, aoFrom: 0.4 }
  );
  const a = f.ctx;
  // pink-lavender warmth on the belly and the shadowed side
  const g = a.createRadialGradient(360, 380, 10, 360, 380, 300);
  g.addColorStop(0, 'rgba(236,182,214,0.32)');
  g.addColorStop(1, 'rgba(236,182,214,0)');
  a.globalCompositeOperation = 'source-atop';
  a.fillStyle = g;
  a.fillRect(0, 0, w, h);
  a.globalCompositeOperation = 'source-over';
  // front paws, tucked under the chin
  for (const [px, py] of [[105, 318], [212, 334]]) {
    const p = fur(130, 100, (c) => {
      c.beginPath();
      c.ellipse(65, 52, 56, 36, 0, 0, TAU);
      c.fill();
    }, (x, y) => Math.atan2(y - 40, x - 65), 50 + px, { soft: 6, ao: 0.3, len: 0.7 });
    a.save();
    a.fillStyle = 'rgba(120,100,150,0.28)';
    a.filter = 'blur(6px)';
    a.beginPath();
    a.ellipse(px, py + 26, 52, 14, 0, 0, TAU);
    a.fill();
    a.restore();
    a.drawImage(p.canvas, px - 65, py - 52);
    f.mctx.drawImage(p.mask, px - 65, py - 52);
    a.strokeStyle = 'rgba(160,140,180,0.55)';
    a.lineWidth = 1.6;
    for (const dx of [-16, 0, 16]) {
      a.beginPath();
      a.moveTo(px + dx, py + 10);
      a.quadraticCurveTo(px + dx * 1.1, py + 22, px + dx * 1.05, py + 30);
      a.stroke();
    }
  }
  return f;
}

function catTail() {
  const w = 720, h = 280, oy = 40; // room around the tail so its fluff isn't clipped
  const pts = [];
  const bez = (p0, p1, p2, p3, n) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], oy + u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
  };
  bez([585, 40], [630, 150], [430, 195], [230, 172], 60);
  bez([230, 172], [130, 160], [78, 138], [92, 110], 30);
  const n = pts.length;
  const f = fur(
    w, h,
    (c) => {
      pts.forEach(([x, y], i) => {
        const r = 44 - (i / n) * 12;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
      });
    },
    (x, y) => {
      let best = 0, bd = 1e9;
      for (let i = 0; i < n; i += 2) {
        const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      const a = pts[Math.min(n - 1, best + 2)], b = pts[Math.max(0, best - 2)];
      return Math.atan2(a[1] - b[1], a[0] - b[0]) + 0.25;
    },
    23, { ao: 0.3, aoFrom: 0.5, soft: 8 }
  );
  return f;
}

function catHead() {
  const w = 490, h = 440;
  const f = fur(
    w, h,
    (c) => {
      c.beginPath();
      c.ellipse(240, 250, 154, 128, 0, 0, TAU);
      c.ellipse(128, 304, 84, 64, 0.2, 0, TAU);
      c.ellipse(352, 304, 84, 64, -0.2, 0, TAU);
      c.moveTo(108, 196);
      c.quadraticCurveTo(76, 90, 102, 52);
      c.quadraticCurveTo(160, 74, 214, 136);
      c.closePath();
      c.moveTo(266, 134);
      c.quadraticCurveTo(320, 72, 378, 52);
      c.quadraticCurveTo(402, 92, 372, 198);
      c.closePath();
      c.fill();
    },
    (x, y) => Math.atan2(y - 300, x - 240),
    37, { ao: 0.3, aoFrom: 0.55, soft: 9, density: 1.15 }
  );
  const a = f.ctx, m = f.mctx;
  // inner ears with tufts
  for (const side of [-1, 1]) {
    a.save();
    a.beginPath();
    if (side < 0) {
      a.moveTo(126, 182);
      a.quadraticCurveTo(104, 108, 116, 82);
      a.quadraticCurveTo(160, 104, 194, 146);
    } else {
      a.moveTo(286, 146);
      a.quadraticCurveTo(322, 104, 364, 82);
      a.quadraticCurveTo(374, 116, 356, 184);
    }
    a.closePath();
    const g = a.createLinearGradient(0, 80, 0, 190);
    g.addColorStop(0, '#f3b3c8');
    g.addColorStop(1, '#f8d3df');
    a.fillStyle = g;
    a.fill();
    a.restore();
    const R = rng(side > 0 ? 71 : 72);
    a.lineCap = 'round';
    for (let k = 0; k < 70; k++) {
      const bx = side < 0 ? 150 + R() * 40 : 300 + R() * 40;
      const by = 150 + R() * 40;
      const ang = -Math.PI / 2 + side * (0.2 + R() * 0.5);
      const len = 14 + R() * 28;
      a.strokeStyle = `rgba(255,255,255,${0.5 + R() * 0.5})`;
      a.lineWidth = 1 + R() * 1.4;
      a.beginPath();
      a.moveTo(bx, by);
      a.quadraticCurveTo(bx + Math.cos(ang) * len * 0.5 + side * 4, by + Math.sin(ang) * len * 0.5, bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
      a.stroke();
    }
  }
  // soft lavender shading above the closed eyes, pink cheeks
  for (const [x, y, r, col] of [[182, 252, 40, 'rgba(170,150,200,0.22)'], [298, 252, 40, 'rgba(170,150,200,0.22)'], [146, 304, 50, 'rgba(247,160,192,0.42)'], [334, 304, 50, 'rgba(247,160,192,0.42)']]) {
    const g = a.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    a.fillStyle = g;
    a.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // face lines — printed and foiled
  for (const c of [a, m]) {
    const mk = c === m;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = mk ? '#fff' : '#7a6584';
    // sleeping eyes
    for (const ex of [182, 298]) {
      c.lineWidth = mk ? 4.5 : 4;
      c.beginPath();
      c.moveTo(ex - 26, 256);
      c.quadraticCurveTo(ex, 276, ex + 26, 256);
      c.stroke();
      c.lineWidth = mk ? 2.5 : 2.2;
      for (const k of [-1, 0, 1]) {
        c.beginPath();
        c.moveTo(ex + k * 13, 266 + Math.abs(k) * -2);
        c.lineTo(ex + k * 17, 277);
        c.stroke();
      }
    }
    // nose
    c.beginPath();
    c.moveTo(226, 296);
    c.quadraticCurveTo(240, 292, 254, 296);
    c.quadraticCurveTo(250, 306, 240, 312);
    c.quadraticCurveTo(230, 306, 226, 296);
    if (mk) {
      c.lineWidth = 3;
      c.stroke();
    } else {
      const g = c.createLinearGradient(0, 292, 0, 312);
      g.addColorStop(0, '#f7b9cb');
      g.addColorStop(1, '#e58ea9');
      c.fillStyle = g;
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath();
      c.ellipse(236, 297, 5, 2.2, 0, 0, TAU);
      c.fill();
    }
    // mouth
    c.strokeStyle = mk ? '#fff' : '#9a7f98';
    c.lineWidth = mk ? 3 : 2.6;
    c.beginPath();
    c.moveTo(240, 312);
    c.lineTo(240, 320);
    c.quadraticCurveTo(232, 332, 220, 326);
    c.moveTo(240, 320);
    c.quadraticCurveTo(248, 332, 260, 326);
    c.stroke();
    // whisker dots
    c.fillStyle = mk ? '#fff' : 'rgba(150,125,160,0.7)';
    for (const [x, y] of [[205, 318], [196, 328], [210, 330], [275, 318], [284, 328], [270, 330]]) {
      c.beginPath();
      c.arc(x, y, 1.8, 0, TAU);
      c.fill();
    }
    // whiskers
    c.lineWidth = mk ? 2.2 : 1.6;
    c.strokeStyle = mk ? '#fff' : 'rgba(255,255,255,0.95)';
    if (!mk) {
      c.shadowColor = 'rgba(110,90,130,0.6)';
      c.shadowBlur = 2;
    }
    for (const [sx, dir] of [[196, -1], [284, 1]])
      for (const k of [-1, 0, 1]) {
        c.beginPath();
        c.moveTo(sx, 322 + k * 8);
        c.quadraticCurveTo(sx + dir * 70, 312 + k * 14, sx + dir * 160, 316 + k * 26);
        c.stroke();
      }
    c.restore();
  }
  return f;
}

// ---------------------------------------------------------------- butterflies, z's, sparkles
// ---------------------------------------------------------------- the printed meadow
function meadow(a, m, W, H) {
  const R = rng(4242);
  const g = a.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#a9d47d');
  g.addColorStop(0.45, '#84bb5d');
  g.addColorStop(1, '#4e8b3d');
  a.fillStyle = g;
  a.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const x = R() * W, y = R() * H, r = 60 + R() * 140;
    const d = a.createRadialGradient(x, y, 2, x, y, r);
    d.addColorStop(0, 'rgba(255,248,190,0.16)');
    d.addColorStop(1, 'rgba(255,248,190,0)');
    a.fillStyle = d;
    a.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const pal = [[170, 212, 122], [142, 194, 98], [120, 176, 82], [98, 154, 68], [78, 132, 54], [190, 224, 142], [60, 112, 46]];
  a.lineCap = 'round';
  m.lineCap = 'round';
  m.strokeStyle = '#fff';
  for (let pass = 0; pass < 3; pass++) {
    const n = [8000, 9000, 7000][pass];
    for (let k = 0; k < n; k++) {
      const y = R() * (H + 60), x = R() * W;
      const depth = y / H;
      const len = (8 + R() * 14) * (0.7 + depth * 1.1) * (1 + pass * 0.15);
      const c = pal[(R() * pal.length) | 0];
      const sh = (R() - 0.5) * 34 - depth * 26 + (pass === 2 ? 14 : 0);
      a.strokeStyle = `rgba(${clamp(c[0] + sh, 0, 255) | 0},${clamp(c[1] + sh, 0, 255) | 0},${clamp(c[2] + sh * 0.6, 0, 255) | 0},${0.5 + R() * 0.45})`;
      a.lineWidth = (0.8 + R() * 1.6) * (0.7 + depth * 0.8);
      const lean = (R() - 0.5) * 0.5 + Math.sin(x * 0.01 + y * 0.004) * 0.18;
      a.beginPath();
      a.moveTo(x, y);
      a.quadraticCurveTo(x + lean * len * 0.3, y - len * 0.6, x + lean * len, y - len);
      a.stroke();
      if (R() < 0.005 && depth > 0.3) {
        m.lineWidth = 1.5;
        m.beginPath();
        m.moveTo(x, y);
        m.quadraticCurveTo(x + lean * len * 0.3, y - len * 0.6, x + lean * len, y - len);
        m.stroke();
      }
    }
  }
  // little meadow flowers
  for (let i = 0; i < 80; i++) {
    const y = H * 0.32 + Math.pow(R(), 0.7) * H * 0.68, x = R() * W;
    const s = 3 + (y / H) * 6;
    if (R() < 0.6) {
      a.fillStyle = 'rgba(255,255,255,0.92)';
      for (let k = 0; k < 8; k++) {
        const t = (k / 8) * TAU;
        a.beginPath();
        a.ellipse(x + Math.cos(t) * s, y + Math.sin(t) * s * 0.6, s * 0.7, s * 0.35, t, 0, TAU);
        a.fill();
      }
      a.fillStyle = '#f2c14e';
    } else {
      a.fillStyle = '#f4a9c6';
      for (let k = 0; k < 7; k++) {
        a.beginPath();
        a.arc(x + (R() - 0.5) * s * 1.3, y + (R() - 0.5) * s, s * 0.45, 0, TAU);
        a.fill();
      }
      a.fillStyle = '#e57fa6';
    }
    a.beginPath();
    a.arc(x, y, s * 0.4, 0, TAU);
    a.fill();
  }
  const v = a.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(20,50,20,0.25)');
  a.fillStyle = v;
  a.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- the card
export function happyCatLive() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, null);
  meadow(a, m, W, H);
  // soft shadow where the cat lies
  a.save();
  a.filter = 'blur(22px)';
  a.fillStyle = 'rgba(30,62,26,0.5)';
  a.beginPath();
  a.ellipse(585, 1215, 340, 70, 0, 0, TAU);
  a.fill();
  a.filter = 'blur(10px)';
  a.fillStyle = 'rgba(30,62,26,0.35)';
  a.beginPath();
  a.ellipse(520, 1235, 300, 34, 0, 0, TAU);
  a.fill();
  a.restore();
  // title
  const tctx = mask._text.getContext('2d');
  for (const c of [a, m, tctx]) {
    c.save();
    c.font = '400 236px "Great Vibes"';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (c === a) {
      c.shadowColor = 'rgba(60,40,30,0.28)';
      c.shadowBlur = 8;
      c.shadowOffsetY = 3;
      c.fillStyle = '#f8e7df';
      c.fillText('Happiness', 500, 290);
      c.shadowColor = 'transparent';
      c.strokeStyle = '#c98d80';
      c.lineWidth = 1.5;
      c.strokeText('Happiness', 500, 290);
    } else {
      c.fillStyle = '#fff';
      c.fillText('Happiness', 500, 290);
    }
    c.restore();
  }

  const body = catBody(), tail = catTail(), head = catHead();
  const bf = butterflySprite();
  const layers = [
    { id: 'body', canvas: body.canvas, mask: body.mask, x: 580, y: 1250, ax: 330, ay: 430, z: 0.0015, cat: true, tone: 0.64, anim: { type: 'breathe' } },
    { id: 'tail', canvas: tail.canvas, mask: tail.mask, x: 865, y: 1080, ax: 585, ay: 80, z: 0.003, cat: true, tone: 0.64, anim: { type: 'sway', amp: 0.035, speed: 1.15, flick: true } },
    { id: 'head', canvas: head.canvas, mask: head.mask, x: 390, y: 1020, ax: 240, ay: 390, z: 0.0045, cat: true, tone: 0.64, anim: { type: 'head', amp: 5 } },
  ];
  for (const [x, y, s, rot, ph] of [[300, 510, 0.62, -0.3, 0], [668, 440, 0.52, 0.28, 1.7], [812, 700, 0.46, -0.42, 3.1], [168, 712, 0.4, 0.3, 4.4]])
    layers.push({ id: 'butterfly', canvas: bf.canvas, mask: bf.mask, x, y, ax: bf.ax, ay: bf.ay, scale: s, rot, z: 0.014, anim: { type: 'flutter', ph } });
  [[46, 0], [58, 0.33], [72, 0.66]].forEach(([size, ph]) => {
    const z = zSprite(size);
    layers.push({ id: 'z', canvas: z.canvas, mask: z.mask, x: 520, y: 740, ax: z.ax, ay: z.ay, z: 0.012, anim: { type: 'float', ph } });
  });
  [[210, 440, 18, 0], [860, 380, 14, 1.3], [118, 1000, 12, 2.2], [905, 990, 16, 3.4], [742, 236, 12, 4.1], [470, 600, 10, 5.2], [640, 1310, 13, 0.7]].forEach(([x, y, r, ph]) => {
    const s = sparkleSprite(r);
    layers.push({ id: 'sparkle', canvas: s.canvas, mask: s.mask, x, y, ax: s.ax, ay: s.ay, z: 0.01, anim: { type: 'twinkle', ph } });
  });

  // what shows through on the inside of the cover: the cat and butterflies at rest
  const inside = makeCanvas(W, H);
  const ictx = inside.getContext('2d');
  for (const ly of layers) if (ly.cat || ly.id === 'butterfly') drawLayer(ictx, ly, 'mask');

  return { art, mask, layers, insideMask: inside };
}
