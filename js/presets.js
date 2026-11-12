// Gallery cards. All artwork is drawn procedurally here, together with a matching
// "as designed" foil mask, so the presets carry their own foil just like a printed card.
import { makeCanvas } from './surface.js';
import { roundStar, sparklePath, crescent } from './shapes.js';
import { liveEl, addSprite, butterflySprite, sparkleSprite, bitSprite, BLUE_WINGS, GOLD_WINGS } from './life.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pair(w, h, bg) {
  const art = makeCanvas(w, h), mask = makeCanvas(w, h);
  const a = art.getContext('2d'), m = mask.getContext('2d');
  if (bg) {
    a.fillStyle = bg;
    a.fillRect(0, 0, w, h);
  }
  m.fillStyle = '#000';
  m.fillRect(0, 0, w, h);
  // lettering also goes on its own layer, so it can be left out where the foil shows through inside
  mask._text = makeCanvas(w, h);
  return { art, mask, a, m };
}

export function speckle(ctx, w, h, n, colors, rMax, R) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(R() * colors.length) | 0];
    ctx.beginPath();
    ctx.arc(R() * w, R() * h, 0.4 + R() * rMax, 0, Math.PI * 2);
    ctx.fill();
  }
}

// both contexts get the same path, art gets a fill/stroke style, mask gets white
export function both(a, m, fn) {
  a.save();
  m.save();
  fn(a, false);
  fn(m, true);
  a.restore();
  m.restore();
}

export function spacedText(ctx, text, x, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((s, v) => s + v, 0) + spacing * (text.length - 1);
  let cx = x - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

// ------------------------------------------------------------------ petals & leaves
export function petalPath(ctx, R, wide = 0.5, notch = true) {
  ctx.beginPath();
  ctx.moveTo(R * 0.08, -R * 0.08);
  ctx.bezierCurveTo(R * 0.35, -R * wide, R * 0.92, -R * (wide * 0.95), R * 0.99, -R * 0.12);
  if (notch) ctx.quadraticCurveTo(R * 0.9, 0, R * 0.99, R * 0.12);
  else ctx.quadraticCurveTo(R * 1.06, 0, R * 0.99, R * 0.12);
  ctx.bezierCurveTo(R * 0.92, R * (wide * 0.95), R * 0.35, R * wide, R * 0.08, R * 0.08);
  ctx.closePath();
}

export function leafPath(ctx, L, W) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(L * 0.45, -W, L, 0);
  ctx.quadraticCurveTo(L * 0.45, W, 0, 0);
  ctx.closePath();
}

export function blossom(a, m, x, y, r, rot, o) {
  const n = o.petals || 5;
  for (let i = 0; i < n; i++) {
    const ang = rot + (i * Math.PI * 2) / n;
    both(a, m, (c, isMask) => {
      c.translate(x, y);
      c.rotate(ang);
      petalPath(c, r, o.wide || 0.55, o.notch !== false);
      if (isMask) {
        c.lineWidth = o.maskLine || r * 0.055;
        c.strokeStyle = '#fff';
        c.lineJoin = 'round';
        c.stroke();
      } else {
        const g = c.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
        g.addColorStop(0, o.dark);
        g.addColorStop(0.35, o.mid);
        g.addColorStop(1, o.light);
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = o.line;
        c.lineWidth = r * 0.03;
        c.stroke();
        c.globalAlpha = 0.35;
        c.strokeStyle = o.line;
        c.lineWidth = r * 0.012;
        for (let k = -1; k <= 1; k++) {
          c.beginPath();
          c.moveTo(r * 0.15, 0);
          c.quadraticCurveTo(r * 0.5, k * r * 0.12, r * 0.78, k * r * 0.22);
          c.stroke();
        }
      }
    });
  }
  // centre
  a.save();
  a.fillStyle = o.center || '#f2c14e';
  a.beginPath();
  a.arc(x, y, r * 0.16, 0, Math.PI * 2);
  a.fill();
  const R = rng((x * 13 + y * 7) | 0);
  for (let k = 0; k < 18; k++) {
    const ang = R() * Math.PI * 2, d = r * (0.12 + R() * 0.18);
    a.fillStyle = k % 3 ? o.center2 || '#e39b2d' : '#fff3c4';
    a.beginPath();
    a.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, r * 0.028, 0, Math.PI * 2);
    a.fill();
  }
  a.restore();
  if (o.maskCenter) {
    m.fillStyle = '#fff';
    m.beginPath();
    m.arc(x, y, r * 0.16, 0, Math.PI * 2);
    m.fill();
  }
}

