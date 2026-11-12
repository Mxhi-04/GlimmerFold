// Occasion cards. Every design is drawn in code twice over: the printed artwork, and a white-on-black
// "as designed" foil mask, so each card arrives with its own foil stamping.
import { roundStar, sparklePath, heartPath, crescent, starPath } from './shapes.js';
import { rng, pair, speckle, spacedText, petalPath, leafPath, blossom } from './presets.js';
import { happyCatLive } from './livecat.js';
import { liveEl, addSprite, butterflySprite, sparkleSprite, bitSprite, batSprite, zSprite, BLUE_WINGS, GOLD_WINGS } from './life.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- helpers
function hex(c) {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// t > 0 lightens towards white, t < 0 darkens towards black
function shade(c, t) {
  const [r, g, b] = hex(c);
  const f = (v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function grain(a, w, h, seed, dark) {
  speckle(a, w, h, Math.round((w * h) / 380), dark ? ['rgba(255,255,255,0.035)', 'rgba(0,0,0,0.14)'] : ['rgba(90,70,50,0.05)', 'rgba(255,255,255,0.35)'], 1.3, rng(seed));
}

// draw on art and mask; fn(ctx, isMask)
function dual(a, m, fn) {
  a.save();
  fn(a, false);
  a.restore();
  m.save();
  fn(m, true);
  m.restore();
}

function words(a, m, text, x, y, font, color, o = {}) {
  const targets = o.artOnly ? [a] : o.maskOnly ? [m] : [a, m];
  if (!o.artOnly && m.canvas._text) targets.push(m.canvas._text.getContext('2d'));
  for (const c of targets) {
    c.save();
    c.font = font;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = c === a ? color : '#fff';
    if (o.spacing) spacedText(c, text, x, y, o.spacing);
    else c.fillText(text, x, y);
    c.restore();
  }
}

function eggPath(c, x, y, rx, ry) {
  c.beginPath();
  c.ellipse(x, y, rx, ry * 1.18, 0, Math.PI, TAU);
  c.ellipse(x, y, rx, ry * 0.9, 0, 0, Math.PI);
  c.closePath();
}

function cloud(c, x, y, s, fill, shadow) {
  c.save();
  if (shadow) {
    c.shadowColor = shadow;
    c.shadowBlur = s * 0.25;
    c.shadowOffsetY = s * 0.06;
  }
  c.fillStyle = fill;
  c.beginPath();
  for (const [dx, dy, r] of [[-0.9, 0.15, 0.45], [-0.45, -0.2, 0.6], [0.15, -0.38, 0.72], [0.75, -0.1, 0.55], [1.15, 0.2, 0.4], [0.1, 0.22, 0.55]]) {
    c.moveTo(x + dx * s + r * s, y + dy * s);
    c.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
  }
  c.fill();
  c.restore();
}

function hollyLeaf(c, L, W) {
  c.beginPath();
  c.moveTo(0, 0);
  const n = 4;
  for (let i = 1; i <= n; i++) {
    const t0 = (i - 1) / n, t1 = i / n;
    const w0 = Math.sin(t0 * Math.PI) * W, w1 = Math.sin(t1 * Math.PI) * W;
    c.quadraticCurveTo(L * (t0 + t1) / 2, -(w0 + w1) * 0.32, L * t1, -w1 - (i < n ? W * 0.18 : 0));
  }
  for (let i = n; i >= 1; i--) {
    const t0 = i / n, t1 = (i - 1) / n;
    const w0 = Math.sin(t0 * Math.PI) * W, w1 = Math.sin(t1 * Math.PI) * W;
    c.quadraticCurveTo(L * (t0 + t1) / 2, (w0 + w1) * 0.32, L * t1, w1 + (i > 1 ? W * 0.18 : 0));
  }
  c.closePath();
}

function mapleLeaf(c, s) {
  c.beginPath();
  for (let i = 0; i <= 160; i++) {
    const th = (i / 160) * TAU;
    const lobe = Math.abs(Math.cos(th * 2.5));
    const r = s * (0.32 + 0.68 * Math.pow(lobe, 0.55)) * (1 - 0.07 * Math.abs(Math.sin(th * 18)));
    const a = th - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * (th > Math.PI * 0.85 && th < Math.PI * 1.15 ? 0.6 : 1);
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

function snowflake(c, x, y, r, lw) {
  c.save();
  c.translate(x, y);
  c.lineCap = 'round';
  c.lineWidth = lw;
  for (let k = 0; k < 6; k++) {
    c.rotate(TAU / 6);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -r);
    for (const t of [0.45, 0.72]) {
      const b = r * (0.36 - t * 0.18);
      c.moveTo(0, -r * t);
      c.lineTo(-b, -r * t - b);
      c.moveTo(0, -r * t);
      c.lineTo(b, -r * t - b);
    }
    c.stroke();
  }
  c.restore();
}

function bat(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y - s * 0.12);
  c.lineTo(x - s * 0.08, y - s * 0.3);
  c.lineTo(x - s * 0.12, y - s * 0.12);
  c.quadraticCurveTo(x - s * 0.45, y - s * 0.45, x - s, y - s * 0.25);
  c.quadraticCurveTo(x - s * 0.82, y - s * 0.02, x - s * 0.86, y + s * 0.18);
  c.quadraticCurveTo(x - s * 0.66, y + s * 0.02, x - s * 0.52, y + s * 0.2);
  c.quadraticCurveTo(x - s * 0.34, y + s * 0.04, x - s * 0.14, y + s * 0.26);
  c.quadraticCurveTo(x, y + s * 0.12, x + s * 0.14, y + s * 0.26);
  c.quadraticCurveTo(x + s * 0.34, y + s * 0.04, x + s * 0.52, y + s * 0.2);
  c.quadraticCurveTo(x + s * 0.66, y + s * 0.02, x + s * 0.86, y + s * 0.18);
  c.quadraticCurveTo(x + s * 0.82, y - s * 0.02, x + s, y - s * 0.25);
  c.quadraticCurveTo(x + s * 0.45, y - s * 0.45, x + s * 0.12, y - s * 0.12);
  c.lineTo(x + s * 0.08, y - s * 0.3);
  c.closePath();
}

// a branch with alternating leaves along a curve
function sprig(a, m, x, y, len, ang, o) {
  const R = rng((x * 7 + y * 3) | 0);
  const bend = o.bend ?? 0.25;
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const aa = ang + Math.sin(t * Math.PI) * bend;
    const px = x + Math.cos(aa) * len * t, py = y + Math.sin(aa) * len * t;
    pts.push([px, py, aa]);
  }
  dual(a, m, (c, mk) => {
    if (mk && !o.maskStem) return;
    c.strokeStyle = mk ? '#fff' : o.stem;
    c.lineWidth = mk ? 4 : 3.5;
    c.lineCap = 'round';
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.stroke();
  });
  const n = o.leaves || 8;
  for (let i = 1; i <= n; i++) {
    const [px, py, aa] = pts[Math.min(20, Math.round((i / (n + 0.6)) * 20))];
    const side = i % 2 ? 1 : -1;
    const L = (o.size || 40) * (1.05 - (i / n) * 0.45) * (0.85 + R() * 0.3);
    a.save();
    a.translate(px, py);
    a.rotate(aa + side * (0.75 + R() * 0.2));
    if (o.round) {
      a.beginPath();
      a.ellipse(L * 0.55, 0, L * 0.5, L * 0.42, 0, 0, TAU);
    } else leafPath(a, L, L * 0.32);
    const g = a.createLinearGradient(0, -L * 0.3, 0, L * 0.3);
    const col = o.colors[(R() * o.colors.length) | 0];
    g.addColorStop(0, shade(col, 0.2));
    g.addColorStop(1, shade(col, -0.15));
    a.fillStyle = g;
    a.fill();
    a.strokeStyle = shade(col, -0.35);
    a.lineWidth = 1.5;
    a.stroke();
    a.restore();
    if (o.maskLeaves) {
      m.save();
      m.translate(px, py);
      m.rotate(aa + side * 0.85);
      m.strokeStyle = '#fff';
      m.lineWidth = 3;
      if (o.round) {
        m.beginPath();
        m.ellipse(L * 0.55, 0, L * 0.5, L * 0.42, 0, 0, TAU);
      } else leafPath(m, L, L * 0.32);
      m.stroke();
      m.restore();
    }
  }
}

function balloon(a, m, x, y, rx, ry, col) {
  a.save();
  a.shadowColor = 'rgba(0,0,0,0.12)';
  a.shadowBlur = 18;
  a.shadowOffsetY = 8;
  const g = a.createRadialGradient(x - rx * 0.35, y - ry * 0.42, rx * 0.05, x, y, ry * 1.08);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.16, shade(col, 0.35));
  g.addColorStop(0.62, col);
  g.addColorStop(1, shade(col, -0.25));
  a.fillStyle = g;
  a.beginPath();
  a.ellipse(x, y, rx, ry, 0, 0, TAU);
  a.fill();
  a.restore();
  a.save();
  a.fillStyle = shade(col, -0.2);
  a.beginPath();
  a.moveTo(x, y + ry - 6);
  a.lineTo(x - 13, y + ry + 16);
  a.lineTo(x + 13, y + ry + 16);
  a.closePath();
  a.fill();
  a.globalAlpha = 0.75;
  a.fillStyle = '#fff';
  a.beginPath();
  a.ellipse(x - rx * 0.42, y - ry * 0.4, rx * 0.11, ry * 0.2, -0.5, 0, TAU);
  a.fill();
  a.restore();
  m.save();
  m.strokeStyle = '#fff';
  m.lineWidth = 4;
  m.beginPath();
  m.ellipse(x, y, rx, ry, 0, 0, TAU);
  m.stroke();
  m.restore();
}

function bow(a, m, x, y, s, col) {
  dual(a, m, (c, mk) => {
    c.translate(x, y);
    c.lineJoin = 'round';
    const loops = () => {
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(-s * 0.6, -s * 0.7, -s * 1.25, -s * 0.2, -s * 0.85, s * 0.18);
      c.bezierCurveTo(-s * 0.6, s * 0.38, -s * 0.2, s * 0.1, 0, 0);
      c.moveTo(0, 0);
      c.bezierCurveTo(s * 0.6, -s * 0.7, s * 1.25, -s * 0.2, s * 0.85, s * 0.18);
      c.bezierCurveTo(s * 0.6, s * 0.38, s * 0.2, s * 0.1, 0, 0);
      c.moveTo(-s * 0.05, s * 0.05);
      c.quadraticCurveTo(-s * 0.3, s * 0.6, -s * 0.55, s * 1.1);
      c.lineTo(-s * 0.32, s * 1.0);
      c.quadraticCurveTo(-s * 0.12, s * 0.55, s * 0.02, s * 0.08);
      c.moveTo(s * 0.05, s * 0.05);
      c.quadraticCurveTo(s * 0.3, s * 0.6, s * 0.5, s * 1.12);
      c.lineTo(s * 0.7, s * 1.0);
      c.quadraticCurveTo(s * 0.4, s * 0.55, s * 0.08, s * 0.05);
    };
    loops();
    if (mk) {
      c.strokeStyle = '#fff';
      c.lineWidth = 4;
      c.stroke();
    } else {
      const g = c.createLinearGradient(-s, -s, s, s);
      g.addColorStop(0, shade(col, 0.25));
      g.addColorStop(1, shade(col, -0.2));
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = shade(col, -0.35);
      c.lineWidth = 2;
      c.stroke();
    }
    c.beginPath();
    c.ellipse(0, 0, s * 0.16, s * 0.13, 0, 0, TAU);
    c.fillStyle = mk ? '#fff' : shade(col, -0.1);
    c.fill();
  });
}

function confettiDots(a, m, W, H, R, colors, n, maskShare = 0.5, avoid) {
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H;
    if (avoid && avoid(x, y)) continue;
    const col = colors[(R() * colors.length) | 0], rot = R() * Math.PI, kind = R();
    const toMask = R() < maskShare;
    for (const c of toMask ? [a, m] : [a]) {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = c === a ? col : '#fff';
      if (kind < 0.45) c.fillRect(-4, -9, 8, 18);
      else if (kind < 0.85) {
        c.beginPath();
        c.arc(0, 0, 4 + (i % 4), 0, TAU);
        c.fill();
      } else {
        sparklePath(c, 0, 0, 12);
        c.fill();
      }
      c.restore();
    }
  }
}

// ---------------------------------------------------------------- designs
function birthdayBalloons() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#fbf3ea');
  grain(a, W, H, 101);
  const R = rng(101);
  confettiDots(a, m, W, H, R, ['#f59fb4', '#ffd166', '#8ecae6', '#b9a4f0', '#c9a24a'], 90, 0.4, (x, y) => y > 1000 && y < 1270);
  const kx = 500, ky = 900;
  const bl = [[330, 330, '#f59fb4'], [530, 240, '#ffd166'], [710, 350, '#8ecae6'], [430, 500, '#b9a4f0'], [630, 520, '#8fd3b6'], [250, 580, '#ffb38a'], [770, 610, '#f7a8c8']];
  const life = [];
  // each balloon (with its string) swings from the knot
  bl.forEach(([x, y, col], i) => {
    const x0 = Math.min(x - 110, kx - 20), x1 = Math.max(x + 110, kx + 20);
    liveEl(life, [x0, y - 140, x1 - x0, ky - y + 160], [kx, ky], { type: 'sway', amp: 0.045, speed: 0.8 + (i % 4) * 0.15, ph: i * 1.3 }, (a2, m2) => {
      dual(a2, m2, (c, mk) => {
        c.strokeStyle = mk ? '#fff' : '#c9a24a';
        c.lineWidth = mk ? 4 : 2.5;
        c.beginPath();
        c.moveTo(x, y + 132);
        c.bezierCurveTo(x + 30, y + 300, kx + (x - kx) * 0.25, ky - 150, kx, ky);
        c.stroke();
      });
      balloon(a2, m2, x, y, 92, 118, col);
    }, { z: 0.002 + i * 0.0003 });
  });
  liveEl(life, [kx - 90, ky - 60, 180, 140], [kx, ky], { type: 'sway', amp: 0.05, speed: 1.6 }, (a2, m2) => bow(a2, m2, kx, ky, 54, '#e9b44c'), { z: 0.0045 });
  words(a, m, 'Happy', 500, 1065, '400 120px "Great Vibes"', '#c39a3e');
  words(a, m, 'Birthday', 500, 1190, '400 160px "Great Vibes"', '#c39a3e');
  return { art, mask, layers: life };
}

