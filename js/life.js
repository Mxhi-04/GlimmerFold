// Toolkit for living cards: pieces of a design that are painted onto their own small layer so the
// 3D card can move them (sway, flicker, spin, pulse, float, flutter…) while the rest stays printed.
import { makeCanvas } from './surface.js';
import { sparklePath, starPath } from './shapes.js';

const TAU = Math.PI * 2;

// Paint one living piece. `box` = [x, y, w, h] in artwork pixels, `anchor` = [x, y] pivot point.
// draw(a, m) paints with the same absolute coordinates as the rest of the design.
export function liveEl(layers, box, anchor, anim, draw, o = {}) {
  const [x0, y0, w, h] = box.map(Math.round);
  const c = makeCanvas(w, h), mk = makeCanvas(w, h);
  const a = c.getContext('2d'), m = mk.getContext('2d');
  a.translate(-x0, -y0);
  m.translate(-x0, -y0);
  draw(a, m);
  layers.push({
    id: o.id || anim.type, canvas: c, mask: mk,
    x: anchor[0], y: anchor[1], ax: anchor[0] - x0, ay: anchor[1] - y0,
    z: o.z ?? 0.004, rot: o.rot || 0, scale: o.scale || 1, anim, inside: o.inside ?? true, tone: o.tone,
  });
}

// Place a ready-made sprite ({canvas, mask, ax, ay}).
export function addSprite(layers, spr, x, y, anim, o = {}) {
  layers.push({ id: o.id || anim.type, canvas: spr.canvas, mask: spr.mask, x, y, ax: spr.ax, ay: spr.ay, z: o.z ?? 0.01, rot: o.rot || 0, scale: o.scale || 1, anim, inside: o.inside ?? false, tone: o.tone });
}