export function leaf(a, m, x, y, L, W, ang, o) {
  both(a, m, (c, isMask) => {
    c.translate(x, y);
    c.rotate(ang);
    leafPath(c, L, W);
    if (isMask) {
      if (!o.mask) return;
      c.strokeStyle = '#fff';
      c.lineWidth = o.maskLine || 6;
      c.stroke();
      return;
    }
    const g = c.createLinearGradient(0, -W, 0, W);
    g.addColorStop(0, o.light);
    g.addColorStop(1, o.dark);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = o.line;
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(L * 0.5, -W * 0.08, L * 0.92, 0);
    c.lineWidth = 2;
    c.stroke();
  });
}

// ------------------------------------------------------------------ the cards
function starsCard() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#efe2c6');
  const R = rng(11);
  speckle(a, S, S, 2600, ['rgba(140,110,60,0.07)', 'rgba(255,255,255,0.22)'], 1.4, R);
  const stars = [
    [300, 320, 66, 0.2], [565, 235, 46, -0.3], [470, 520, 62, 0.12], [245, 690, 42, 0.5],
    [700, 690, 70, -0.18], [800, 410, 38, 0.4], [610, 880, 28, 0.2], [150, 460, 24, 0],
    [420, 840, 20, 0.6], [860, 180, 22, 0.1],
  ];
  // every star is its own living piece: it glints and sways on its own rhythm
  const life = [];
  stars.forEach(([x, y, r, rot], i) => {
    liveEl(life, [x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8], [x, y], { type: 'glint', amp: 0.08, speed: 1.1 + (i % 4) * 0.25, ph: i * 1.7 }, (a2, m2) => {
      roundStar(a2, x, y, r, rot, '#c9a24a');
      roundStar(m2, x, y, r, rot, '#fff');
    }, { z: 0.003 });
  });
  [[380, 140, 12, 0.3], [690, 520, 10, 1.9], [120, 820, 11, 3.2], [880, 760, 13, 4.4], [520, 700, 9, 5.1]].forEach(([x, y, r, ph]) =>
    addSprite(life, sparkleSprite(r, '#f6e2a8'), x, y, { type: 'twinkle', ph })
  );
  return { art, mask, layers: life };
}

function bloomCard() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#f7f2ee');
  const R = rng(5);
  speckle(a, S, S, 1800, ['rgba(120,90,80,0.05)', 'rgba(255,255,255,0.3)'], 1.3, R);
  const cx = 500, cy = 590;
  const layers = [
    { n: 9, R: 330, light: '#fde7ec', mid: '#f6b8c5', dark: '#e88a9f' },
    { n: 8, R: 262, light: '#fde2e8', mid: '#f4a9b9', dark: '#e17d95' },
    { n: 7, R: 196, light: '#fcdbe2', mid: '#f19cae', dark: '#d9718a' },
    { n: 6, R: 134, light: '#fbd3dc', mid: '#ee92a6', dark: '#cf6680' },
    { n: 5, R: 78, light: '#f9c8d3', mid: '#e9879d', dark: '#c45c76' },
  ];
  const life = [];
  // the camellia breathes slowly, like it's opening
  liveEl(life, [cx - 390, cy - 390, 780, 780], [cx, cy], { type: 'glint', amp: 0.025, speed: 0.6 }, (a, m) => {
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      const ang = (i / L.n) * Math.PI * 2 + li * 0.37 + (R() - 0.5) * 0.15;
      const r = L.R * (0.92 + R() * 0.12);
      both(a, m, (c, isMask) => {
        c.translate(cx, cy);
        c.rotate(ang);
        petalPath(c, r, 0.62, false);
        if (isMask) {
          c.strokeStyle = '#fff';
          c.lineWidth = 6;
          c.lineJoin = 'round';
          c.stroke();
          return;
        }
        const g = c.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        g.addColorStop(0, L.dark);
        g.addColorStop(0.55, L.mid);
        g.addColorStop(1, L.light);
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = '#b8656f';
        c.lineWidth = 3;
        c.stroke();
      });
    }
  });
  a.fillStyle = '#f0c75e';
  for (let k = 0; k < 40; k++) {
    const ang = R() * Math.PI * 2, d = R() * 34;
    a.beginPath();
    a.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 5, 0, Math.PI * 2);
    a.fill();
  }
  }, { z: 0.002 });
  addSprite(life, butterflySprite(), 790, 330, { type: 'flutter', ph: 0.8, range: 40 }, { scale: 0.42, rot: 0.3 });
  addSprite(life, butterflySprite(BLUE_WINGS), 210, 880, { type: 'flutter', ph: 2.6, range: 34 }, { scale: 0.36, rot: -0.35 });
  for (const c of [a, m]) {
    c.save();
    c.font = '400 190px "Great Vibes"';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = c === a ? '#b98a5e' : '#fff';
    c.fillText('Bloom', 500, 170);
    c.restore();
  }
  return { art, mask, layers: life };
}