function birthdayCake() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#f3ebf6');
  grain(a, W, H, 102);
  const R = rng(102);
  const life = [];
  words(a, m, 'Make a wish', 500, 210, '400 118px Pacifico', '#c48b3a');
  // plate
  a.fillStyle = '#e7dceb';
  a.beginPath();
  a.ellipse(500, 1190, 360, 46, 0, 0, TAU);
  a.fill();
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#c9a24a';
    c.lineWidth = 5;
    c.beginPath();
    c.ellipse(500, 1190, 360, 46, 0, 0, TAU);
    c.stroke();
  });
  const tiers = [[230, 770, 920, 1180, '#f6bfcd'], [300, 700, 700, 920, '#fdf0d5'], [370, 630, 520, 700, '#bfe5d6']];
  for (const [x0, x1, y0, y1, col] of tiers) {
    const g = a.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, shade(col, -0.12));
    g.addColorStop(0.4, shade(col, 0.15));
    g.addColorStop(1, shade(col, -0.18));
    a.fillStyle = g;
    a.beginPath();
    a.roundRect(x0, y0, x1 - x0, y1 - y0, 14);
    a.fill();
    // sprinkles
    for (let i = 0; i < 26; i++) {
      a.save();
      a.translate(x0 + 20 + R() * (x1 - x0 - 40), y0 + 60 + R() * (y1 - y0 - 80));
      a.rotate(R() * Math.PI);
      a.fillStyle = ['#ff7aa2', '#ffd166', '#7bc8f6', '#9d7bea', '#ffffff'][(R() * 5) | 0];
      a.fillRect(-2.5, -7, 5, 14);
      a.restore();
    }
    // dripping frosting
    const drip = (c) => {
      c.beginPath();
      c.moveTo(x0 - 6, y0 - 4);
      c.lineTo(x1 + 6, y0 - 4);
      c.lineTo(x1 + 6, y0 + 18);
      const n = Math.round((x1 - x0) / 42);
      for (let i = n; i > 0; i--) {
        const xa = x0 + ((x1 - x0) * i) / n, xb = x0 + ((x1 - x0) * (i - 1)) / n;
        const d = 22 + ((i * 37) % 5) * 9;
        c.bezierCurveTo(xa - 6, y0 + 18, xa - 4, y0 + d + 20, (xa + xb) / 2 + 3, y0 + d + 18);
        c.bezierCurveTo(xb + 6, y0 + d + 18, xb + 4, y0 + 18, xb, y0 + 16);
      }
      c.lineTo(x0 - 6, y0 + 18);
      c.closePath();
    };
    a.save();
    drip(a);
    a.fillStyle = '#fffaf2';
    a.shadowColor = 'rgba(120,80,90,0.18)';
    a.shadowBlur = 8;
    a.shadowOffsetY = 3;
    a.fill();
    a.restore();
    m.save();
    drip(m);
    m.strokeStyle = '#fff';
    m.lineWidth = 5;
    m.stroke();
    m.restore();
  }
  // candles
  for (let i = 0; i < 5; i++) {
    const x = 410 + i * 45, y = 430;
    a.fillStyle = '#fffaf3';
    a.fillRect(x - 9, y, 18, 92);
    a.save();
    a.beginPath();
    a.rect(x - 9, y, 18, 92);
    a.clip();
    a.strokeStyle = ['#ff7aa2', '#7bc8f6', '#ffd166', '#9d7bea', '#8fd3b6'][i];
    a.lineWidth = 6;
    for (let k = -2; k < 8; k++) {
      a.beginPath();
      a.moveTo(x - 12, y + k * 16);
      a.lineTo(x + 12, y + k * 16 + 12);
      a.stroke();
    }
    a.restore();
    flame(life, x, y - 8, 1, i);
  }
  return { art, mask, layers: life };
}

// a candle flame with its glow, flickering from the wick
function flame(life, x, y, s, i) {
  liveEl(life, [x - 52 * s, y - 100 * s, 104 * s, 112 * s], [x, y], { type: 'flicker', ph: i * 2.3 }, (a, m) => {
    const glow = a.createRadialGradient(x, y - 26 * s, 2, x, y - 26 * s, 50 * s);
    glow.addColorStop(0, 'rgba(255,214,120,0.6)');
    glow.addColorStop(1, 'rgba(255,214,120,0)');
    a.fillStyle = glow;
    a.fillRect(x - 52 * s, y - 100 * s, 104 * s, 112 * s);
    dual(a, m, (c, mk) => {
      c.beginPath();
      c.moveTo(x, y - 54 * s);
      c.quadraticCurveTo(x + 15 * s, y - 20 * s, x, y);
      c.quadraticCurveTo(x - 15 * s, y - 20 * s, x, y - 54 * s);
      if (mk) c.fillStyle = '#fff';
      else {
        const g = c.createLinearGradient(0, y - 54 * s, 0, y);
        g.addColorStop(0, '#ff8a00');
        g.addColorStop(0.35, '#ffb11b');
        g.addColorStop(1, '#fff3c4');
        c.fillStyle = g;
      }
      c.fill();
      if (!mk) {
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.beginPath();
        c.ellipse(x, y - 14 * s, 4 * s, 9 * s, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
  }, { z: 0.003, inside: false });
}

function valentineHearts() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#b3172f');
  grain(a, W, H, 103, true);
  const R = rng(103);
  const probe = document.createElement('canvas').getContext('2d');
  heartPath(probe, 500, 650, 470);
  const pts = [];
  for (let i = 0; i < 2600 && pts.length < 170; i++) {
    const x = 60 + R() * 880, y = 160 + R() * 880;
    if (probe.isPointInPath(x, y)) pts.push([x, y, 16 + R() * 40]);
  }
  pts.sort((p, q) => p[2] - q[2]);
  const cols = ['#ffffff', '#ffd6e0', '#ff8fab', '#f25c84', '#ffc2d1', '#ff4d6d'];
  const life = [];
  // the whole heart of hearts beats
  liveEl(life, [20, 120, 960, 1000], [500, 640], { type: 'pulse', amp: 0.045, speed: 0.75 }, (a, m) => {
  for (const [x, y, s] of pts) {
    const col = cols[(R() * cols.length) | 0];
    const rot = (R() - 0.5) * 0.7;
    const foil = R() < 0.28;
    dual(a, m, (c, mk) => {
      if (mk && !foil) return;
      c.translate(x, y);
      c.rotate(rot);
      heartPath(c, 0, 0, s);
      if (mk) c.fillStyle = '#fff';
      else {
        const g = c.createRadialGradient(-s * 0.3, -s * 0.35, 1, 0, 0, s);
        g.addColorStop(0, shade(col, 0.5));
        g.addColorStop(1, col);
        c.fillStyle = g;
        c.shadowColor = 'rgba(80,0,10,0.35)';
        c.shadowBlur = 6;
        c.shadowOffsetY = 2;
      }
      c.fill();
    });
  }
  }, { z: 0.002 });
  // little hearts drift up off the big one
  [[260, 300, 0], [720, 260, 0.25], [520, 180, 0.5], [820, 520, 0.75], [170, 560, 0.4]].forEach(([x, y, ph], i) =>
    addSprite(life, bitSprite('heart', 14 + (i % 3) * 4, i % 2 ? '#ffd6e0' : '#f3cf86'), x, y, { type: 'float', speed: 0.16, ph, rise: 220, drift: 20 })
  );
  words(a, m, 'Be mine', 500, 1210, '400 190px "Great Vibes"', '#f3cf86');
  return { art, mask, layers: life };
}

function loveLine() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#f3d6d1');
  grain(a, S, S, 104);
  const life = [];
  liveEl(life, [100, 120, 800, 680], [500, 470], { type: 'pulse', amp: 0.04, speed: 0.7 }, (a, m) =>
    dual(a, m, (c, mk) => {
      c.strokeStyle = mk ? '#fff' : '#a8646f';
      c.lineWidth = mk ? 9 : 7;
      c.lineJoin = c.lineCap = 'round';
      heartPath(c, 420, 440, 270);
      c.stroke();
      heartPath(c, 590, 500, 220);
      c.stroke();
      c.beginPath();
      c.moveTo(150, 700);
      c.bezierCurveTo(260, 760, 360, 600, 300, 560);
      c.stroke();
    }), { z: 0.002 });
  [[170, 220, 26], [820, 250, 20], [860, 640, 30], [140, 520, 16]].forEach(([x, y, s], i) =>
    liveEl(life, [x - s * 1.3, y - s * 1.3, s * 2.6, s * 2.6], [x, y], { type: 'bob', amp: 9, speed: 1 + i * 0.2, ph: i * 1.4, rot: 0.15 }, (a, m) =>
      dual(a, m, (c, mk) => {
        heartPath(c, x, y, s);
        c.fillStyle = mk ? '#fff' : '#c9808c';
        c.fill();
      }), { z: 0.003 })
  );
  words(a, m, 'love you', 500, 830, '400 170px Sacramento', '#a8646f');
  words(a, m, 'ALWAYS & FOREVER', 500, 925, '600 34px "Cormorant Garamond"', '#a8646f', { spacing: 8 });
  return { art, mask, layers: life };
}

function wedding() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#f8f5ee');
  grain(a, W, H, 105);
  const cx = 500, cy = 560, r = 300;
  const euc = { stem: '#7c9479', colors: ['#a9bfa8', '#8fa98f', '#c3d2bd', '#9db59c'], round: true, size: 46, leaves: 9, bend: 0.3, maskStem: true };
  const life = [];
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * TAU - Math.PI / 2;
    if (Math.abs(t - Math.PI / 2) < 0.35) continue;
    const sx = cx + Math.cos(t) * r, sy = cy + Math.sin(t) * r;
    liveEl(life, [sx - 220, sy - 220, 440, 440], [sx, sy], { type: 'sway', amp: 0.05, speed: 0.9 + (i % 4) * 0.15, ph: i }, (a2, m2) => sprig(a2, m2, sx, sy, 150, t + Math.PI / 2 + 0.15, euc), { z: 0.0015 + (i % 3) * 0.0003 });
  }
  // rings, floating together
  liveEl(life, [380, 360, 240, 200], [500, 470], { type: 'bob', amp: 7, speed: 0.9, rot: 0.04 }, (a, m) => {
  for (const [x, y] of [[466, 470], [534, 470]])
    dual(a, m, (c, mk) => {
      c.lineWidth = mk ? 15 : 13;
      if (mk) c.strokeStyle = '#fff';
      else {
        const g = c.createLinearGradient(x - 60, y - 60, x + 60, y + 60);
        g.addColorStop(0, '#f6e3a6');
        g.addColorStop(0.5, '#c79c3e');
        g.addColorStop(1, '#f1d687');
        c.strokeStyle = g;
      }
      c.beginPath();
      c.arc(x, y, 58, 0, TAU);
      c.stroke();
    });
  dual(a, m, (c, mk) => {
    c.fillStyle = mk ? '#fff' : '#e6eef5';
    c.beginPath();
    c.moveTo(534, 386);
    c.lineTo(552, 404);
    c.lineTo(534, 426);
    c.lineTo(516, 404);
    c.closePath();
    c.fill();
  });
  }, { z: 0.004 });
  addSprite(life, sparkleSprite(16, '#ffffff'), 556, 388, { type: 'twinkle', ph: 0 }, { z: 0.008 });
  [[300, 300, 11, 1.2], [700, 330, 10, 2.5], [250, 800, 12, 3.6], [760, 780, 11, 4.8]].forEach(([x, y, rr, ph]) => addSprite(life, sparkleSprite(rr, '#f3e3b5'), x, y, { type: 'twinkle', ph }));
  words(a, m, 'JUST MARRIED', 500, 610, '600 48px Cinzel', '#b58b3c', { spacing: 10 });
  words(a, m, 'Mr & Mrs', 500, 1040, '400 140px "Pinyon Script"', '#b58b3c');
  words(a, m, 'HAPPILY EVER AFTER', 500, 1170, '600 34px "Cormorant Garamond"', '#8b8b7a', { spacing: 8 });
  return { art, mask, layers: life };
}