// ---------------------------------------------------------------- reusable sprites
export function butterflySprite(pal = ['#fff6f8', '#fcd3de', '#f19db6', '#dc7595', '#b4567a']) {
  const w = 230, h = 200, cx = 115, cy = 96;
  const c = makeCanvas(w, h), a = c.getContext('2d');
  const mk = makeCanvas(w, h), m = mk.getContext('2d');
  const upper = (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.bezierCurveTo(cx + s * 30, cy - 72, cx + s * 82, cy - 94, cx + s * 100, cy - 72);
    ctx.bezierCurveTo(cx + s * 112, cy - 52, cx + s * 98, cy - 14, cx + s * 72, cy + 2);
    ctx.bezierCurveTo(cx + s * 48, cy + 10, cx + s * 20, cy + 4, cx, cy - 6);
    ctx.closePath();
  };
  const lower = (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 2);
    ctx.bezierCurveTo(cx + s * 38, cy + 4, cx + s * 76, cy + 16, cx + s * 72, cy + 50);
    ctx.bezierCurveTo(cx + s * 68, cy + 80, cx + s * 30, cy + 86, cx + s * 14, cy + 58);
    ctx.bezierCurveTo(cx + s * 8, cy + 40, cx + s * 4, cy + 20, cx, cy + 2);
    ctx.closePath();
  };
  const veins = { upper: [[100, -70], [106, -44], [92, -16], [64, 0]], lower: [[70, 46], [44, 74], [20, 58]] };
  const spots = [[92, -76], [103, -60], [104, -40], [94, -20], [66, 70], [44, 80], [74, 32]];
  for (const s of [-1, 1]) {
    for (const [shape, key] of [[lower, 'lower'], [upper, 'upper']]) {
      a.save();
      shape(a, s);
      const g = a.createRadialGradient(cx, cy, 4, cx + s * 55, cy - 18, 115);
      g.addColorStop(0, pal[0]);
      g.addColorStop(0.3, pal[1]);
      g.addColorStop(0.72, pal[2]);
      g.addColorStop(1, pal[3]);
      a.fillStyle = g;
      a.fill();
      a.clip();
      a.lineWidth = 16;
      a.strokeStyle = pal[4] + '8c';
      shape(a, s);
      a.stroke();
      a.strokeStyle = pal[4] + '73';
      a.lineWidth = 1.4;
      for (const [vx, vy] of veins[key]) {
        a.beginPath();
        a.moveTo(cx, cy);
        a.quadraticCurveTo(cx + s * vx * 0.5, cy + vy * 0.35, cx + s * vx, cy + vy);
        a.stroke();
      }
      const sh = a.createLinearGradient(cx, cy - 80, cx + s * 80, cy + 40);
      sh.addColorStop(0, 'rgba(255,255,255,0)');
      sh.addColorStop(0.5, 'rgba(255,255,255,0.35)');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      a.fillStyle = sh;
      a.fillRect(0, 0, w, h);
      a.restore();
      a.strokeStyle = pal[4];
      a.lineWidth = 2;
      shape(a, s);
      a.stroke();
      m.strokeStyle = '#fff';
      m.lineWidth = 3.5;
      shape(m, s);
      m.stroke();
      m.lineWidth = 1.6;
      for (const [vx, vy] of veins[key]) {
        m.beginPath();
        m.moveTo(cx, cy);
        m.quadraticCurveTo(cx + s * vx * 0.5, cy + vy * 0.35, cx + s * vx, cy + vy);
        m.stroke();
      }
    }
    for (const [sx2, sy] of spots)
      for (const c2 of [a, m]) {
        c2.fillStyle = '#fff';
        c2.beginPath();
        c2.arc(cx + s * sx2 * 0.96, cy + sy * 0.96, 3.4, 0, TAU);
        c2.fill();
      }
  }
  for (const c2 of [a, m]) {
    const mkk = c2 === m;
    c2.save();
    if (!mkk) {
      const g = c2.createLinearGradient(cx - 6, 0, cx + 6, 0);
      g.addColorStop(0, '#3e2c35');
      g.addColorStop(0.5, '#7a5b6a');
      g.addColorStop(1, '#3e2c35');
      c2.fillStyle = g;
    } else c2.fillStyle = '#fff';
    c2.beginPath();
    c2.ellipse(cx, cy + 10, 6.5, 36, 0, 0, TAU);
    c2.fill();
    c2.beginPath();
    c2.arc(cx, cy - 30, 7.5, 0, TAU);
    c2.fill();
    c2.strokeStyle = mkk ? '#fff' : '#4a3540';
    c2.lineWidth = 2;
    c2.lineCap = 'round';
    for (const s of [-1, 1]) {
      c2.beginPath();
      c2.moveTo(cx + s * 3, cy - 36);
      c2.quadraticCurveTo(cx + s * 10, cy - 70, cx + s * 30, cy - 86);
      c2.stroke();
      c2.beginPath();
      c2.arc(cx + s * 31, cy - 87, 3.6, 0, TAU);
      c2.fill();
    }
    c2.restore();
  }
  return { canvas: c, mask: mk, ax: cx, ay: cy };
}
export const BLUE_WINGS = ['#f4fbff', '#cfe9fb', '#8fc6ee', '#5a9fd6', '#3c78b0'];
export const GOLD_WINGS = ['#fffbea', '#ffe9a8', '#f7c64f', '#e09a1f', '#a8700f'];

export function zSprite(size) {
  const c = makeCanvas(size * 1.3, size * 1.4), a = c.getContext('2d');
  const mk = makeCanvas(c.width, c.height), m = mk.getContext('2d');
  for (const ctx of [a, m]) {
    ctx.font = `400 ${size}px Pacifico`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ctx === a ? '#fbeee6' : '#fff';
    ctx.fillText('z', c.width / 2, c.height / 2);
  }
  return { canvas: c, mask: mk, ax: c.width / 2, ay: c.height / 2 };
}

export function sparkleSprite(r, col = '#fff8e8') {
  const s = Math.ceil(r * 2.4);
  const c = makeCanvas(s, s), a = c.getContext('2d');
  const mk = makeCanvas(s, s), m = mk.getContext('2d');
  for (const ctx of [a, m]) {
    ctx.fillStyle = ctx === a ? col : '#fff';
    sparklePath(ctx, s / 2, s / 2, r, 0.14);
    ctx.fill();
  }
  return { canvas: c, mask: mk, ax: s / 2, ay: s / 2 };
}