function blossomDieCut() {
  const W = 1000, H = 1300;
  const { art, mask, a, m } = pair(W, H, null);
  const rect = { x: 190, y: 170, w: 620, h: 960 };
  const R = rng(9);
  a.fillStyle = '#c42b2e';
  a.fillRect(rect.x, rect.y, rect.w, rect.h);
  a.save();
  a.beginPath();
  a.rect(rect.x, rect.y, rect.w, rect.h);
  a.clip();
  for (let i = 0; i < 5000; i++) {
    a.strokeStyle = R() > 0.5 ? 'rgba(255,90,80,0.08)' : 'rgba(90,0,10,0.09)';
    a.lineWidth = 1 + R() * 2;
    const x = rect.x + R() * rect.w, y = rect.y + R() * rect.h, an = R() * Math.PI;
    a.beginPath();
    a.moveTo(x, y);
    a.lineTo(x + Math.cos(an) * 9, y + Math.sin(an) * 9);
    a.stroke();
  }
  a.restore();
  // stem
  a.strokeStyle = '#2f7a43';
  a.lineCap = 'round';
  a.lineWidth = 20;
  a.beginPath();
  a.moveTo(520, 1180);
  a.bezierCurveTo(470, 900, 560, 600, 500, 250);
  a.stroke();
  a.strokeStyle = '#4e9c5c';
  a.lineWidth = 7;
  a.stroke();
  const life = [];
  const leafO = { light: '#5fae67', dark: '#2c6e3b', line: '#1f5a2e', mask: true, maskLine: 7 };
  // leaves sway from where they join the stem
  [[505, 980, 150, 48, -2.5], [520, 880, 140, 44, -0.5], [495, 740, 130, 42, -2.7], [530, 640, 120, 40, -0.4], [500, 470, 110, 36, -2.6], [520, 400, 100, 34, -0.6]].forEach(
    ([x, y, L, Wd, ang], i) =>
      liveEl(life, [x - L - 20, y - L - 20, L * 2 + 40, L * 2 + 40], [x, y], { type: 'sway', amp: 0.07, speed: 1.3 + i * 0.13, ph: i }, (a2, m2) => leaf(a2, m2, x, y, L, Wd, ang, leafO), { z: 0.002 })
  );
  // buds nod
  for (const [x, y, r, ang] of [[640, 470, 46, -0.6], [380, 820, 40, -2.4]]) {
    liveEl(life, [x - r - 12, y - r - 12, r * 2 + 24, r * 2 + 24], [x, y], { type: 'sway', amp: 0.1, speed: 1.1, ph: x }, (a, m) =>
    both(a, m, (c, isMask) => {
      c.translate(x, y);
      c.rotate(ang);
      c.beginPath();
      c.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
      if (isMask) {
        c.strokeStyle = '#fff';
        c.lineWidth = 7;
        c.stroke();
        return;
      }
      const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      g.addColorStop(0, '#fbd4dc');
      g.addColorStop(1, '#e46e8d');
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = '#b8385a';
      c.lineWidth = 3;
      c.stroke();
    }), { z: 0.002 });
  }
  const bl = { light: '#fde3e8', mid: '#f6a9bb', dark: '#e0607f', line: '#b8385a', maskLine: 10, center: '#f5c542', center2: '#e8892a' };
  [[300, 300, 150, 0.3], [700, 265, 135, 1.1], [320, 620, 145, -0.2], [660, 650, 140, 0.6], [305, 1010, 155, 0.9]].forEach(([x, y, r, rot]) =>
    blossom(a, m, x, y, r, rot, bl)
  );
  addSprite(life, butterflySprite(GOLD_WINGS), 560, 860, { type: 'flutter', ph: 1.2, range: 40 }, { scale: 0.42, rot: 0.25 });
  [[450, 220, 13, 0.4], [720, 470, 11, 2.1], [250, 820, 12, 3.6], [560, 1060, 10, 4.9]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r), x, y, { type: 'twinkle', ph }));
  return { art, mask, cardRect: rect, layers: life };
}