function anniversary() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#1f3d33');
  grain(a, S, S, 106, true);
  const gold = '#d6b25e';
  const life = [];
  for (const side of [-1, 1]) {
    // each laurel branch is one piece that breathes from its base
    liveEl(life, [side < 0 ? 480 : 100, 120, 420, 790], [500, 850], { type: 'sway', amp: 0.018 * side, speed: 0.7, ph: side }, (a, m) => {
    for (let i = 0; i < 17; i++) {
      const t = 0.62 + (i / 17) * 0.86;
      const ang = Math.PI / 2 + side * t * Math.PI * 0.62;
      const x = 500 + Math.cos(ang) * 330, y = 520 + Math.sin(ang) * 330;
      const tang = ang + side * Math.PI / 2;
      for (const off of [-0.55, 0.55])
        dual(a, m, (c, mk) => {
          c.translate(x, y);
          c.rotate(tang + Math.PI + off * side);
          leafPath(c, 56 - i * 1.4, 16);
          c.fillStyle = mk ? '#fff' : gold;
          c.fill();
        });
    }
    dual(a, m, (c, mk) => {
      c.strokeStyle = mk ? '#fff' : gold;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(500, 520, 330, Math.PI / 2 + side * 0.55, Math.PI / 2 + side * 0.62 * Math.PI * 1.5, side < 0);
      c.stroke();
    });
    }, { z: 0.002 });
  }
  words(a, m, 'Happy', 500, 440, '400 130px "Pinyon Script"', gold);
  words(a, m, 'ANNIVERSARY', 500, 565, '600 58px Cinzel', gold, { spacing: 8 });
  liveEl(life, [460, 620, 80, 80], [500, 660], { type: 'pulse', amp: 0.22, speed: 0.8 }, (a, m) =>
    dual(a, m, (c, mk) => {
      heartPath(c, 500, 660, 22);
      c.fillStyle = mk ? '#fff' : gold;
      c.fill();
    }), { z: 0.003 });
  [[330, 300, 12, 0.4], [690, 290, 10, 1.7], [260, 720, 11, 2.9], [740, 740, 13, 4.1], [500, 210, 9, 5.3]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#f1dc9f'), x, y, { type: 'twinkle', ph }));
  return { art, mask, layers: life };
}

function xmasTree() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#1d4a39');
  grain(a, W, H, 107, true);
  const R = rng(107);
  for (let i = 0; i < 160; i++) {
    a.fillStyle = 'rgba(255,255,255,0.7)';
    a.beginPath();
    a.arc(R() * W, R() * H, 1 + R() * 3, 0, TAU);
    a.fill();
  }
  const top = 330, bot = 1000;
  // soft tree body
  a.save();
  a.beginPath();
  a.moveTo(500, top);
  a.lineTo(170, bot);
  a.quadraticCurveTo(500, bot + 60, 830, bot);
  a.closePath();
  const tg = a.createLinearGradient(0, top, 0, bot);
  tg.addColorStop(0, '#2f6e50');
  tg.addColorStop(1, '#245a42');
  a.fillStyle = tg;
  a.fill();
  a.restore();
  for (let i = 0; i < 9; i++) {
    const t0 = 0.08 + (i / 9) * 0.92;
    const y = top + (bot - top) * t0, w = 330 * t0;
    dual(a, m, (c, mk) => {
      c.strokeStyle = mk ? '#fff' : '#d9b45a';
      c.lineWidth = mk ? 6 : 5;
      c.beginPath();
      if (i % 2) {
        c.moveTo(500 - w, y);
        c.quadraticCurveTo(500, y + 70 * t0, 500 + w, y - 26);
      } else {
        c.moveTo(500 + w, y);
        c.quadraticCurveTo(500, y + 70 * t0, 500 - w, y - 26);
      }
      c.stroke();
    });
  }
  const probe = document.createElement('canvas').getContext('2d');
  probe.beginPath();
  probe.moveTo(500, top + 40);
  probe.lineTo(200, bot - 10);
  probe.lineTo(800, bot - 10);
  probe.closePath();
  const life = [];
  for (let i = 0; i < 46; i++) {
    const x = 180 + R() * 640, y = top + R() * (bot - top);
    if (!probe.isPointInPath(x, y)) continue;
    const col = ['#c8102e', '#f4efe6', '#d9b45a', '#8ecae6'][(R() * 4) | 0];
    const r = 10 + R() * 12;
    const foil = col === '#d9b45a' || R() < 0.2;
    // every bauble swings gently from its hook
    liveEl(life, [x - r - 4, y - r - 14, r * 2 + 8, r * 2 + 18], [x, y - r - 10], { type: 'sway', amp: 0.16, speed: 1.4 + (i % 5) * 0.2, ph: i * 0.9 }, (a, m) => {
    a.strokeStyle = 'rgba(217,180,90,0.9)';
    a.lineWidth = 1.5;
    a.beginPath();
    a.moveTo(x, y - r - 10);
    a.lineTo(x, y - r);
    a.stroke();
    dual(a, m, (c, mk) => {
      if (mk && !foil) return;
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      if (mk) c.fillStyle = '#fff';
      else {
        const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.3, col);
        g.addColorStop(1, shade(col, -0.35));
        c.fillStyle = g;
      }
      c.fill();
    });
    }, { z: 0.002 });
  }
  a.fillStyle = '#6b4a2e';
  a.fillRect(465, bot + 18, 70, 70);
  liveEl(life, [400, top - 120, 200, 200], [500, top - 20], { type: 'glint', amp: 0.09, speed: 1.6 }, (a, m) => {
    const g = a.createRadialGradient(500, top - 20, 4, 500, top - 20, 100);
    g.addColorStop(0, 'rgba(255,230,150,0.55)');
    g.addColorStop(1, 'rgba(255,230,150,0)');
    a.fillStyle = g;
    a.fillRect(400, top - 120, 200, 200);
    roundStar(a, 500, top - 20, 62, 0, '#e8c46a');
    roundStar(m, 500, top - 20, 62, 0, '#fff');
  }, { z: 0.004 });
  [[430, 250, 12, 0], [585, 290, 10, 1.4], [520, 210, 8, 2.8]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#fff3c8'), x, y, { type: 'twinkle', ph }, { z: 0.006 }));
  for (let i = 0; i < 16; i++)
    addSprite(life, bitSprite(i % 3 ? 'dot' : 'flake', 5 + (i % 4) * 2.5, '#ffffff', false), 70 + ((i * 331) % 860), 700, { type: 'fall', range: 1400, speed: 0.035 + (i % 5) * 0.007, ph: i / 16, amp: 26 }, { z: 0.012 });
  words(a, m, 'Merry Christmas', 500, 1215, '400 140px "Great Vibes"', '#e3c06b');
  return { art, mask, layers: life };
}

function xmasWreath() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#f6f1e6');
  grain(a, S, S, 108);
  const R = rng(108);
  const cx = 500, cy = 470, r = 270;
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * TAU + R() * 0.1;
    const rr = r + (R() - 0.5) * 70;
    const x = cx + Math.cos(t) * rr, y = cy + Math.sin(t) * rr;
    a.save();
    a.translate(x, y);
    a.rotate(t + Math.PI / 2 + (R() - 0.5) * 1.6);
    hollyLeaf(a, 86, 30);
    const col = ['#1f5c3a', '#2f7a4b', '#3d8f5a', '#245f3f'][(R() * 4) | 0];
    const g = a.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, shade(col, 0.25));
    g.addColorStop(1, shade(col, -0.2));
    a.fillStyle = g;
    a.shadowColor = 'rgba(0,0,0,0.18)';
    a.shadowBlur = 5;
    a.fill();
    a.shadowBlur = 0;
    a.strokeStyle = shade(col, 0.4);
    a.lineWidth = 2;
    a.beginPath();
    a.moveTo(4, 0);
    a.lineTo(80, 0);
    a.stroke();
    a.restore();
  }
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU + 0.2;
    const x = cx + Math.cos(t) * (r + 10), y = cy + Math.sin(t) * (r + 10);
    for (const [dx, dy] of [[0, 0], [16, 8], [4, 18]])
      dual(a, m, (c, mk) => {
        c.beginPath();
        c.arc(x + dx, y + dy, 11, 0, TAU);
        if (mk) {
          c.strokeStyle = '#fff';
          c.lineWidth = 3;
          c.stroke();
          return;
        }
        const g = c.createRadialGradient(x + dx - 4, y + dy - 4, 1, x + dx, y + dy, 11);
        g.addColorStop(0, '#ff8a8a');
        g.addColorStop(1, '#a30d22');
        c.fillStyle = g;
        c.fill();
      });
  }
  const life = [];
  liveEl(life, [380, cy + r - 60, 240, 200], [500, cy + r + 10], { type: 'sway', amp: 0.06, speed: 1.2 }, (a2, m2) => bow(a2, m2, 500, cy + r + 10, 80, '#c8102e'), { z: 0.003 });
  for (let i = 0; i < 14; i++)
    addSprite(life, bitSprite(i % 2 ? 'flake' : 'dot', 6 + (i % 4) * 2.5, '#b9cde0', false), 60 + ((i * 367) % 880), 500, { type: 'fall', range: 1000, speed: 0.04 + (i % 5) * 0.008, ph: i / 14, amp: 22 }, { z: 0.012 });
  words(a, m, 'Merry', 500, 420, '400 120px "Pinyon Script"', '#b58b3c');
  words(a, m, '& Bright', 500, 535, '400 110px "Pinyon Script"', '#b58b3c');
  return { art, mask, layers: life };
}

function winterFlakes() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#dbe7f2');
  grain(a, S, S, 109);
  const R = rng(109);
  const life = [];
  for (let i = 0; i < 34; i++) {
    const x = R() * S, y = R() * S;
    if (y > 470 && y < 720) continue;
    const r = 18 + R() * 62;
    const foil = R() < 0.55;
    // each flake turns slowly, some one way and some the other
    liveEl(life, [x - r - 8, y - r - 8, r * 2 + 16, r * 2 + 16], [x, y], { type: 'spin', speed: (i % 2 ? 1 : -1) * (0.08 + (i % 5) * 0.04), ph: i }, (a, m) => {
      a.save();
      a.shadowColor = 'rgba(70,100,140,0.35)';
      a.shadowBlur = 4;
      a.strokeStyle = '#ffffff';
      snowflake(a, x, y, r, Math.max(2, r * 0.07));
      a.restore();
      if (foil) {
        m.strokeStyle = '#fff';
        snowflake(m, x, y, r, Math.max(2.5, r * 0.08));
      }
    }, { z: 0.002 });
  }
  for (let i = 0; i < 16; i++)
    addSprite(life, bitSprite(i % 3 ? 'dot' : 'flake', 5 + (i % 4) * 2, '#ffffff', false), 50 + ((i * 311) % 900), 500, { type: 'fall', range: 1000, speed: 0.04 + (i % 5) * 0.008, ph: i / 16, amp: 20 }, { z: 0.012 });
  words(a, m, 'Let it snow', 500, 560, '400 150px "Great Vibes"', '#8aa2bb');
  words(a, m, 'SEASON’S GREETINGS', 500, 680, '600 38px Cinzel', '#8aa2bb', { spacing: 8 });
  return { art, mask, layers: life };
}