// a little glowing heart / star / dot / ribbon for things that float or fall across a card
export function bitSprite(kind, size, col, foil = true) {
  const s = Math.ceil(size * 2.6);
  const c = makeCanvas(s, s), a = c.getContext('2d');
  const mk = makeCanvas(s, s), m = mk.getContext('2d');
  for (const ctx of foil ? [a, m] : [a]) {
    ctx.fillStyle = ctx === a ? col : '#fff';
    ctx.strokeStyle = ctx.fillStyle;
    ctx.save();
    ctx.translate(s / 2, s / 2);
    if (kind === 'heart') {
      ctx.beginPath();
      ctx.moveTo(0, size * 0.42);
      ctx.bezierCurveTo(-size * 1.05, -size * 0.2, -size * 0.5, -size * 0.95, 0, -size * 0.4);
      ctx.bezierCurveTo(size * 0.5, -size * 0.95, size * 1.05, -size * 0.2, 0, size * 0.42);
      ctx.fill();
    } else if (kind === 'star') {
      starPath(ctx, 0, 0, size, size * 0.45, 5);
      ctx.fill();
    } else if (kind === 'flake') {
      ctx.lineWidth = Math.max(1.5, size * 0.12);
      ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        ctx.rotate(TAU / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size);
        ctx.moveTo(0, -size * 0.55);
        ctx.lineTo(-size * 0.3, -size * 0.8);
        ctx.moveTo(0, -size * 0.55);
        ctx.lineTo(size * 0.3, -size * 0.8);
        ctx.stroke();
      }
    } else if (kind === 'rect') {
      ctx.fillRect(-size * 0.35, -size * 0.8, size * 0.7, size * 1.6);
    } else if (kind === 'leaf') {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const th = (i / 40) * TAU;
        const r = size * (0.4 + 0.6 * Math.pow(Math.abs(Math.cos(th * 2.5)), 0.6));
        ctx.lineTo(Math.cos(th - Math.PI / 2) * r, Math.sin(th - Math.PI / 2) * r);
      }
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  return { canvas: c, mask: mk, ax: s / 2, ay: s / 2 };
}

// a bat with split-able wings (for the flutter motion)
export function batSprite() {
  const w = 220, h = 120, cx = 110, cy = 60, s = 100;
  const c = makeCanvas(w, h), a = c.getContext('2d');
  const mk = makeCanvas(w, h), m = mk.getContext('2d');
  for (const ctx of [a, m]) {
    ctx.fillStyle = ctx === a ? '#211a28' : '#fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.12);
    ctx.lineTo(cx - s * 0.08, cy - s * 0.3);
    ctx.lineTo(cx - s * 0.12, cy - s * 0.12);
    ctx.quadraticCurveTo(cx - s * 0.45, cy - s * 0.45, cx - s, cy - s * 0.25);
    ctx.quadraticCurveTo(cx - s * 0.82, cy - s * 0.02, cx - s * 0.86, cy + s * 0.18);
    ctx.quadraticCurveTo(cx - s * 0.66, cy + s * 0.02, cx - s * 0.52, cy + s * 0.2);
    ctx.quadraticCurveTo(cx - s * 0.34, cy + s * 0.04, cx - s * 0.14, cy + s * 0.26);
    ctx.quadraticCurveTo(cx, cy + s * 0.12, cx + s * 0.14, cy + s * 0.26);
    ctx.quadraticCurveTo(cx + s * 0.34, cy + s * 0.04, cx + s * 0.52, cy + s * 0.2);
    ctx.quadraticCurveTo(cx + s * 0.66, cy + s * 0.02, cx + s * 0.86, cy + s * 0.18);
    ctx.quadraticCurveTo(cx + s * 0.82, cy - s * 0.02, cx + s, cy - s * 0.25);
    ctx.quadraticCurveTo(cx + s * 0.45, cy - s * 0.45, cx + s * 0.12, cy - s * 0.12);
    ctx.lineTo(cx + s * 0.08, cy - s * 0.3);
    ctx.closePath();
    if (ctx === a) ctx.fill();
    else {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  return { canvas: c, mask: mk, ax: cx, ay: cy };
}

// Inside-cover foil for living pieces: their masks drawn where they rest.
export function insideFrom(layers, W, H) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  for (const ly of layers) {
    if (!ly.inside) continue;
    const sc = ly.scale || 1;
    ctx.save();
    ctx.translate(ly.x, ly.y);
    ctx.rotate(ly.rot || 0);
    ctx.drawImage(ly.mask, -ly.ax * sc, -ly.ay * sc, ly.mask.width * sc, ly.mask.height * sc);
    ctx.restore();
  }
  return c;
}