function lilyCard() {
  const W = 1000, H = 1300;
  const { art, mask, a, m } = pair(W, H, '#ebe6e2');
  const R = rng(21);
  speckle(a, W, H, 2200, ['rgba(110,90,90,0.05)', 'rgba(255,255,255,0.3)'], 1.3, R);
  const cx = 480, cy = 640;
  // stem
  for (const c of [a, m]) {
    c.save();
    c.strokeStyle = c === a ? '#b07a80' : '#fff';
    c.lineWidth = c === a ? 3.5 : 5;
    c.beginPath();
    c.moveTo(cx - 14, cy + 30);
    c.bezierCurveTo(cx - 40, cy + 260, cx - 90, cy + 460, cx - 120, H + 10);
    c.moveTo(cx + 12, cy + 30);
    c.bezierCurveTo(cx - 14, cy + 260, cx - 66, cy + 460, cx - 96, H + 10);
    c.stroke();
    c.restore();
  }
  const petal = (ang, L, Wd, curl) => {
    both(a, m, (c, isMask) => {
      c.translate(cx, cy);
      c.rotate(ang);
      c.beginPath();
      c.moveTo(0, -Wd * 0.22);
      c.bezierCurveTo(L * 0.3, -Wd * 0.95, L * 0.72, -Wd * 0.8, L, -Wd * 0.05 + curl);
      c.quadraticCurveTo(L * 1.04, Wd * 0.06 + curl, L * 0.95, Wd * 0.14 + curl * 0.6);
      c.bezierCurveTo(L * 0.7, Wd * 0.72, L * 0.3, Wd * 0.85, 0, Wd * 0.22);
      c.closePath();
      if (isMask) {
        c.strokeStyle = '#fff';
        c.lineWidth = 5.5;
        c.lineJoin = 'round';
        c.stroke();
      } else {
        const g = c.createLinearGradient(0, 0, L, 0);
        g.addColorStop(0, '#f3dadd');
        g.addColorStop(0.5, '#faf3f3');
        g.addColorStop(1, '#ffffff');
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = '#b07a80';
        c.lineWidth = 3.5;
        c.stroke();
        c.beginPath();
        c.moveTo(L * 0.05, 0);
        c.quadraticCurveTo(L * 0.5, Wd * 0.06, L * 0.9, curl * 0.7);
        c.strokeStyle = '#c99aa0';
        c.lineWidth = 2;
        c.stroke();
      }
      // spots
      const Rr = rng((ang * 1000) | 0);
      for (let k = 0; k < 16; k++) {
        const t = 0.14 + Rr() * 0.34;
        const yy = (Rr() - 0.5) * Wd * 0.7 * (1 - t);
        c.fillStyle = isMask ? '#fff' : '#b46b78';
        c.beginPath();
        c.ellipse(L * t, yy, 3 + Rr() * 4, 2 + Rr() * 2.5, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
  };
  const back = [[-1.95, 330, 96, -20], [-0.35, 350, 92, 18], [1.35, 320, 96, 22]];
  const front = [[-2.95, 360, 110, 26], [-1.1, 380, 108, -24], [0.55, 370, 110, 28]];
  back.forEach((p) => petal(...p));
  front.forEach((p) => petal(...p));
  // stamens
  const st = [-1.6, -1.2, -0.75, -0.3, 0.1, -2.1];
  const life = [];
  st.forEach((ang, i) => {
    const L = 210 + (i % 3) * 22;
    const ex = cx + Math.cos(ang) * L, ey = cy + Math.sin(ang) * L;
    // each stamen trembles gently from the heart of the lily
    liveEl(life, [cx - L - 40, cy - L - 40, L * 2 + 80, L * 2 + 80], [cx, cy], { type: 'sway', amp: 0.05, speed: 1.2 + i * 0.17, ph: i * 1.3 }, (a, m) => {
    a.strokeStyle = '#9c8a5a';
    a.lineWidth = 3;
    a.beginPath();
    a.moveTo(cx, cy);
    a.quadraticCurveTo(cx + Math.cos(ang + 0.25) * L * 0.6, cy + Math.sin(ang + 0.25) * L * 0.6, ex, ey);
    a.stroke();
    for (const c of [a, m]) {
      c.save();
      c.translate(ex, ey);
      c.rotate(ang + Math.PI / 2);
      c.fillStyle = c === a ? '#c99a3d' : '#fff';
      c.beginPath();
      c.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    }, { z: 0.002 });
  });
  addSprite(life, butterflySprite(), 790, 290, { type: 'flutter', ph: 0.4, range: 44 }, { scale: 0.42, rot: 0.3 });
  [[200, 260, 12, 0.2], [820, 620, 10, 1.7], [660, 1080, 12, 3.3], [150, 900, 9, 4.6]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#f2e1da'), x, y, { type: 'twinkle', ph }));
  return { art, mask, layers: life };
}

function moonCard() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#df4a7f');
  const R = rng(33);
  speckle(a, S, S, 9000, ['rgba(255,140,180,0.25)', 'rgba(150,20,70,0.18)', 'rgba(255,220,235,0.18)'], 1.8, R);
  const cx = 500, cy = 450;
  const ring = (start, end) => {
    for (const c of [a, m]) {
      c.save();
      c.strokeStyle = c === a ? '#e3e3ea' : '#fff';
      c.lineWidth = c === a ? 9 : 11;
      c.beginPath();
      c.ellipse(cx, cy + 20, 340, 82, -0.32, start, end);
      c.stroke();
      c.restore();
    }
  };
  ring(Math.PI, Math.PI * 2);
  crescent(a, cx, cy, 235, '#fdf4f6');
  // crescent outline via mask stroke of both arcs, clipped
  for (const c of [a, m]) {
    c.save();
    c.strokeStyle = c === a ? '#d9d9e0' : '#fff';
    c.lineWidth = c === a ? 8 : 10;
    c.beginPath();
    c.rect(0, 0, S, S);
    c.arc(cx + 235 * 0.42, cy - 235 * 0.26, 235 * 0.84, 0, Math.PI * 2, true);
    c.clip('evenodd');
    c.beginPath();
    c.arc(cx, cy, 235, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    c.save();
    c.strokeStyle = c === a ? '#d9d9e0' : '#fff';
    c.lineWidth = c === a ? 8 : 10;
    c.beginPath();
    c.arc(cx, cy, 235, 0, Math.PI * 2);
    c.clip();
    c.beginPath();
    c.arc(cx + 235 * 0.42, cy - 235 * 0.26, 235 * 0.84, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  ring(0, Math.PI);
  const life = [];
  // little moons travel round the ring, hiding as they pass behind the crescent
  [0.25, 2.2, 3.6].forEach((t0, i) =>
    liveEl(life, [cx - 20, cy + 0, 40, 40], [cx, cy + 20], { type: 'orbit', rx: 340, ry: 82, tilt: -0.32, speed: 0.35, ph: t0, hideR: 235, hideC: [cx, cy] }, (a2, m2) => {
      for (const c of [a2, m2]) {
        c.fillStyle = c === a2 ? '#f2f2f6' : '#fff';
        c.beginPath();
        c.arc(cx, cy + 20, 13, 0, Math.PI * 2);
        c.fill();
      }
    }, { z: 0.004, inside: false, id: 'orbit' + i })
  );
  const sp = [[220, 240, 42], [790, 220, 32], [820, 590, 48], [190, 610, 30], [660, 120, 22], [350, 130, 16], [880, 400, 18], [120, 400, 16], [560, 760, 20]];
  sp.forEach(([x, y, r], i) =>
    liveEl(life, [x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8], [x, y], { type: 'glint', amp: 0.28, speed: 1.6 + (i % 3) * 0.5, ph: i * 2.1 }, (a2, m2) => {
      for (const c of [a2, m2]) {
        c.fillStyle = c === a2 ? '#eeeef3' : '#fff';
        sparklePath(c, x, y, r);
        c.fill();
      }
    }, { z: 0.003 })
  );
  for (let i = 0; i < 140; i++) {
    const x = R() * S, y = R() * 780, r = 1.5 + R() * 3.5;
    const hit = Math.hypot(x - cx, y - cy) < 260;
    if (hit) continue;
    a.fillStyle = 'rgba(255,255,255,0.9)';
    a.beginPath();
    a.arc(x, y, r, 0, Math.PI * 2);
    a.fill();
    if (R() > 0.4) {
      m.fillStyle = '#fff';
      m.beginPath();
      m.arc(x, y, r, 0, Math.PI * 2);
      m.fill();
    }
  }
  // puffy flower border
  const cols = ['#b9a4f0', '#ffd166', '#ffffff', '#f7a8c8', '#9ad0f5', '#ffb38a', '#c8f0a8'];
  const flowers = [];
  for (let i = 0; i < 34; i++) flowers.push([20 + R() * 960, 845 + R() * 120, 20 + R() * 22, cols[(R() * cols.length) | 0], R() * 6]);
  flowers.sort((p, q) => p[1] - q[1]);
  for (const [x, y, r] of flowers) {
    a.fillStyle = '#6dbb83';
    for (const s of [-1, 1]) {
      a.save();
      a.translate(x, y);
      a.rotate(s * 0.9 + 1.57);
      leafPath(a, r * 1.5, r * 0.45);
      a.fill();
      a.restore();
    }
  }
  for (const [x, y, r, col, rot] of flowers) {
    a.save();
    a.shadowColor = 'rgba(80,0,30,0.35)';
    a.shadowBlur = 8;
    a.shadowOffsetY = 3;
    for (let k = 0; k < 5; k++) {
      const an = rot + (k * Math.PI * 2) / 5;
      const px = x + Math.cos(an) * r * 0.55, py = y + Math.sin(an) * r * 0.55;
      const g = a.createRadialGradient(px - r * 0.15, py - r * 0.2, 1, px, py, r * 0.5);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, col);
      g.addColorStop(1, col);
      a.fillStyle = g;
      a.beginPath();
      a.arc(px, py, r * 0.47, 0, Math.PI * 2);
      a.fill();
    }
    a.restore();
    for (const c of [a, m]) {
      c.fillStyle = c === a ? '#f4f4f8' : '#fff';
      c.beginPath();
      c.arc(x, y, r * 0.24, 0, Math.PI * 2);
      c.fill();
    }
  }
  return { art, mask, layers: life };
}

function congratsCard() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#1c2541');
  const R = rng(77);
  speckle(a, W, H, 3000, ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0.12)'], 1.5, R);
  const gold = '#d8b664';
  const draw = (fn) => {
    for (const c of [a, m]) {
      c.save();
      c.fillStyle = c.strokeStyle = c === a ? gold : '#fff';
      fn(c);
      c.restore();
    }
  };
  draw((c) => {
    c.lineWidth = 3;
    c.strokeRect(50, 50, W - 100, H - 100);
    c.lineWidth = 1.5;
    c.strokeRect(66, 66, W - 132, H - 132);
  });
  const sparks = [];
  for (let i = 0; i < 190; i++) {
    const x = 90 + R() * (W - 180), y = 90 + R() * (H - 180);
    if (y > 440 && y < 900) continue;
    const kind = R(), rot = R() * Math.PI;
    if (kind >= 0.88) {
      sparks.push([x, y, 10 + R() * 8]);
      continue;
    }
    draw((c) => {
      c.translate(x, y);
      c.rotate(rot);
      if (kind < 0.4) c.fillRect(-4, -12, 8 + R() * 6, 18 + R() * 16);
      else if (kind < 0.7) {
        c.beginPath();
        c.arc(0, 0, 4 + R() * 6, 0, Math.PI * 2);
        c.fill();
      } else if (kind < 0.88) {
        c.lineWidth = 4;
        c.lineCap = 'round';
        c.beginPath();
        for (let t = 0; t <= 1; t += 0.1) c.lineTo(t * 44 - 22, Math.sin(t * Math.PI * 3) * 6);
        c.stroke();
      } else {
        sparklePath(c, 0, 0, 10 + R() * 8);
        c.fill();
      }
    });
  }
  draw((c) => {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '400 236px "Great Vibes"';
    c.fillText('Congrats!', W / 2, 660);
    c.font = '600 44px "Cormorant Garamond"';
    spacedText(c, '& CHEERS TO YOU', W / 2, 820, 9);
  });
  const life = [];
  sparks.forEach(([x, y, r], i) =>
    liveEl(life, [x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8], [x, y], { type: 'glint', amp: 0.3, speed: 2 + (i % 3) * 0.6, ph: i * 1.9 }, (a2, m2) => {
      for (const c of [a2, m2]) {
        c.fillStyle = c === a2 ? gold : '#fff';
        sparklePath(c, x, y, r);
        c.fill();
      }
    }, { z: 0.003 })
  );
  // foil confetti tumbling down over the card
  const kinds = ['rect', 'rect', 'dot', 'star'];
  for (let i = 0; i < 18; i++) {
    const x = 110 + ((i * 397) % 780);
    addSprite(life, bitSprite(kinds[i % 4], 10 + (i % 3) * 3, gold), x, 700, { type: 'fall', range: 1250, speed: 0.045 + (i % 5) * 0.008, ph: i / 18, amp: 30, flip: true }, { z: 0.012 });
  }
  return { art, mask, layers: life };
}

function lovelyCard() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#f8f6f1');
  const R = rng(3);
  speckle(a, W, H, 2000, ['rgba(120,100,80,0.05)', 'rgba(255,255,255,0.4)'], 1.3, R);
  for (const c of [a, m]) {
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = c === a ? '#b8923f' : '#fff';
    c.font = '600 132px "Playfair Display"';
    c.fillText('You’re', W / 2, 300);
    c.fillText('absolutely', W / 2, 450);
    c.fillText('lovely', W / 2, 600);
    c.restore();
  }
  // meadow, back to front
  const life = [];
  const greens = ['#5f9a4e', '#79b35c', '#4d8a45', '#8cc06a', '#3f7a3d'];
  for (let layer = 0; layer < 3; layer++) {
    const top = 930 + layer * 70;
    for (let i = 0; i < 330; i++) {
      const x = R() * W, h = 120 + R() * 300 - layer * 30;
      a.strokeStyle = greens[(R() * greens.length) | 0];
      a.globalAlpha = 0.75 + layer * 0.08;
      a.lineWidth = 2 + R() * 3;
      a.lineCap = 'round';
      a.beginPath();
      a.moveTo(x, H + 10);
      a.quadraticCurveTo(x + (R() - 0.5) * 50, H - h * 0.5, x + (R() - 0.5) * 70, Math.max(top - 60, H - h));
      a.stroke();
    }
    a.globalAlpha = 1;
    const n = 26 + layer * 6;
    for (let i = 0; i < n; i++) {
      const x = 20 + R() * (W - 40);
      const y = top + R() * 160 + layer * 20;
      const s = (0.7 + layer * 0.2) * (0.8 + R() * 0.5);
      const kind = R();
      const paint = (a) => {
      a.strokeStyle = '#4f8c47';
      a.lineWidth = 3 * s;
      a.beginPath();
      a.moveTo(x, H + 10);
      a.quadraticCurveTo(x + (R() - 0.5) * 30, (y + H) / 2, x, y);
      a.stroke();
      if (kind < 0.3) {
        // tulip
        const col = ['#f27aa6', '#e5484d', '#f6b73c', '#f59ec0'][(R() * 4) | 0];
        a.save();
        a.translate(x, y);
        for (const [dx, rot] of [[-10, -0.25], [10, 0.25], [0, 0]]) {
          const g = a.createLinearGradient(0, -40 * s, 0, 20 * s);
          g.addColorStop(0, '#ffe3ec');
          g.addColorStop(0.4, col);
          g.addColorStop(1, col);
          a.fillStyle = g;
          a.save();
          a.rotate(rot);
          a.beginPath();
          a.ellipse(dx * s * 0.6, -14 * s, 15 * s, 30 * s, 0, 0, Math.PI * 2);
          a.fill();
          a.restore();
        }
        a.restore();
      } else if (kind < 0.55) {
        // daisy
        a.save();
        a.translate(x, y);
        a.fillStyle = '#ffffff';
        a.shadowColor = 'rgba(0,0,0,0.12)';
        a.shadowBlur = 3;
        for (let k = 0; k < 12; k++) {
          a.save();
          a.rotate((k / 12) * Math.PI * 2);
          a.beginPath();
          a.ellipse(14 * s, 0, 12 * s, 4.5 * s, 0, 0, Math.PI * 2);
          a.fill();
          a.restore();
        }
        a.shadowBlur = 0;
        a.fillStyle = '#f2b632';
        a.beginPath();
        a.arc(0, 0, 7 * s, 0, Math.PI * 2);
        a.fill();
        a.restore();
      } else if (kind < 0.8) {
        // lavender / iris spike
        const col = ['#8a72d8', '#a68ae6', '#6f5cc4'][(R() * 3) | 0];
        for (let k = 0; k < 9; k++) {
          a.fillStyle = col;
          a.globalAlpha = 0.85;
          a.beginPath();
          a.ellipse(x + (k % 2 ? 5 : -5) * s, y - k * 9 * s, 6 * s, 9 * s, k % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
          a.fill();
        }
        a.globalAlpha = 1;
      } else {
        // buttercup
        a.save();
        a.translate(x, y);
        a.fillStyle = '#f7d046';
        for (let k = 0; k < 5; k++) {
          const an = (k / 5) * Math.PI * 2;
          a.beginPath();
          a.arc(Math.cos(an) * 7 * s, Math.sin(an) * 7 * s, 7 * s, 0, Math.PI * 2);
          a.fill();
        }
        a.fillStyle = '#e59a1c';
        a.beginPath();
        a.arc(0, 0, 4 * s, 0, Math.PI * 2);
        a.fill();
        a.restore();
      }
      };
      // the front two rows of flowers sway in a breeze, rooted where they meet the ground
      if (layer >= 1)
        liveEl(life, [x - 70, y - 120 * s - 20, 140, H + 20 - (y - 120 * s - 20)], [x, H + 10], { type: 'sway', amp: 0.03 + layer * 0.008, speed: 0.9 + (i % 5) * 0.12, ph: x * 0.012 }, (a2) => paint(a2), { z: 0.001 + layer * 0.0006, inside: false });
      else paint(a);
    }
  }
  addSprite(life, butterflySprite(), 790, 760, { type: 'flutter', ph: 0.5, range: 50 }, { scale: 0.36, rot: 0.3 });
  addSprite(life, butterflySprite(GOLD_WINGS), 200, 820, { type: 'flutter', ph: 2.4, range: 46 }, { scale: 0.32, rot: -0.3 });
  return { art, mask, layers: life };
}

export const BASE_PRESETS = [
  {
    id: 'lovely', name: 'Absolutely lovely', cat: 'Everyday', build: lovelyCard,
    settings: { shape: 'asis', mode: 'designed', foil: 'gold', finish: 'mirror', paper: '#f7f5f0', paperTex: 'cotton', emboss: 0.65, picEmboss: 0.1, insideCover: 'plain', motif: 'heart', fx: 'butterflies', letter: 'Just a little note\nto say you make\nevery day brighter.\n\n— with love' },
  },
  {
    id: 'stars', name: 'Sky full of stars', cat: 'Everyday', build: starsCard,
    settings: { shape: 'square', mode: 'designed', foil: 'gold', finish: 'glitter', paper: '#efe2c6', paperTex: 'cotton', emboss: 0.75, picEmboss: 0, insideCover: 'mirror', motif: 'star', fx: 'stars', letter: 'Wishing you\na sky full\nof stars.' },
  },
  {
    id: 'blossom', name: 'Blossom die-cut', cat: 'Love', build: blossomDieCut,
    settings: { shape: 'diecut', mode: 'designed', foil: 'pink', finish: 'glitter', paper: '#f7f5f0', paperTex: 'smooth', emboss: 0.7, picEmboss: 0.35, insideCover: 'mirror', motif: 'card', fx: 'petals', letter: 'Some people\nfeel like spring.\nYou do.' },
  },
  {
    id: 'lily', name: 'Lily lines', cat: 'Thanks & care', build: lilyCard,
    settings: { shape: 'asis', mode: 'designed', foil: 'rose', finish: 'mirror', paper: '#ebe6e2', paperTex: 'linen', emboss: 0.6, picEmboss: 0, insideCover: 'mirror', motif: 'card', fx: 'petals', letter: 'Thank you for\nevery little\nkindness.' },
  },
  {
    id: 'moon', name: 'Out of this world', cat: 'Everyday', build: moonCard,
    settings: { shape: 'square', mode: 'designed', foil: 'silver', finish: 'mirror', paper: '#df4a7f', paperTex: 'felt', emboss: 0.7, picEmboss: 0.25, insideCover: 'mirror', motif: 'sparkle', fx: 'stars', letter: 'Someone thinks\nyou\u2019re truly\nout of this world.' },
  },
  {
    id: 'bloom', name: 'Bloom', cat: 'Everyday', build: bloomCard,
    settings: { shape: 'square', mode: 'designed', foil: 'copper', finish: 'satin', paper: '#f7f2ee', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.15, insideCover: 'impression', motif: 'flower', fx: 'petals', letter: 'Grow at your own pace.\nYou\u2019re blooming\nbeautifully.' },
  },
  {
    id: 'congrats', name: 'Congrats', cat: 'Celebrate', build: congratsCard,
    settings: { shape: 'asis', mode: 'designed', foil: 'gold', finish: 'mirror', paper: '#1c2541', paperTex: 'smooth', emboss: 0.55, picEmboss: 0, insideCover: 'plain', motif: 'star', fx: 'confetti', letter: 'Here\u2019s to you\nand everything\nthat comes next!' },
  },
];