function newYear() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#141b33');
  grain(a, W, H, 110, true);
  const R = rng(110);
  for (let i = 0; i < 220; i++) {
    a.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.6})`;
    a.beginPath();
    a.arc(R() * W, R() * H, R() * 1.8, 0, TAU);
    a.fill();
  }
  const bursts = [[300, 300, 190], [700, 260, 150], [560, 560, 120], [190, 640, 90], [830, 560, 100]];
  const life = [];
  // each firework blooms, hangs, and fades in turn
  bursts.forEach(([x, y, r], bi) =>
    liveEl(life, [x - r - 10, y - r - 10, r * 2 + 20, r * 2 + 20], [x, y], { type: 'burst', speed: 0.22, ph: bi * 0.21 }, (a, m) =>
    dual(a, m, (c, mk) => {
      c.strokeStyle = c.fillStyle = mk ? '#fff' : '#e2c06c';
      c.lineCap = 'round';
      const n = Math.round(r / 6);
      for (let k = 0; k < n; k++) {
        const t = (k / n) * TAU;
        c.lineWidth = 3.5;
        c.beginPath();
        c.moveTo(x + Math.cos(t) * r * 0.22, y + Math.sin(t) * r * 0.22);
        c.lineTo(x + Math.cos(t) * r * 0.82, y + Math.sin(t) * r * 0.82);
        c.stroke();
        c.beginPath();
        c.arc(x + Math.cos(t) * r * 0.95, y + Math.sin(t) * r * 0.95, 4.5, 0, TAU);
        c.fill();
        if (k % 2) {
          c.beginPath();
          c.arc(x + Math.cos(t + 0.1) * r * 0.55, y + Math.sin(t + 0.1) * r * 0.55, 2.5, 0, TAU);
          c.fill();
        }
      }
    }), { z: 0.003 + bi * 0.0003 })
  );
  [[120, 180, 10, 0.3], [880, 120, 12, 1.5], [430, 120, 8, 2.6], [900, 860, 10, 3.7], [90, 950, 11, 4.9]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#fff3cf'), x, y, { type: 'twinkle', ph }));
  words(a, m, 'Happy', 500, 880, '400 130px "Great Vibes"', '#e2c06c');
  words(a, m, 'New Year', 500, 1020, '400 170px "Great Vibes"', '#e2c06c');
  words(a, m, '2027', 500, 1200, '600 110px Cinzel', '#e2c06c', { spacing: 34 });
  return { art, mask, layers: life };
}

function diwali() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#5a1020');
  grain(a, W, H, 111, true);
  const cx = 500, cy = 450;
  const rings = [[8, 300, '#f28c28'], [12, 250, '#e8457c'], [10, 195, '#f6c344'], [8, 140, '#ff7a3d'], [8, 90, '#e8457c']];
  const life = [];
  // the rangoli turns slowly, like it's being admired
  liveEl(life, [cx - 345, cy - 345, 690, 690], [cx, cy], { type: 'spin', speed: 0.05 }, (a, m) => {
  rings.forEach(([n, r, col], k) => {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + k * 0.2;
      dual(a, m, (c, mk) => {
        c.translate(cx, cy);
        c.rotate(ang);
        c.translate(r * 0.15, 0);
        petalPath(c, r * 0.85, 0.42, false);
        if (mk) {
          c.strokeStyle = '#fff';
          c.lineWidth = 4;
          c.stroke();
        } else {
          const g = c.createRadialGradient(0, 0, 4, 0, 0, r);
          g.addColorStop(0, shade(col, -0.3));
          g.addColorStop(0.6, col);
          g.addColorStop(1, shade(col, 0.3));
          c.fillStyle = g;
          c.fill();
          c.strokeStyle = '#f1c86a';
          c.lineWidth = 2.5;
          c.stroke();
        }
      });
    }
  });
  dual(a, m, (c, mk) => {
    c.fillStyle = mk ? '#fff' : '#f1c86a';
    c.beginPath();
    c.arc(cx, cy, 34, 0, TAU);
    c.fill();
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * TAU;
      c.beginPath();
      c.arc(cx + Math.cos(t) * 330, cy + Math.sin(t) * 330, 6, 0, TAU);
      c.fill();
    }
  });
  }, { z: 0.002 });
  words(a, m, 'Happy Diwali', 500, 880, '400 150px "Great Vibes"', '#f1c86a');
  for (let i = 0; i < 5; i++) {
    const x = 180 + i * 160, y = 1150;
    const glow = a.createRadialGradient(x, y - 60, 4, x, y - 60, 120);
    glow.addColorStop(0, 'rgba(255,190,90,0.55)');
    glow.addColorStop(1, 'rgba(255,190,90,0)');
    a.fillStyle = glow;
    a.fillRect(x - 120, y - 180, 240, 240);
    dual(a, m, (c, mk) => {
      c.beginPath();
      c.moveTo(x - 72, y);
      c.quadraticCurveTo(x, y + 96, x + 72, y);
      c.closePath();
      if (mk) {
        c.strokeStyle = '#fff';
        c.lineWidth = 5;
        c.stroke();
      } else {
        const g = c.createLinearGradient(0, y, 0, y + 60);
        g.addColorStop(0, '#d8743a');
        g.addColorStop(1, '#7a3412');
        c.fillStyle = g;
        c.fill();
        c.fillStyle = '#f1c86a';
        for (let k = -2; k <= 2; k++) {
          c.beginPath();
          c.arc(x + k * 22, y + 22 - Math.abs(k) * 4, 4, 0, TAU);
          c.fill();
        }
      }
      c.beginPath();
      c.ellipse(x, y, 72, 12, 0, 0, TAU);
      c.fillStyle = mk ? '#fff' : '#f1c86a';
      c.fill();
    });
    flame(life, x, y - 8, 1.4, i);
  }
  [[150, 760, 10, 0.4], [860, 740, 12, 1.6], [120, 120, 9, 2.7], [880, 140, 11, 3.9]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#f8d98a'), x, y, { type: 'twinkle', ph }));
  return { art, mask, layers: life };
}

function lantern(a, m, x, y, s, glowCol) {
  const glow = a.createRadialGradient(x, y, 4, x, y, s * 1.6);
  glow.addColorStop(0, glowCol);
  glow.addColorStop(1, 'rgba(255,200,100,0)');
  a.fillStyle = glow;
  a.fillRect(x - s * 1.6, y - s * 1.6, s * 3.2, s * 3.2);
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#e3c06b';
    c.fillStyle = mk ? '#fff' : '#e3c06b';
    c.lineWidth = mk ? 5 : 4;
    c.lineJoin = 'round';
    // cap
    c.beginPath();
    c.moveTo(x - s * 0.45, y - s * 0.75);
    c.quadraticCurveTo(x, y - s * 1.25, x + s * 0.45, y - s * 0.75);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(x, y - s * 1.22, s * 0.09, 0, TAU);
    c.stroke();
    // body
    c.beginPath();
    c.moveTo(x - s * 0.45, y - s * 0.75);
    c.lineTo(x - s * 0.62, y);
    c.lineTo(x - s * 0.45, y + s * 0.75);
    c.lineTo(x + s * 0.45, y + s * 0.75);
    c.lineTo(x + s * 0.62, y);
    c.lineTo(x + s * 0.45, y - s * 0.75);
    c.closePath();
    if (!mk) {
      const g = c.createRadialGradient(x, y, 2, x, y, s * 0.8);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(0.6, '#ffc861');
      g.addColorStop(1, '#d98a2b');
      c.fillStyle = g;
      c.fill();
    }
    c.stroke();
    // window arches
    for (const dx of [-0.27, 0, 0.27]) {
      c.beginPath();
      c.moveTo(x + dx * s - s * 0.09, y + s * 0.5);
      c.lineTo(x + dx * s - s * 0.09, y - s * 0.25);
      c.quadraticCurveTo(x + dx * s, y - s * 0.48, x + dx * s + s * 0.09, y - s * 0.25);
      c.lineTo(x + dx * s + s * 0.09, y + s * 0.5);
      c.lineWidth = mk ? 3 : 2.5;
      c.stroke();
    }
    c.beginPath();
    c.moveTo(x - s * 0.3, y + s * 0.75);
    c.lineTo(x, y + s * 1.1);
    c.lineTo(x + s * 0.3, y + s * 0.75);
    c.fillStyle = mk ? '#fff' : '#e3c06b';
    c.fill();
  });
}

function eid() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#0f4c4f');
  grain(a, W, H, 112, true);
  const R = rng(112);
  const life = [];
  for (let i = 0; i < 26; i++) {
    const x = R() * W, y = R() * 760, s = 5 + R() * 12;
    const spark = R() < 0.5;
    liveEl(life, [x - s - 4, y - s - 4, s * 2 + 8, s * 2 + 8], [x, y], { type: 'glint', amp: 0.3, speed: 1.6 + (i % 4) * 0.4, ph: i * 1.7 }, (a, m) =>
      dual(a, m, (c, mk) => {
        c.fillStyle = mk ? '#fff' : '#e3c06b';
        if (spark) sparklePath(c, x, y, s);
        else starPath(c, x, y, s, s * 0.45, 5);
        c.fill();
      }), { z: 0.002 });
  }
  liveEl(life, [90, 150, 360, 360], [270, 330], { type: 'bob', amp: 8, speed: 0.6, rot: 0.03 }, (a, m) => {
    crescent(a, 270, 330, 170, '#e3c06b');
    crescent(m, 270, 330, 170, '#fff');
  }, { z: 0.003 });
  // lanterns swing on their chains
  [[560, 300, 92], [790, 420, 72], [660, 170, 56]].forEach(([x, len, s], i) =>
    liveEl(life, [x - s * 1.7, 0, s * 3.4, len + s * 1.7], [x, 0], { type: 'sway', amp: 0.035, speed: 0.8 + i * 0.2, ph: i * 1.6 }, (a, m) => {
      dual(a, m, (c, mk) => {
        c.strokeStyle = mk ? '#fff' : '#e3c06b';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, len - s * 1.3);
        c.stroke();
      });
      lantern(a, m, x, len, s, 'rgba(255,205,110,0.45)');
    }, { z: 0.004 + i * 0.0003 })
  );
  words(a, m, 'Eid Mubarak', 500, 960, '400 170px "Great Vibes"', '#e3c06b');
  words(a, m, 'PEACE · JOY · BLESSINGS', 500, 1090, '600 36px Cinzel', '#e3c06b', { spacing: 6 });
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#e3c06b';
    c.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const x = 70 + i * 66, y = 1260;
      c.beginPath();
      c.moveTo(x - 30, y + 30);
      c.lineTo(x - 30, y);
      c.quadraticCurveTo(x, y - 40, x + 30, y);
      c.lineTo(x + 30, y + 30);
      c.stroke();
    }
  });
  return { art, mask, layers: life };
}

function lunarNewYear() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#b3161b');
  grain(a, W, H, 113, true);
  const gold = '#f2c45a';
  // plum branch
  a.strokeStyle = '#4a2a20';
  a.lineCap = 'round';
  a.lineWidth = 14;
  a.beginPath();
  a.moveTo(-10, 880);
  a.bezierCurveTo(160, 820, 260, 720, 420, 700);
  a.moveTo(240, 770);
  a.quadraticCurveTo(280, 660, 250, 600);
  a.stroke();
  const pb = { light: '#ffe3ea', mid: '#ffb3c6', dark: '#e2577c', line: '#c43d63', maskLine: 4, center: '#f6c344', center2: '#e8892a' };
  for (const [x, y, r] of [[420, 700, 44], [250, 600, 38], [140, 840, 40], [330, 735, 32], [60, 870, 30]]) blossom(a, m, x, y, r, r * 0.1, pb);
  // auspicious clouds
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : gold;
    c.lineWidth = 5;
    c.lineCap = 'round';
    for (const [x, y, s] of [[180, 300, 60], [820, 860, 70], [120, 1020, 50]]) {
      c.beginPath();
      for (let t = 0; t < 9; t += 0.1) {
        const r = s * (1 - t / 10);
        c.lineTo(x + Math.cos(t) * r * 0.6 + t * 6, y + Math.sin(t) * r * 0.45);
      }
      c.stroke();
      c.beginPath();
      c.moveTo(x - s, y + s * 0.5);
      c.bezierCurveTo(x - s * 0.2, y + s * 0.7, x + s * 0.8, y + s * 0.3, x + s * 1.8, y + s * 0.55);
      c.stroke();
    }
  });
  const lanterns = [[330, 380, 120, 120], [660, 290, 140, 30], [840, 590, 90, 380]];
  const life = [];
  lanterns.forEach(([x, y, r, top], li) => {
    liveEl(life, [x - r * 1.3, top - 40, r * 2.6, y + r * 1.6 - top + 40], [x, top - 30], { type: 'sway', amp: 0.04, speed: 0.75 + li * 0.18, ph: li * 1.9 }, (a, m) => {
    dual(a, m, (c, mk) => {
      c.strokeStyle = mk ? '#fff' : gold;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, top - 30);
      c.lineTo(x, y - r * 0.85);
      c.stroke();
    });
    a.save();
    const g = a.createRadialGradient(x - r * 0.3, y - r * 0.3, 4, x, y, r * 1.1);
    g.addColorStop(0, '#ff6b5a');
    g.addColorStop(0.7, '#d8211d');
    g.addColorStop(1, '#8e0d0f');
    a.fillStyle = g;
    a.shadowColor = 'rgba(0,0,0,0.3)';
    a.shadowBlur = 14;
    a.beginPath();
    a.ellipse(x, y, r * 1.05, r * 0.82, 0, 0, TAU);
    a.fill();
    a.restore();
    dual(a, m, (c, mk) => {
      c.strokeStyle = c.fillStyle = mk ? '#fff' : gold;
      c.lineWidth = 3;
      for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) {
        c.beginPath();
        c.ellipse(x, y, Math.abs(k) * r * 1.05 + 1, r * 0.82, 0, -Math.PI / 2, Math.PI / 2, k < 0);
        c.stroke();
      }
      c.fillRect(x - r * 0.45, y - r * 0.92, r * 0.9, r * 0.16);
      c.fillRect(x - r * 0.45, y + r * 0.76, r * 0.9, r * 0.16);
      c.lineWidth = 2.5;
      for (let k = -4; k <= 4; k++) {
        c.beginPath();
        c.moveTo(x + k * 4, y + r * 0.92);
        c.lineTo(x + k * 5, y + r * 1.5);
        c.stroke();
      }
    });
    }, { z: 0.003 + li * 0.0004 });
  });
  for (let i = 0; i < 10; i++)
    addSprite(life, bitSprite('dot', 7 + (i % 3) * 2, '#ffc2d1', false), 60 + ((i * 389) % 880), 700, { type: 'fall', range: 1400, speed: 0.035 + (i % 4) * 0.008, ph: i / 10, amp: 40, flip: true }, { z: 0.012 });
  words(a, m, 'Happy', 500, 1080, '400 120px "Great Vibes"', gold);
  words(a, m, 'LUNAR NEW YEAR', 500, 1200, '600 62px Cinzel', gold, { spacing: 6 });
  return { art, mask, layers: life };
}

function easter() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#e1f1e6');
  grain(a, S, S, 114);
  const R = rng(114);
  words(a, m, 'Happy Easter', 500, 200, '400 110px Pacifico', '#c39a3e');
  const eggs = [[320, 590, 140, 170, '#f7c6d0', -0.18], [510, 540, 150, 180, '#c9e4f6', 0.02], [690, 600, 132, 160, '#fde59a', 0.2]];
  const life = [];
  eggs.forEach(([x, y, rx, ry, col, rot], ei) => {
    // eggs wobble on their bottoms, as eggs do
    const bx = x - Math.sin(rot) * ry * 0.88, by = y + Math.cos(rot) * ry * 0.88;
    liveEl(life, [x - rx - 50, y - ry * 1.3 - 30, rx * 2 + 100, ry * 2.4 + 80], [bx, by], { type: 'sway', amp: 0.07, speed: 1.3 + ei * 0.35, ph: ei * 2 }, (a, m) => {
    a.save();
    a.translate(x, y);
    a.rotate(rot);
    a.shadowColor = 'rgba(40,80,50,0.25)';
    a.shadowBlur = 20;
    a.shadowOffsetY = 10;
    eggPath(a, 0, 0, rx, ry);
    const g = a.createRadialGradient(-rx * 0.35, -ry * 0.4, 4, 0, 0, ry * 1.2);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.35, col);
    g.addColorStop(1, shade(col, -0.18));
    a.fillStyle = g;
    a.fill();
    a.restore();
    dual(a, m, (c, mk) => {
      c.translate(x, y);
      c.rotate(rot);
      eggPath(c, 0, 0, rx, ry);
      c.clip();
      c.strokeStyle = mk ? '#fff' : '#ffffff';
      c.fillStyle = mk ? '#fff' : '#d9b45a';
      c.lineWidth = 7;
      c.lineJoin = 'round';
      for (const by of [-ry * 0.45, ry * 0.05, ry * 0.5]) {
        c.beginPath();
        for (let k = -8; k <= 8; k++) c.lineTo(k * rx * 0.16, by + (k % 2 ? -14 : 14));
        c.stroke();
      }
      for (let k = -4; k <= 4; k++) {
        c.beginPath();
        c.arc(k * rx * 0.24, -ry * 0.2, 6, 0, TAU);
        c.arc(k * rx * 0.24 + rx * 0.12, ry * 0.28, 6, 0, TAU);
        c.fill();
      }
    });
    }, { z: 0.002 + ei * 0.0004 });
  });
  for (let i = 0; i < 380; i++) {
    const x = R() * S, h = 40 + R() * 120;
    a.strokeStyle = ['#7cbf7a', '#5fa65e', '#9bd28c'][(R() * 3) | 0];
    a.lineWidth = 2 + R() * 2;
    a.lineCap = 'round';
    a.beginPath();
    a.moveTo(x, S + 5);
    a.quadraticCurveTo(x + (R() - 0.5) * 30, S - h * 0.5, x + (R() - 0.5) * 40, S - h);
    a.stroke();
  }
  const fl = { light: '#ffffff', mid: '#fff1f6', dark: '#f7c6d0', line: '#e59ab0', maskLine: 3, center: '#f6c344', center2: '#e8a52a' };
  for (const [x, y] of [[140, 880], [420, 905], [860, 870], [620, 915]]) blossom(a, m, x, y, 34, 0.3, fl);
  addSprite(life, butterflySprite(GOLD_WINGS), 850, 340, { type: 'flutter', ph: 0.6, range: 44 }, { scale: 0.36, rot: 0.3 });
  addSprite(life, butterflySprite(BLUE_WINGS), 150, 380, { type: 'flutter', ph: 2.2, range: 40 }, { scale: 0.32, rot: -0.3 });
  return { art, mask, layers: life };
}

function tulipHead(c, s) {
  c.beginPath();
  c.moveTo(-s * 0.55, -s * 0.25);
  c.bezierCurveTo(-s * 0.62, s * 0.5, s * 0.62, s * 0.5, s * 0.55, -s * 0.25);
  c.lineTo(s * 0.38, -s * 0.8);
  c.lineTo(s * 0.14, -s * 0.38);
  c.lineTo(0, -s * 0.9);
  c.lineTo(-s * 0.14, -s * 0.38);
  c.lineTo(-s * 0.38, -s * 0.8);
  c.closePath();
}

function mothersDay() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#f8f5f2');
  grain(a, W, H, 115);
  const bx = 500, by = 960;
  const heads = [[330, 470, -0.35, '#f49ab4'], [430, 380, -0.15, '#f7b1a6'], [540, 360, 0.08, '#ef7f9f'], [650, 420, 0.3, '#f9c4b0'], [390, 560, -0.25, '#f6a3c0'], [600, 540, 0.18, '#f28fb0'], [500, 470, 0, '#fbc9d6']];
  // leaves
  for (const [ang, len] of [[-2.2, 330], [-0.9, 320], [-2.5, 240], [-0.6, 250]]) {
    a.save();
    a.translate(bx, by);
    a.rotate(ang);
    leafPath(a, len, 40);
    const g = a.createLinearGradient(0, -40, 0, 40);
    g.addColorStop(0, '#8cc084');
    g.addColorStop(1, '#4e8a4f');
    a.fillStyle = g;
    a.fill();
    a.restore();
  }
  const life = [];
  // each tulip sways on its own stem, gathered at the bow
  heads.forEach(([x, y, rot, col], ti) =>
    liveEl(life, [Math.min(x, bx) - 110, y - 110, Math.abs(x - bx) + 220, by + 170 - (y - 110)], [bx, by + 60], { type: 'sway', amp: 0.025, speed: 0.8 + (ti % 3) * 0.2, ph: ti * 1.1 }, (a, m) => {
    a.strokeStyle = '#5d9a59';
    a.lineWidth = 7;
    a.beginPath();
    a.moveTo(bx, by + 160);
    a.quadraticCurveTo((x + bx) / 2, (y + by) / 2 + 40, x, y + 40);
    a.stroke();
    dual(a, m, (c, mk) => {
      c.translate(x, y);
      c.rotate(rot);
      tulipHead(c, 96);
      c.lineJoin = 'round';
      if (mk) {
        c.strokeStyle = '#fff';
        c.lineWidth = 4;
        c.stroke();
        return;
      }
      const g = c.createLinearGradient(0, -90, 0, 50);
      g.addColorStop(0, shade(col, 0.45));
      g.addColorStop(1, shade(col, -0.12));
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = shade(col, -0.3);
      c.lineWidth = 2.5;
      c.stroke();
      c.beginPath();
      c.moveTo(0, -60);
      c.quadraticCurveTo(-8, 0, 0, 34);
      c.stroke();
    });
    }, { z: 0.002 + ti * 0.0002 })
  );
  liveEl(life, [bx - 110, by - 30, 220, 180], [bx, by + 40], { type: 'sway', amp: 0.03, speed: 1.1 }, (a2, m2) => bow(a2, m2, bx, by + 40, 70, '#f3c3cf'), { z: 0.004 });
  addSprite(life, butterflySprite(), 820, 300, { type: 'flutter', ph: 1.1, range: 46 }, { scale: 0.38, rot: 0.3 });
  words(a, m, 'HAPPY', 500, 1180, '600 50px Cinzel', '#b58b3c', { spacing: 12 });
  words(a, m, 'MOTHER’S DAY', 500, 1260, '600 64px Cinzel', '#b58b3c', { spacing: 8 });
  return { art, mask, layers: life };
}

function fathersDay() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#1f2a44');
  grain(a, W, H, 116, true);
  const R = rng(116);
  for (let i = 0; i < 120; i++) {
    a.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.5})`;
    a.beginPath();
    a.arc(R() * W, R() * 500, R() * 1.8, 0, TAU);
    a.fill();
  }
  const gold = '#d9b45a';
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : gold;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(620, 430, 110, 0, TAU);
    c.stroke();
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * TAU;
      c.beginPath();
      c.moveTo(620 + Math.cos(t) * 135, 430 + Math.sin(t) * 135);
      c.lineTo(620 + Math.cos(t) * (i % 2 ? 160 : 180), 430 + Math.sin(t) * (i % 2 ? 160 : 180));
      c.stroke();
    }
  });
  const ranges = [
    ['#34456a', [[0, 760], [140, 560], [260, 680], [420, 470], [560, 640], [700, 520], [860, 690], [1000, 600]]],
    ['#2a3a5c', [[0, 820], [180, 640], [330, 760], [500, 560], [660, 760], [820, 640], [1000, 780]]],
    ['#22304d', [[0, 900], [220, 740], [400, 860], [600, 700], [800, 860], [1000, 760]]],
  ];
  for (const [col, pts] of ranges) {
    a.fillStyle = col;
    a.beginPath();
    a.moveTo(0, 1000);
    pts.forEach(([x, y]) => a.lineTo(x, y));
    a.lineTo(1000, 1000);
    a.closePath();
    a.fill();
    dual(a, m, (c, mk) => {
      c.strokeStyle = mk ? '#fff' : gold;
      c.lineWidth = 4;
      c.lineJoin = 'round';
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    });
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      if (y > pts[i - 1][1] || y > pts[i + 1][1]) continue;
      a.fillStyle = 'rgba(240,244,255,0.85)';
      a.beginPath();
      a.moveTo(x, y);
      a.lineTo(x - 34, y + 36);
      a.lineTo(x - 12, y + 28);
      a.lineTo(x, y + 42);
      a.lineTo(x + 14, y + 28);
      a.lineTo(x + 34, y + 36);
      a.closePath();
      a.fill();
    }
  }
  a.fillStyle = '#18213a';
  a.fillRect(0, 990, W, 60);
  for (let i = 0; i < 16; i++) {
    const x = i * 66 + (i % 2) * 20, h = 90 + (i % 3) * 30;
    a.fillStyle = '#152036';
    for (let k = 0; k < 3; k++) {
      a.beginPath();
      a.moveTo(x, 1000 - h + k * h * 0.25);
      a.lineTo(x - 34 + k * 4, 1000 - h * 0.45 + k * h * 0.25);
      a.lineTo(x + 34 - k * 4, 1000 - h * 0.45 + k * h * 0.25);
      a.closePath();
      a.fill();
    }
  }
  words(a, m, 'Happy Father’s Day', 500, 1150, '400 110px "Great Vibes"', gold);
  words(a, m, 'YOU MOVE MOUNTAINS', 500, 1260, '600 38px Cinzel', gold, { spacing: 8 });
  const life = [];
  [[120, 120, 14], [300, 220, 10], [430, 90, 12], [860, 140, 13], [900, 330, 9], [210, 380, 11], [760, 250, 8], [80, 300, 9]].forEach(([x, y, r], i) =>
    addSprite(life, bitSprite('star', r, gold), x, y, { type: 'glint', amp: 0.35, speed: 1.4 + (i % 3) * 0.6, ph: i * 1.3 }, { z: 0.003 })
  );
  for (const [x, y, s, ph] of [[230, 260, 70, 0], [800, 420, 56, 2.5]])
    liveEl(life, [x - s * 1.8, y - s, s * 3.8, s * 1.6], [x, y], { type: 'drift', amp: 40, speed: 0.12, ph }, (a2) => cloud(a2, x, y, s, 'rgba(255,255,255,0.16)'), { z: 0.002, inside: false });
  return { art, mask, layers: life };
}

function graduation() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#1b2238');
  grain(a, W, H, 117, true);
  const R = rng(117);
  confettiDots(a, m, W, H, R, ['#e2c06c', '#e2c06c', '#ffffff'], 120, 0.7, (x, y) => (y > 230 && y < 700 && x > 150 && x < 850) || (y > 780 && y < 1050));
  // cap base
  a.save();
  a.beginPath();
  a.moveTo(330, 470);
  a.lineTo(330, 610);
  a.quadraticCurveTo(500, 680, 670, 610);
  a.lineTo(670, 470);
  a.closePath();
  const g = a.createLinearGradient(330, 0, 670, 0);
  g.addColorStop(0, '#0d0f14');
  g.addColorStop(0.5, '#2a2e38');
  g.addColorStop(1, '#0d0f14');
  a.fillStyle = g;
  a.fill();
  a.restore();
  dual(a, m, (c, mk) => {
    c.beginPath();
    c.moveTo(500, 300);
    c.lineTo(830, 430);
    c.lineTo(500, 560);
    c.lineTo(170, 430);
    c.closePath();
    if (!mk) {
      const g2 = c.createLinearGradient(170, 300, 830, 560);
      g2.addColorStop(0, '#2b303c');
      g2.addColorStop(0.5, '#151821');
      g2.addColorStop(1, '#2b303c');
      c.fillStyle = g2;
      c.fill();
    }
    c.strokeStyle = mk ? '#fff' : '#e2c06c';
    c.lineWidth = 5;
    c.lineJoin = 'round';
    c.stroke();
    c.beginPath();
    c.moveTo(500, 430);
    c.quadraticCurveTo(660, 440, 760, 458);
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = mk ? '#fff' : '#e2c06c';
    c.beginPath();
    c.arc(500, 430, 13, 0, TAU);
    c.fill();
  });
  const life = [];
  // the tassel swings from the corner of the cap
  liveEl(life, [700, 440, 120, 320], [760, 458], { type: 'sway', amp: 0.09, speed: 1.5, flick: true }, (a, m) =>
    dual(a, m, (c, mk) => {
      c.strokeStyle = c.fillStyle = mk ? '#fff' : '#e2c06c';
      c.lineWidth = 6;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(760, 458);
      c.lineTo(760, 640);
      c.stroke();
      c.beginPath();
      c.moveTo(748, 630);
      c.lineTo(772, 630);
      c.lineTo(786, 740);
      c.lineTo(734, 740);
      c.closePath();
      c.fill();
      if (!mk) {
        c.strokeStyle = 'rgba(120,90,30,0.5)';
        c.lineWidth = 1.2;
        for (let k = -3; k <= 3; k++) {
          c.beginPath();
          c.moveTo(760 + k * 3, 642);
          c.lineTo(760 + k * 6.5, 738);
          c.stroke();
        }
      }
    }), { z: 0.004 });
  for (let i = 0; i < 18; i++)
    addSprite(life, bitSprite(['rect', 'dot', 'star'][i % 3], 9 + (i % 3) * 3, i % 4 ? '#e2c06c' : '#ffffff', i % 4 !== 0), 90 + ((i * 353) % 820), 700, { type: 'fall', range: 1350, speed: 0.042 + (i % 5) * 0.008, ph: i / 18, amp: 30, flip: true }, { z: 0.012 });
  words(a, m, 'Congrats, Grad!', 500, 860, '400 140px "Great Vibes"', '#e2c06c');
  words(a, m, 'CLASS OF 2027', 500, 990, '600 50px Cinzel', '#e2c06c', { spacing: 10 });
  return { art, mask, layers: life };
}

function newBaby() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#dce9f5');
  grain(a, S, S, 118);
  const life = [];
  [[200, 280, 'star'], [330, 170, 'heart'], [700, 210, 'star'], [820, 320, 'star'], [600, 120, 'star']].forEach(([x, len, kind], hi) =>
    liveEl(life, [x - 40, 0, 80, len + 40], [x, 0], { type: 'sway', amp: 0.05, speed: 0.9 + hi * 0.17, ph: hi * 1.4 }, (a, m) =>
    dual(a, m, (c, mk) => {
      c.strokeStyle = mk ? '#fff' : '#c9a24a';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, len - 26);
      c.stroke();
      c.fillStyle = mk ? '#fff' : '#d9b45a';
      if (kind === 'heart') heartPath(c, x, len, 26);
      else starPath(c, x, len, 30, 13, 5);
      c.fill();
    }), { z: 0.002 })
  );
  liveEl(life, [170, 440, 620, 380], [470, 640], { type: 'drift', amp: 10, speed: 0.3 }, (a2) => cloud(a2, 470, 640, 210, '#ffffff', 'rgba(80,110,150,0.25)'), { z: 0.003 });
  liveEl(life, [360, 290, 300, 320], [520, 450], { type: 'bob', amp: 7, speed: 0.7, rot: 0.05 }, (a, m) =>
  dual(a, m, (c, mk) => {
    c.save();
    c.beginPath();
    c.rect(0, 0, S, S);
    c.arc(520 + 0.42 * 150, 450 - 0.26 * 150, 150 * 0.84, 0, TAU, true);
    c.clip('evenodd');
    c.beginPath();
    c.arc(520, 450, 150, 0, TAU);
    if (mk) {
      c.strokeStyle = '#fff';
      c.lineWidth = 7;
      c.stroke();
    } else {
      const g = c.createLinearGradient(380, 300, 640, 600);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(1, '#f2cf6b');
      c.fillStyle = g;
      c.fill();
    }
    c.restore();
    c.strokeStyle = mk ? '#fff' : '#9a7a3a';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(430, 470, 16, 0.2, Math.PI - 0.2);
    c.stroke();
  }), { z: 0.004 });
  [[40, 0], [52, 0.33], [64, 0.66]].forEach(([size, ph]) => addSprite(life, zSprite(size), 640, 330, { type: 'float', ph, rise: 160 }, { z: 0.01 }));
  words(a, m, 'Welcome, little one', 500, 870, '400 110px Sacramento', '#b58b3c');
  return { art, mask, layers: life };
}

function thankYou() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#d7e0d0');
  grain(a, S, S, 119);
  const leafy = { stem: '#6d8a64', colors: ['#7fa175', '#97b58b', '#5e8457', '#a9c39c'], size: 54, leaves: 10, bend: 0.4, maskStem: true, maskLeaves: true };
  const life = [];
  // the sprigs sway from the corners they grow out of
  [[40, 60, 330, 0.55, leafy], [960, 940, 330, Math.PI + 0.55, leafy], [960, 120, 230, Math.PI - 0.4, { ...leafy, round: true, size: 40 }], [40, 880, 230, -0.4, { ...leafy, round: true, size: 40 }]].forEach(([x, y, len, ang, o], i) =>
    liveEl(life, [x - len - 60, y - len - 60, len * 2 + 120, len * 2 + 120], [x, y], { type: 'sway', amp: 0.035, speed: 0.8 + i * 0.15, ph: i * 1.7 }, (a2, m2) => sprig(a2, m2, x, y, len, ang, o), { z: 0.002 })
  );
  [[250, 320, 11, 0.3], [760, 330, 9, 1.8], [300, 720, 10, 3.1], [700, 700, 12, 4.4]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#f3e3b5'), x, y, { type: 'twinkle', ph }));
  words(a, m, 'Thank you', 500, 480, '400 200px "Pinyon Script"', '#b58b3c');
  words(a, m, 'SO VERY MUCH', 500, 620, '600 40px "Cormorant Garamond"', '#6d8a64', { spacing: 10 });
  return { art, mask, layers: life };
}

function getWell() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#fbecb8');
  grain(a, W, H, 120);
  const life = [];
  // the sun's rays turn slowly
  liveEl(life, [270, 130, 460, 460], [500, 360], { type: 'spin', speed: 0.12 }, (a, m) =>
  dual(a, m, (c, mk) => {
    c.translate(500, 360);
    for (let i = 0; i < 14; i++) {
      c.save();
      c.rotate((i / 14) * TAU);
      c.beginPath();
      c.moveTo(-18, -150);
      c.lineTo(0, -225);
      c.lineTo(18, -150);
      c.closePath();
      c.fillStyle = mk ? '#fff' : '#f29e38';
      c.fill();
      c.restore();
    }
    c.beginPath();
    c.arc(0, 0, 125, 0, TAU);
    if (mk) {
      c.strokeStyle = '#fff';
      c.lineWidth = 8;
      c.stroke();
    } else {
      const g = c.createRadialGradient(-30, -30, 10, 0, 0, 130);
      g.addColorStop(0, '#fff2b3');
      g.addColorStop(1, '#f7b733');
      c.fillStyle = g;
      c.fill();
    }
  }), { z: 0.002 });
  const bands = ['#f58f8f', '#f8b878', '#f9df7a', '#9ed69a', '#8ec5ee', '#b9a4f0'];
  bands.forEach((col, i) => {
    a.strokeStyle = col;
    a.lineWidth = 34;
    a.beginPath();
    a.arc(500, 930, 330 - i * 34, Math.PI, TAU);
    a.stroke();
  });
  for (const [x, ph] of [[190, 0], [800, 2.4]])
    liveEl(life, [x - 210, 820, 420, 200], [x, 930], { type: 'drift', amp: 16, speed: 0.4, ph }, (a2) => cloud(a2, x, 930, 110, '#ffffff', 'rgba(150,120,40,0.25)'), { z: 0.003 });
  words(a, m, 'Get well soon', 500, 1100, '400 110px Pacifico', '#b8762a');
  words(a, m, 'sending sunshine your way', 500, 1215, '500 58px Caveat', '#9a6a2a', { artOnly: true });
  return { art, mask, layers: life };
}

function sympathy() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#e6e3df');
  grain(a, W, H, 121);
  const life = [];
  // the dove glides, slow and calm
  liveEl(life, [90, 260, 810, 530], [520, 600], { type: 'bob', amp: 10, ax: 8, speed: 0.45, rot: 0.025 }, (a, m) =>
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#8a8f96';
    c.lineWidth = mk ? 6 : 5;
    c.lineCap = c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(330, 640);
    c.bezierCurveTo(390, 590, 480, 590, 560, 625);
    c.bezierCurveTo(640, 660, 700, 668, 800, 630);
    c.moveTo(330, 640);
    c.bezierCurveTo(370, 700, 480, 720, 590, 690);
    c.bezierCurveTo(660, 672, 730, 668, 800, 630);
    c.moveTo(800, 630);
    c.lineTo(860, 600);
    c.moveTo(800, 630);
    c.lineTo(870, 640);
    c.moveTo(800, 630);
    c.lineTo(850, 670);
    c.stroke();
    c.beginPath();
    c.arc(318, 615, 36, 0, TAU);
    c.stroke();
    c.beginPath();
    c.moveTo(284, 606);
    c.lineTo(250, 620);
    c.lineTo(286, 630);
    c.stroke();
    c.beginPath();
    c.moveTo(470, 615);
    c.bezierCurveTo(450, 470, 560, 330, 720, 290);
    c.bezierCurveTo(660, 400, 650, 500, 580, 630);
    c.moveTo(520, 610);
    c.bezierCurveTo(530, 500, 600, 420, 700, 360);
    c.moveTo(560, 618);
    c.bezierCurveTo(580, 540, 620, 470, 690, 430);
    c.moveTo(500, 600);
    c.bezierCurveTo(520, 520, 560, 420, 640, 330);
    c.stroke();
    c.beginPath();
    c.moveTo(250, 624);
    c.bezierCurveTo(210, 680, 170, 720, 120, 760);
    c.stroke();
    c.fillStyle = mk ? '#fff' : '#8a8f96';
    c.beginPath();
    c.arc(312, 608, 5, 0, TAU);
    c.fill();
    for (const [t, side] of [[0.2, 1], [0.35, -1], [0.5, 1], [0.65, -1], [0.8, 1]]) {
      const x = 250 - 130 * t, y = 624 + 136 * t;
      c.save();
      c.translate(x, y);
      c.rotate(2.4 + side * 0.9);
      leafPath(c, 46, 13);
      c.stroke();
      c.restore();
    }
    for (const [x, y] of [[205, 700], [160, 735]]) {
      c.beginPath();
      c.ellipse(x, y, 9, 13, 0.4, 0, TAU);
      c.stroke();
    }
  }), { z: 0.003 });
  // a single feather drifting down
  liveEl(life, [610, 760, 60, 110], [640, 815], { type: 'fall', range: 500, speed: 0.05, amp: 50, spin: 0.15 }, (a, m) =>
    dual(a, m, (c, mk) => {
      c.strokeStyle = mk ? '#fff' : '#8a8f96';
      c.lineWidth = mk ? 3 : 2.2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(640, 860);
      c.quadraticCurveTo(636, 815, 642, 770);
      c.stroke();
      c.beginPath();
      c.moveTo(642, 772);
      c.bezierCurveTo(665, 790, 662, 830, 640, 850);
      c.bezierCurveTo(618, 830, 618, 792, 642, 772);
      c.stroke();
    }), { z: 0.006, inside: false });
  words(a, m, 'Thinking of you', 500, 1040, '400 130px "Great Vibes"', '#7d8189');
  words(a, m, 'WITH LOVE & SYMPATHY', 500, 1170, '600 36px "Cormorant Garamond"', '#7d8189', { spacing: 8 });
  return { art, mask, layers: life };
}

function halloween() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#1a1520');
  grain(a, W, H, 122, true);
  const R = rng(122);
  const mg = a.createRadialGradient(470, 400, 20, 500, 430, 240);
  mg.addColorStop(0, '#fbf1cf');
  mg.addColorStop(1, '#e9d499');
  a.fillStyle = mg;
  a.beginPath();
  a.arc(500, 430, 230, 0, TAU);
  a.fill();
  for (let i = 0; i < 9; i++) {
    a.fillStyle = 'rgba(180,150,90,0.18)';
    a.beginPath();
    a.arc(380 + R() * 240, 300 + R() * 260, 12 + R() * 26, 0, TAU);
    a.fill();
  }
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#d48a3c';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(500, 430, 252, 0, TAU);
    c.stroke();
  });
  const life = [];
  // bats beat their wings up off the card as they flit across the moon
  const bs = batSprite();
  [[380, 330, 70], [600, 280, 50], [700, 470, 60], [250, 560, 44], [820, 220, 38]].forEach(([x, y, s], i) =>
    addSprite(life, bs, x, y, { type: 'flutter', ph: i * 1.3, range: 60, beat: 11, lift: 0.9 }, { scale: s / 100, z: 0.008, rot: (i % 2 ? 1 : -1) * 0.12 })
  );
  const px = 500, py = 960;
  for (const [dx, rx] of [[-150, 150], [150, 150], [-70, 170], [70, 170], [0, 180]]) {
    const g = a.createRadialGradient(px + dx - 40, py - 60, 10, px + dx, py, 230);
    g.addColorStop(0, '#ffb04a');
    g.addColorStop(1, '#c4520c');
    a.fillStyle = g;
    a.beginPath();
    a.ellipse(px + dx, py, rx, 190, 0, 0, TAU);
    a.fill();
  }
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#a7430a';
    c.lineWidth = mk ? 5 : 4;
    for (const [dx, rx] of [[-150, 150], [150, 150], [-70, 170], [70, 170]]) {
      c.beginPath();
      c.ellipse(px + dx, py, rx, 190, 0, dx < 0 ? Math.PI * 0.55 : -Math.PI * 0.45, dx < 0 ? Math.PI * 1.45 : Math.PI * 0.45);
      c.stroke();
    }
    c.fillStyle = mk ? '#fff' : '#ffd36b';
    c.beginPath();
    c.moveTo(px - 110, py - 40);
    c.lineTo(px - 50, py - 40);
    c.lineTo(px - 80, py - 100);
    c.closePath();
    c.moveTo(px + 110, py - 40);
    c.lineTo(px + 50, py - 40);
    c.lineTo(px + 80, py - 100);
    c.closePath();
    c.moveTo(px - 140, py + 30);
    for (let k = 0; k <= 8; k++) c.lineTo(px - 140 + k * 35, py + 30 + (k % 2 ? 30 : 0));
    for (let k = 8; k >= 0; k--) c.lineTo(px - 140 + k * 35, py + 80 + (k % 2 ? 0 : 20));
    c.closePath();
    c.fill();
  });
  a.fillStyle = '#4f6b2a';
  a.beginPath();
  a.moveTo(px - 18, py - 180);
  a.quadraticCurveTo(px - 10, py - 240, px + 30, py - 250);
  a.lineTo(px + 30, py - 228);
  a.quadraticCurveTo(px + 10, py - 220, px + 18, py - 180);
  a.closePath();
  a.fill();
  // candlelight inside the pumpkin
  liveEl(life, [px - 200, py - 160, 400, 300], [px, py], { type: 'glow', speed: 6 }, (a2) => {
    const g = a2.createRadialGradient(px, py - 10, 10, px, py - 10, 190);
    g.addColorStop(0, 'rgba(255,214,107,0.75)');
    g.addColorStop(0.5, 'rgba(255,170,60,0.3)');
    g.addColorStop(1, 'rgba(255,150,40,0)');
    a2.fillStyle = g;
    a2.globalCompositeOperation = 'source-over';
    a2.save();
    a2.beginPath();
    a2.moveTo(px - 110, py - 40);
    a2.lineTo(px - 50, py - 40);
    a2.lineTo(px - 80, py - 100);
    a2.closePath();
    a2.moveTo(px + 110, py - 40);
    a2.lineTo(px + 50, py - 40);
    a2.lineTo(px + 80, py - 100);
    a2.closePath();
    a2.moveTo(px - 140, py + 30);
    for (let k = 0; k <= 8; k++) a2.lineTo(px - 140 + k * 35, py + 30 + (k % 2 ? 30 : 0));
    for (let k = 8; k >= 0; k--) a2.lineTo(px - 140 + k * 35, py + 80 + (k % 2 ? 0 : 20));
    a2.closePath();
    a2.fillStyle = '#fff4c2';
    a2.shadowColor = 'rgba(255,190,80,0.9)';
    a2.shadowBlur = 30;
    a2.fill();
    a2.restore();
  }, { z: 0.002, inside: false });
  words(a, m, 'Happy Halloween', 500, 1245, '400 120px "Great Vibes"', '#e39a4a');
  return { art, mask, layers: life };
}

function autumn() {
  const S = 1000;
  const { art, mask, a, m } = pair(S, S, '#f3e8d6');
  grain(a, S, S, 123);
  const R = rng(123);
  const cols = ['#d9622b', '#e8a33d', '#b8452a', '#c98b2b', '#9a5a2b', '#e07a3a'];
  const life = [];
  for (let i = 0; i < 46; i++) {
    const t = (i / 46) * TAU + R() * 0.1;
    const rr = 365 + (R() - 0.5) * 50;
    const x = 500 + Math.cos(t) * rr, y = 500 + Math.sin(t) * rr;
    const s = 42 + R() * 22;
    const col = cols[(R() * cols.length) | 0];
    const rot = t + (R() - 0.5) * 1.4;
    const paintLeaf = (a, m) => {
    a.save();
    a.translate(x, y);
    a.rotate(rot);
    mapleLeaf(a, s);
    const g = a.createRadialGradient(0, 0, 2, 0, 0, s);
    g.addColorStop(0, shade(col, 0.25));
    g.addColorStop(1, shade(col, -0.2));
    a.fillStyle = g;
    a.shadowColor = 'rgba(90,40,10,0.25)';
    a.shadowBlur = 6;
    a.fill();
    a.restore();
    dual(a, m, (c, mk) => {
      c.translate(x, y);
      c.rotate(rot);
      c.strokeStyle = mk ? '#fff' : shade(col, -0.35);
      c.lineWidth = mk ? 3 : 2;
      c.beginPath();
      c.moveTo(0, s * 0.6);
      c.lineTo(0, -s * 0.9);
      for (const ang of [-0.9, 0.9, -1.9, 1.9]) {
        c.moveTo(0, 0);
        c.lineTo(Math.sin(ang) * s * 0.85, -Math.cos(ang) * s * 0.85);
      }
      c.stroke();
    });
    };
    // every other leaf rustles from its stem
    if (i % 2 === 0) {
      const sx = x - 0.6 * s * Math.sin(rot), sy = y + 0.6 * s * Math.cos(rot);
      liveEl(life, [x - s * 1.4, y - s * 1.4, s * 2.8, s * 2.8], [sx, sy], { type: 'sway', amp: 0.12, speed: 1.6 + (i % 5) * 0.25, ph: i * 0.7 }, paintLeaf, { z: 0.002 });
    } else paintLeaf(a, m);
  }
  for (let i = 0; i < 10; i++)
    addSprite(life, bitSprite('leaf', 14 + (i % 3) * 4, cols[i % cols.length], false), 80 + ((i * 397) % 840), 500, { type: 'fall', range: 1000, speed: 0.04 + (i % 4) * 0.01, ph: i / 10, amp: 50, flip: true }, { z: 0.012 });
  words(a, m, 'Grateful', 500, 480, '400 138px "Pinyon Script"', '#a85b2a');
  words(a, m, 'FOR YOU, ALWAYS', 500, 590, '600 34px "Cormorant Garamond"', '#a85b2a', { spacing: 8 });
  return { art, mask, layers: life };
}

function sunflower(a, m, x, y, r) {
  const n = 24;
  for (let layer = 0; layer < 2; layer++)
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + layer * (Math.PI / n);
      a.save();
      a.translate(x, y);
      a.rotate(ang);
      a.translate(r * 0.32, 0);
      petalPath(a, r * (layer ? 0.66 : 0.72), 0.2, false);
      const g = a.createLinearGradient(0, 0, r * 0.7, 0);
      g.addColorStop(0, layer ? '#e9a20b' : '#d98c06');
      g.addColorStop(1, layer ? '#ffd84a' : '#f7c531');
      a.fillStyle = g;
      a.fill();
      a.strokeStyle = 'rgba(160,90,0,0.5)';
      a.lineWidth = 1.5;
      a.stroke();
      a.restore();
    }
  const g = a.createRadialGradient(x - r * 0.08, y - r * 0.08, 2, x, y, r * 0.36);
  g.addColorStop(0, '#7a4a1e');
  g.addColorStop(1, '#3b2410');
  a.fillStyle = g;
  a.beginPath();
  a.arc(x, y, r * 0.35, 0, TAU);
  a.fill();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 150; i++) {
    const rr = Math.sqrt(i / 150) * r * 0.32, t = i * golden;
    const sx = x + Math.cos(t) * rr, sy = y + Math.sin(t) * rr;
    const toMask = i % 3 === 0;
    for (const c of toMask ? [a, m] : [a]) {
      c.fillStyle = c === a ? (i % 2 ? '#5a3816' : '#2a1608') : '#fff';
      c.beginPath();
      c.arc(sx, sy, r * 0.016, 0, TAU);
      c.fill();
    }
  }
}

function sunshine() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#d6eaf2');
  grain(a, W, H, 124);
  for (const [x0, y0, x1, y1] of [[330, 560, 450, 1060], [660, 420, 520, 1060], [650, 800, 560, 1060]]) {
    a.strokeStyle = '#4f8a3f';
    a.lineWidth = 12;
    a.lineCap = 'round';
    a.beginPath();
    a.moveTo(x0, y0);
    a.quadraticCurveTo((x0 + x1) / 2 + 30, (y0 + y1) / 2, x1, y1);
    a.stroke();
  }
  for (const [x, y, ang] of [[420, 820, -2.4], [560, 700, -0.6], [520, 930, -0.4]]) {
    a.save();
    a.translate(x, y);
    a.rotate(ang);
    leafPath(a, 150, 52);
    const g = a.createLinearGradient(0, -52, 0, 52);
    g.addColorStop(0, '#8cc06a');
    g.addColorStop(1, '#3f7a35');
    a.fillStyle = g;
    a.fill();
    a.restore();
  }
  const life = [];
  // sunflower heads turn and nod in the sun
  [[330, 560, 180], [660, 420, 150], [650, 800, 120]].forEach(([x, y, r], i) =>
    liveEl(life, [x - r * 1.1, y - r * 1.1, r * 2.2, r * 2.2], [x, y], { type: 'glint', amp: 0.025, speed: 0.8 + i * 0.2, ph: i * 1.9 }, (a2, m2) => sunflower(a2, m2, x, y, r), { z: 0.002 + i * 0.0004 })
  );
  addSprite(life, butterflySprite(BLUE_WINGS), 210, 270, { type: 'flutter', ph: 0.9, range: 50 }, { scale: 0.38, rot: -0.25 });
  words(a, m, 'You are my', 500, 1150, '400 82px Pacifico', '#b8762a');
  words(a, m, 'sunshine', 500, 1265, '400 120px Pacifico', '#b8762a');
  return { art, mask, layers: life };
}

function newHome() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#f4ece2');
  grain(a, W, H, 125);
  a.fillStyle = '#efd9c6';
  a.fillRect(300, 600, 400, 300);
  a.fillStyle = '#c86b4f';
  a.beginPath();
  a.moveTo(260, 605);
  a.lineTo(500, 400);
  a.lineTo(740, 605);
  a.closePath();
  a.fill();
  a.fillStyle = '#8fb08a';
  for (const [x, y, r] of [[300, 880, 46], [350, 900, 38], [690, 885, 44], [650, 905, 34]]) {
    a.beginPath();
    a.arc(x, y, r, 0, TAU);
    a.fill();
  }
  const life = [];
  // the tree sways from its trunk
  liveEl(life, [50, 570, 240, 340], [170, 900], { type: 'sway', amp: 0.025, speed: 0.9 }, (a2) => {
    a2.fillStyle = '#7d5a44';
    a2.fillRect(160, 760, 20, 140);
    const g = a2.createRadialGradient(140, 650, 10, 170, 690, 115);
    g.addColorStop(0, '#89b37f');
    g.addColorStop(1, '#5f8c57');
    a2.fillStyle = g;
    a2.beginPath();
    a2.arc(170, 690, 110, 0, TAU);
    a2.fill();
  }, { z: 0.002, inside: false });
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#7d5a44';
    c.lineWidth = mk ? 6 : 5;
    c.lineJoin = c.lineCap = 'round';
    c.strokeRect(300, 600, 400, 300);
    c.beginPath();
    c.moveTo(260, 605);
    c.lineTo(500, 400);
    c.lineTo(740, 605);
    c.moveTo(610, 480);
    c.lineTo(610, 420);
    c.lineTo(660, 420);
    c.lineTo(660, 524);
    c.stroke();
    c.beginPath();
    c.moveTo(455, 900);
    c.lineTo(455, 780);
    c.arc(500, 780, 45, Math.PI, 0);
    c.lineTo(545, 900);
    c.stroke();
    for (const wx of [340, 580]) {
      c.strokeRect(wx, 660, 80, 80);
      c.beginPath();
      c.moveTo(wx + 40, 660);
      c.lineTo(wx + 40, 740);
      c.moveTo(wx, 700);
      c.lineTo(wx + 80, 700);
      c.stroke();
    }
    c.beginPath();
    c.arc(500, 520, 34, 0, TAU);
    c.stroke();
    c.beginPath();
    c.moveTo(470, 900);
    c.bezierCurveTo(440, 960, 420, 1000, 380, 1040);
    c.moveTo(530, 900);
    c.bezierCurveTo(540, 960, 580, 1000, 640, 1040);
    c.stroke();
    c.fillStyle = mk ? '#fff' : '#c86b4f';
    c.beginPath();
    c.arc(532, 850, 5, 0, TAU);
    c.fill();
  });
  // little hearts puff up out of the chimney
  [[16, 0], [13, 0.33], [11, 0.66]].forEach(([s, ph]) => addSprite(life, bitSprite('heart', s, '#c86b4f'), 640, 395, { type: 'float', speed: 0.18, ph, rise: 230, drift: 40, grow: false }, { z: 0.008 }));
  [[250, 400, 11, 0.3], [790, 330, 9, 1.6], [820, 800, 10, 2.8], [140, 1000, 9, 4]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#e7b48f'), x, y, { type: 'twinkle', ph }));
  words(a, m, 'Home sweet home', 500, 1140, '400 120px "Great Vibes"', '#a2603e');
  words(a, m, 'NEW ADDRESS · SAME LOVE', 500, 1250, '600 34px Cinzel', '#a2603e', { spacing: 6 });
  return { art, mask, layers: life };
}

function bonVoyage() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#dbe9f5');
  grain(a, W, H, 126);
  const life = [];
  [[240, 330, 90, 0], [760, 660, 70, 1.7], [180, 760, 60, 3.3]].forEach(([x, y, s, ph]) =>
    liveEl(life, [x - s * 1.8, y - s * 1.3, s * 3.6, s * 2], [x, y], { type: 'drift', amp: 30, speed: 0.22, ph }, (a2) => cloud(a2, x, y, s, '#ffffff', 'rgba(70,100,140,0.2)'), { z: 0.002, inside: false })
  );
  dual(a, m, (c, mk) => {
    c.strokeStyle = mk ? '#fff' : '#7d95b0';
    c.lineWidth = mk ? 6 : 5;
    c.lineCap = 'round';
    c.setLineDash([2, 18]);
    c.beginPath();
    c.moveTo(80, 980);
    c.bezierCurveTo(260, 880, 420, 900, 420, 760);
    c.bezierCurveTo(420, 640, 300, 640, 320, 720);
    c.bezierCurveTo(340, 800, 520, 720, 650, 470);
    c.stroke();
  });
  // the paper plane bobs along on the breeze
  liveEl(life, [520, 260, 260, 260], [690, 430], { type: 'bob', amp: 12, ax: 6, speed: 1.1, rot: 0.06 }, (a, m) =>
  dual(a, m, (c, mk) => {
    c.translate(720, 420);
    c.rotate(-0.55);
    c.lineJoin = 'round';
    const faces = [
      [[0, 0], [-190, -50], [-150, 10], '#ffffff'],
      [[0, 0], [-150, 10], [-170, 70], '#dfe7f0'],
      [[0, 0], [-150, 10], [-120, 26], '#c4d1e0'],
    ];
    for (const [p0, p1, p2, col] of faces) {
      c.beginPath();
      c.moveTo(...p0);
      c.lineTo(...p1);
      c.lineTo(...p2);
      c.closePath();
      if (mk) {
        c.strokeStyle = '#fff';
        c.lineWidth = 4;
        c.stroke();
      } else {
        c.fillStyle = col;
        c.shadowColor = 'rgba(40,70,110,0.25)';
        c.shadowBlur = 10;
        c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = '#8aa0b8';
        c.lineWidth = 2;
        c.stroke();
      }
    }
  }), { z: 0.005 });
  words(a, m, 'Bon voyage', 500, 1080, '400 160px "Great Vibes"', '#6b86a6');
  words(a, m, 'ADVENTURE AWAITS', 500, 1210, '600 40px Cinzel', '#6b86a6', { spacing: 9 });
  return { art, mask, layers: life };
}

function hanukkah() {
  const W = 1000, H = 1400;
  const { art, mask, a, m } = pair(W, H, '#1c2c5b');
  grain(a, W, H, 127, true);
  const R = rng(127);
  a.strokeStyle = 'rgba(255,255,255,0.08)';
  a.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const x = R() * W, y = R() * H, s = 20 + R() * 40;
    for (const rot of [0, Math.PI]) {
      a.beginPath();
      for (let k = 0; k < 3; k++) {
        const t = rot - Math.PI / 2 + (k * TAU) / 3;
        a.lineTo(x + Math.cos(t) * s, y + Math.sin(t) * s);
      }
      a.closePath();
      a.stroke();
    }
  }
  const silver = '#dfe5f0';
  const cx = 500, baseY = 900, armY = 520;
  dual(a, m, (c, mk) => {
    c.strokeStyle = c.fillStyle = mk ? '#fff' : silver;
    c.lineWidth = 10;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx, armY - 60);
    c.lineTo(cx, baseY);
    c.stroke();
    for (let i = 1; i <= 4; i++) {
      const r = i * 75;
      c.beginPath();
      c.arc(cx, armY, r, 0, Math.PI);
      c.lineWidth = 8;
      c.stroke();
    }
    c.beginPath();
    c.moveTo(cx - 160, baseY);
    c.quadraticCurveTo(cx, baseY - 50, cx + 160, baseY);
    c.closePath();
    c.fill();
    for (let i = -4; i <= 4; i++) {
      const x = cx + i * 75;
      const top = i === 0 ? armY - 150 : armY - 90;
      c.fillRect(x - 22, top + 70, 44, 16);
    }
  });
  const life = [];
  for (let i = -4; i <= 4; i++) {
    const x = cx + i * 75;
    const top = i === 0 ? armY - 150 : armY - 90;
    a.fillStyle = '#f4f6fb';
    a.fillRect(x - 11, top, 22, 70);
    flame(life, x, top - 4, 0.95, i + 4);
  }
  [[150, 260, 11, 0.4], [860, 300, 9, 1.7], [120, 980, 10, 2.9], [880, 1000, 12, 4.1]].forEach(([x, y, r, ph]) => addSprite(life, sparkleSprite(r, '#eef2fa'), x, y, { type: 'twinkle', ph }));
  words(a, m, 'Happy Hanukkah', 500, 1110, '400 140px "Great Vibes"', silver);
  words(a, m, 'LIGHT · LOVE · MIRACLES', 500, 1230, '600 36px Cinzel', silver, { spacing: 7 });
  return { art, mask, layers: life };
}

const L = (s) => s.replace(/\|/g, '\n');
export const OCCASIONS = [
  { id: 'bday-balloons', name: 'Birthday balloons', cat: 'Birthday', build: birthdayBalloons, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#fbf3ea', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.3, insideCover: 'impression', motif: 'card', fx: 'balloons', letter: L('Happy birthday!|Here’s to another year|of you being wonderful.') } },
  { id: 'bday-cake', name: 'Make a wish', cat: 'Birthday', build: birthdayCake, settings: { shape: 'asis', foil: 'gold', finish: 'glitter', paper: '#f3ebf6', paperTex: 'cotton', emboss: 0.65, picEmboss: 0.25, insideCover: 'impression', motif: 'star', fx: 'confetti', letter: L('Make a wish,|blow out the candles|and eat all the cake!') } },
  { id: 'be-mine', name: 'Be mine', cat: 'Love', build: valentineHearts, settings: { shape: 'asis', foil: 'gold', finish: 'glitter', paper: '#b3172f', paperTex: 'felt', emboss: 0.7, picEmboss: 0.35, insideCover: 'mirror', motif: 'heart', fx: 'hearts', letter: L('Every day with you|is my favourite day.|Be mine?') } },
  { id: 'love-you', name: 'Love you', cat: 'Love', build: loveLine, settings: { shape: 'asis', foil: 'rose', finish: 'mirror', paper: '#f3d6d1', paperTex: 'linen', emboss: 0.6, picEmboss: 0, insideCover: 'mirror', motif: 'heart', fx: 'hearts', letter: L('Just in case|you forgot today:|I love you.') } },
  { id: 'wedding', name: 'Just married', cat: 'Wedding', build: wedding, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#f8f5ee', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.2, insideCover: 'impression', motif: 'card', fx: 'sparkles', letter: L('Congratulations|on your wedding day!|Wishing you a lifetime|of love and laughter.') } },
  { id: 'anniversary', name: 'Anniversary laurel', cat: 'Wedding', build: anniversary, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#1f3d33', paperTex: 'linen', emboss: 0.65, picEmboss: 0, insideCover: 'mirror', motif: 'heart', fx: 'sparkles', letter: L('Another year|of choosing each other.|Happy anniversary.') } },
  { id: 'xmas-tree', name: 'Merry Christmas', cat: 'Holidays', build: xmasTree, settings: { shape: 'asis', foil: 'gold', finish: 'glitter', paper: '#1d4a39', paperTex: 'felt', emboss: 0.65, picEmboss: 0.2, insideCover: 'mirror', motif: 'star', fx: 'snow', letter: L('Wishing you a cosy|Christmas and a joyful|New Year!') } },
  { id: 'xmas-wreath', name: 'Merry & bright', cat: 'Holidays', build: xmasWreath, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#f6f1e6', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.3, insideCover: 'impression', motif: 'card', fx: 'snow', letter: L('May your days be|merry and bright.') } },
  { id: 'let-it-snow', name: 'Let it snow', cat: 'Holidays', build: winterFlakes, settings: { shape: 'asis', foil: 'silver', finish: 'glitter', paper: '#dbe7f2', paperTex: 'felt', emboss: 0.7, picEmboss: 0.1, insideCover: 'mirror', motif: 'card', fx: 'snow', letter: L('Warm wishes|for a peaceful|winter season.') } },
  { id: 'new-year', name: 'Happy New Year', cat: 'Holidays', build: newYear, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#141b33', paperTex: 'smooth', emboss: 0.6, picEmboss: 0, insideCover: 'mirror', motif: 'sparkle', fx: 'fireworks', letter: L('Cheers to new|beginnings and|big adventures!') } },
  { id: 'diwali', name: 'Happy Diwali', cat: 'Holidays', build: diwali, settings: { shape: 'asis', foil: 'gold', finish: 'glitter', paper: '#5a1020', paperTex: 'linen', emboss: 0.65, picEmboss: 0.3, insideCover: 'mirror', motif: 'card', fx: 'embers', letter: L('May the festival of lights|fill your home with|joy and prosperity.') } },
  { id: 'eid', name: 'Eid Mubarak', cat: 'Holidays', build: eid, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#0f4c4f', paperTex: 'linen', emboss: 0.65, picEmboss: 0.15, insideCover: 'mirror', motif: 'moon', fx: 'lanterns', letter: L('Eid Mubarak!|Wishing you peace,|joy and blessings.') } },
  { id: 'lunar', name: 'Lunar New Year', cat: 'Holidays', build: lunarNewYear, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#b3161b', paperTex: 'felt', emboss: 0.6, picEmboss: 0.3, insideCover: 'mirror', motif: 'flower', fx: 'lanterns', letter: L('Wishing you luck,|health and happiness|in the new year.') } },
  { id: 'hanukkah', name: 'Happy Hanukkah', cat: 'Holidays', build: hanukkah, settings: { shape: 'asis', foil: 'silver', finish: 'mirror', paper: '#1c2c5b', paperTex: 'linen', emboss: 0.6, picEmboss: 0, insideCover: 'mirror', motif: 'card', fx: 'sparkles', letter: L('Eight nights of|light and love.|Happy Hanukkah!') } },
  { id: 'halloween', name: 'Happy Halloween', cat: 'Holidays', build: halloween, settings: { shape: 'asis', foil: 'copper', finish: 'mirror', paper: '#1a1520', paperTex: 'felt', emboss: 0.6, picEmboss: 0.3, insideCover: 'mirror', motif: 'moon', fx: 'bats', letter: L('Have a spooktacular|Halloween!') } },
  { id: 'easter', name: 'Happy Easter', cat: 'Holidays', build: easter, settings: { shape: 'asis', foil: 'gold', finish: 'glitter', paper: '#e1f1e6', paperTex: 'cotton', emboss: 0.65, picEmboss: 0.35, insideCover: 'impression', motif: 'flower', fx: 'butterflies', letter: L('Hoppy Easter!|Wishing you a basket|full of joy.') } },
  { id: 'mothers-day', name: 'Mother’s Day', cat: 'Celebrate', build: mothersDay, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#f8f5f2', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.25, insideCover: 'impression', motif: 'card', fx: 'petals', letter: L('For all the|quiet ways|you love us.') } },
  { id: 'fathers-day', name: 'Father’s Day', cat: 'Celebrate', build: fathersDay, settings: { shape: 'asis', foil: 'gold', finish: 'brushed', paper: '#1f2a44', paperTex: 'linen', emboss: 0.6, picEmboss: 0.15, insideCover: 'mirror', motif: 'star', fx: 'stars', letter: L('Thanks for every|lesson, laugh and|lift along the way.') } },
  { id: 'graduation', name: 'Congrats, grad', cat: 'Celebrate', build: graduation, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#1b2238', paperTex: 'smooth', emboss: 0.6, picEmboss: 0.2, insideCover: 'mirror', motif: 'star', fx: 'confetti', letter: L('You did it!|So proud of you.|The world is yours.') } },
  { id: 'new-baby', name: 'Welcome baby', cat: 'Celebrate', build: newBaby, settings: { shape: 'asis', foil: 'gold', finish: 'satin', paper: '#dce9f5', paperTex: 'felt', emboss: 0.6, picEmboss: 0.4, insideCover: 'impression', motif: 'moon', fx: 'bubbles', letter: L('Welcome to the world,|little one. You are|so loved already.') } },
  { id: 'new-home', name: 'Home sweet home', cat: 'Celebrate', build: newHome, settings: { shape: 'asis', foil: 'copper', finish: 'mirror', paper: '#f4ece2', paperTex: 'linen', emboss: 0.6, picEmboss: 0.2, insideCover: 'impression', motif: 'heart', fx: 'sparkles', letter: L('Congratulations|on your new home!|May it be full of love.') } },
  { id: 'bon-voyage', name: 'Bon voyage', cat: 'Celebrate', build: bonVoyage, settings: { shape: 'asis', foil: 'silver', finish: 'mirror', paper: '#dbe9f5', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.2, insideCover: 'impression', motif: 'card', fx: 'confetti', letter: L('Safe travels and|the best adventures.|Come back with stories!') } },
  { id: 'thank-you', name: 'Thank you', cat: 'Thanks & care', build: thankYou, settings: { shape: 'asis', foil: 'gold', finish: 'mirror', paper: '#d7e0d0', paperTex: 'linen', emboss: 0.6, picEmboss: 0.15, insideCover: 'mirror', motif: 'card', fx: 'sparkles', letter: L('Thank you|from the bottom|of my heart.') } },
  { id: 'get-well', name: 'Get well soon', cat: 'Thanks & care', build: getWell, settings: { shape: 'asis', foil: 'copper', finish: 'satin', paper: '#fbecb8', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.25, insideCover: 'impression', motif: 'sparkle', fx: 'sparkles', letter: L('Rest up and|feel better soon.|Thinking of you!') } },
  { id: 'sympathy', name: 'Thinking of you', cat: 'Thanks & care', build: sympathy, settings: { shape: 'asis', foil: 'silver', finish: 'satin', paper: '#e6e3df', paperTex: 'linen', emboss: 0.55, picEmboss: 0, insideCover: 'mirror', motif: 'card', fx: 'none', letter: L('Holding you close|in my thoughts.|With love.') } },
  { id: 'grateful', name: 'Grateful', cat: 'Thanks & care', build: autumn, settings: { shape: 'asis', foil: 'copper', finish: 'mirror', paper: '#f3e8d6', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.3, insideCover: 'impression', motif: 'card', fx: 'leaves', letter: L('So grateful|for you, today|and every day.') } },
  { id: 'happy-cat', name: 'Happiness', cat: 'Everyday', build: happyCatLive, settings: { shape: 'asis', foil: 'rose', finish: 'mirror', paper: '#efe6d2', paperTex: 'cotton', emboss: 0.65, picEmboss: 0.35, insideCover: 'mirror', motif: 'card', fx: 'butterflies', letter: L('Wishing you|sunny naps and|soft, happy days.') } },
  { id: 'sunshine', name: 'You are my sunshine', cat: 'Everyday', build: sunshine, settings: { shape: 'asis', foil: 'gold', finish: 'glitter', paper: '#d6eaf2', paperTex: 'cotton', emboss: 0.6, picEmboss: 0.35, insideCover: 'impression', motif: 'sparkle', fx: 'butterflies', letter: L('You make every|grey day golden.') } },
];
