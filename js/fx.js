// Occasion animations drawn on a 2D layer over the 3D card: ambient motion + a burst when the card opens.
import { heartPath, sparklePath, starPath } from './shapes.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export const FX_TYPES = {
  none: 'None', confetti: 'Confetti', hearts: 'Hearts', balloons: 'Balloons', fireworks: 'Fireworks', sparkles: 'Sparkles',
  stars: 'Twinkling stars', snow: 'Snow', petals: 'Petals', leaves: 'Autumn leaves', butterflies: 'Butterflies',
  bubbles: 'Bubbles', lanterns: 'Lanterns', embers: 'Diya embers', bats: 'Bats',
};

const CONFETTI = ['#f4c542', '#ef6f8e', '#6fc3df', '#8bd17c', '#b388eb', '#ff9f5a', '#d4af37'];
const HEARTS = ['#ff5c8a', '#ff8fab', '#e63950', '#ffb3c6', '#d4447a'];
const BALLOONS = ['#f59fb4', '#ffd166', '#8ecae6', '#b9a4f0', '#8fd3b6', '#ffb38a', '#ef476f'];
const FIRE = [['#f2a900', '#fff3c4'], ['#ef3e7a', '#ffd0df'], ['#2b9fd6', '#d6f3ff'], ['#8a5cf0', '#efe2ff'], ['#3fb24f', '#e3ffd9'], ['#e8c062', '#fff7dc']];
const LEAVES = ['#d9622b', '#e8a33d', '#b8452a', '#c98b2b', '#e07a3a'];
const PETALS = ['#f7b6c8', '#f9cdd8', '#f39bb5', '#ffe0e8'];
const WINGS = [['#f7a8c8', '#ffd6e5'], ['#9ad0f5', '#dff1ff'], ['#ffd166', '#fff1c2'], ['#b9a4f0', '#ebe3ff']];

// rate = ambient particles per second at amount 0.5; burst = particles when the card opens
const DEF = {
  confetti: { rate: 7, burst: 140 },
  hearts: { rate: 3, burst: 34 },
  balloons: { rate: 0.9, burst: 12 },
  fireworks: { rate: 0.55, burst: 3 },
  sparkles: { rate: 9, burst: 46 },
  stars: { rate: 5, burst: 30 },
  snow: { rate: 22, burst: 70 },
  petals: { rate: 4, burst: 40 },
  leaves: { rate: 2.6, burst: 26 },
  butterflies: { rate: 0.45, burst: 6 },
  bubbles: { rate: 3, burst: 30 },
  lanterns: { rate: 0.8, burst: 10 },
  embers: { rate: 10, burst: 60 },
  bats: { rate: 0.5, burst: 7 },
};

export class Effects {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.p = [];
    this.type = 'none';
    this.mode = 'always';
    this.amount = 0.5;
    this.dark = false;
    this.acc = 0;
    this.w = 1;
    this.h = 1;
    this.t = 0;
    this.card = { x: 0, y: 0, w: 200, h: 280 };
  }
  resize(w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  configure(type, mode, amount, dark) {
    if (type !== this.type) this.p.length = 0;
    this.type = DEF[type] ? type : 'none';
    this.mode = mode;
    this.amount = amount;
    this.dark = dark;
    if (mode === 'off') this.p.length = 0;
  }
  burst(scale = 1) {
    if (this.type === 'none' || this.mode === 'off') return;
    const n = Math.round(DEF[this.type].burst * (0.4 + this.amount * 1.2) * scale);
    for (let i = 0; i < n; i++) this.spawn(true);
  }
  spawn(burst) {
    if (this.p.length > 420) return;
    const { w, h } = this;
    const C = this.card;
    const p = { x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 1, rot: rand(0, TAU), vr: rand(-2, 2), life: 0, max: 6, s: 6, ph: rand(0, TAU), kind: this.type };
    switch (this.type) {
      case 'confetti':
        p.col = pick(CONFETTI);
        p.s = rand(5, 10);
        p.shape = Math.random() < 0.6 ? 'rect' : Math.random() < 0.6 ? 'dot' : 'ribbon';
        p.fl = rand(5, 11);
        if (burst) {
          const a = -Math.PI / 2 + rand(-0.9, 0.9);
          const v = rand(420, 950);
          p.x = C.x + rand(-C.w * 0.2, C.w * 0.2);
          p.y = C.y - C.h * 0.1;
          p.vx = Math.cos(a) * v;
          p.vy = Math.sin(a) * v;
          p.g = 900;
          p.drag = 0.18;
        } else {
          p.x = rand(0, w);
          p.y = -20;
          p.vx = rand(-30, 30);
          p.vy = rand(70, 150);
          p.g = 10;
          p.max = 14;
        }
        p.vr = rand(-6, 6);
        break;
      case 'hearts':
        p.col = pick(HEARTS);
        p.s = rand(8, 20);
        p.sw = rand(18, 40);
        if (burst) {
          const a = rand(0, TAU), v = rand(120, 380);
          p.x = C.x;
          p.y = C.y;
          p.vx = Math.cos(a) * v;
          p.vy = Math.sin(a) * v - 120;
          p.drag = 0.35;
          p.g = -30;
          p.max = 3.4;
        } else {
          p.x = rand(0, w);
          p.y = h + 20;
          p.vy = rand(-90, -45);
          p.max = 16;
        }
        p.vr = rand(-0.6, 0.6);
        p.rot = rand(-0.3, 0.3);
        break;
      case 'balloons':
        p.col = pick(BALLOONS);
        p.s = rand(16, 30);
        p.x = burst ? C.x + rand(-C.w * 0.7, C.w * 0.7) : rand(0, w);
        p.y = h + rand(40, burst ? 200 : 60);
        p.vy = rand(-130, -70) * (burst ? 1.6 : 1);
        p.sw = rand(10, 24);
        p.max = 20;
        p.rot = 0;
        p.vr = 0;
        break;
      case 'fireworks':
        p.kind = 'rocket';
        p.x = burst ? C.x + rand(-C.w * 0.8, C.w * 0.8) : rand(w * 0.12, w * 0.88);
        p.y = h + 10;
        p.vy = -rand(560, 760) * Math.min(1.2, h / 700);
        p.vx = rand(-40, 40);
        p.g = 380;
        p.col = pick(FIRE);
        p.max = 4;
        p.trail = [];
        break;
      case 'sparkles':
        p.x = C.x + rand(-C.w * 0.75, C.w * 0.75);
        p.y = C.y + rand(-C.h * 0.65, C.h * 0.65);
        p.s = rand(4, burst ? 14 : 10);
        p.max = rand(0.7, 1.6);
        p.col = Math.random() < 0.7 ? '#f7cf5b' : '#ffffff';
        p.vy = rand(-12, -4);
        break;
      case 'stars':
        if (!burst && Math.random() < 0.06) {
          p.kind = 'shooting';
          p.x = rand(w * 0.2, w);
          p.y = rand(0, h * 0.4);
          p.vx = -rand(500, 800);
          p.vy = rand(160, 260);
          p.max = 1.2;
          break;
        }
        p.x = burst ? C.x + rand(-C.w, C.w) : rand(0, w);
        p.y = burst ? C.y + rand(-C.h * 0.8, C.h * 0.8) : rand(0, h);
        p.s = rand(3, 8);
        p.max = rand(1.5, 3.2);
        p.col = Math.random() < 0.6 ? '#f2c94c' : '#fff6d6';
        break;
      case 'snow':
        p.x = rand(-20, w + 20);
        p.y = burst ? rand(-h * 0.6, 0) : -10;
        p.s = Math.pow(Math.random(), 2) * 4.5 + 1.4;
        p.vy = 25 + p.s * 14;
        p.sw = rand(10, 30);
        p.max = 30;
        p.vr = rand(-0.8, 0.8);
        break;
      case 'petals':
      case 'leaves':
        p.col = pick(this.type === 'petals' ? PETALS : LEAVES);
        p.s = this.type === 'petals' ? rand(7, 13) : rand(10, 17);
        if (burst) {
          const a = rand(0, TAU), v = rand(100, 360);
          p.x = C.x;
          p.y = C.y;
          p.vx = Math.cos(a) * v;
          p.vy = Math.sin(a) * v - 140;
          p.drag = 0.4;
          p.g = 60;
        } else {
          p.x = rand(-60, w);
          p.y = -20;
          p.vx = rand(15, 50);
          p.vy = rand(45, 85);
        }
        p.sw = rand(20, 50);
        p.fl = rand(2, 5);
        p.max = 20;
        p.vr = rand(-2.5, 2.5);
        break;
      case 'butterflies': {
        const fromLeft = Math.random() < 0.5;
        p.x = burst ? C.x + rand(-30, 30) : fromLeft ? -30 : w + 30;
        p.y = burst ? C.y + rand(-30, 30) : rand(h * 0.15, h * 0.8);
        p.dir = burst ? rand(0, TAU) : fromLeft ? rand(-0.4, 0.4) : Math.PI + rand(-0.4, 0.4);
        p.v = rand(60, 110);
        p.col = pick(WINGS);
        p.s = rand(10, 16);
        p.max = 18;
        break;
      }
      case 'bubbles':
        p.x = burst ? C.x + rand(-C.w * 0.5, C.w * 0.5) : rand(0, w);
        p.y = burst ? C.y + C.h * 0.3 : h + 20;
        p.s = rand(5, 20);
        p.vy = -rand(40, 90) * (burst ? 1.8 : 1);
        p.sw = rand(10, 30);
        p.max = burst ? rand(2, 4) : rand(6, 12);
        break;
      case 'lanterns':
        p.x = burst ? C.x + rand(-C.w * 0.8, C.w * 0.8) : rand(0, w);
        p.y = h + rand(20, 80);
        p.s = rand(10, 20);
        p.vy = -rand(28, 55) * (burst ? 1.6 : 1);
        p.sw = rand(8, 20);
        p.max = 30;
        break;
      case 'embers':
        p.x = burst ? C.x + rand(-C.w * 0.6, C.w * 0.6) : rand(0, w);
        p.y = burst ? C.y + C.h * rand(-0.2, 0.5) : h + 10;
        p.s = rand(1.2, 3.4);
        p.vy = -rand(40, 110) * (burst ? 1.4 : 1);
        p.sw = rand(10, 30);
        p.col = pick(['#ffb347', '#ffd27a', '#ff8a3d', '#fff0b3']);
        p.max = rand(3, 7);
        break;
      case 'bats': {
        const fromLeft = Math.random() < 0.5;
        p.x = burst ? C.x : fromLeft ? -40 : w + 40;
        p.y = burst ? C.y : rand(h * 0.08, h * 0.6);
        p.vx = burst ? rand(-260, 260) : (fromLeft ? 1 : -1) * rand(110, 190);
        p.vy = burst ? rand(-220, -60) : rand(-12, 12);
        p.s = rand(12, 22);
        p.max = 12;
        break;
      }
      default:
        return;
    }
    this.p.push(p);
  }
  explode(r) {
    const n = 46 + ((Math.random() * 26) | 0);
    const sp = rand(150, 260);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.05, 0.05);
      const v = sp * rand(0.75, 1.05);
      this.p.push({ kind: 'spark', x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 150, drag: 0.5, life: 0, max: rand(1.1, 1.7), col: r.col, s: rand(1.6, 2.6), px: r.x, py: r.y });
    }
  }
  step(dt) {
    const { ctx, w, h } = this;
    this.t += dt;
    ctx.clearRect(0, 0, w, h);
    if (this.type === 'none' || this.mode === 'off') return;
    if (this.mode === 'always') {
      this.acc += DEF[this.type].rate * (this.amount * 2) * dt * Math.min(1.6, w / 900 + 0.3);
      while (this.acc >= 1) {
        this.acc -= 1;
        this.spawn(false);
      }
    }
    const t = this.t;
    const keep = [];
    for (const p of this.p) {
      p.life += dt;
      if (p.drag !== 1 && p.drag) {
        const k = Math.pow(p.drag, dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += (p.g || 0) * dt;
      if (p.kind === 'butterflies') {
        p.dir += Math.sin(t * 1.3 + p.ph) * 1.4 * dt;
        p.vx = Math.cos(p.dir) * p.v;
        p.vy = Math.sin(p.dir) * p.v * 0.6 + Math.sin(t * 3 + p.ph) * 25;
      }
      p.px = p.x;
      p.py = p.y;
      p.x += p.vx * dt + (p.sw ? Math.sin(t * 1.4 + p.ph) * p.sw * dt : 0);
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'rocket') {
        p.trail.push([p.x, p.y]);
        if (p.trail.length > 8) p.trail.shift();
        if (p.vy > -60 || p.life > 1.6) {
          this.explode(p);
          continue;
        }
      }
      const out = p.y > h + 80 || p.y < -140 || p.x < -140 || p.x > w + 140;
      if (p.life < p.max && !(out && p.life > 0.5)) keep.push(p);
      this.draw(p);
    }
    this.p = keep;
  }
  draw(p) {
    const c = this.ctx;
    const fade = Math.min(1, p.life * 4, (p.max - p.life) * 1.5);
    if (fade <= 0) return;
    c.save();
    c.globalAlpha = Math.max(0, fade);
    c.translate(p.x, p.y);
    switch (p.kind) {
      case 'confetti': {
        c.rotate(p.rot);
        c.scale(1, Math.cos(this.t * p.fl + p.ph));
        c.fillStyle = p.col;
        if (p.shape === 'rect') c.fillRect(-p.s * 0.5, -p.s, p.s, p.s * 2);
        else if (p.shape === 'dot') {
          c.beginPath();
          c.arc(0, 0, p.s * 0.6, 0, TAU);
          c.fill();
        } else {
          c.strokeStyle = p.col;
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(-p.s, 0);
          c.quadraticCurveTo(0, -p.s, p.s, 0);
          c.stroke();
        }
        break;
      }
      case 'hearts': {
        c.rotate(p.rot + Math.sin(this.t * 2 + p.ph) * 0.15);
        heartPath(c, 0, 0, p.s);
        const g = c.createRadialGradient(-p.s * 0.3, -p.s * 0.35, 1, 0, 0, p.s);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.35, p.col);
        g.addColorStop(1, p.col);
        c.fillStyle = g;
        c.fill();
        break;
      }
      case 'balloons': {
        const s = p.s;
        c.strokeStyle = this.dark ? 'rgba(255,255,255,0.5)' : 'rgba(80,70,60,0.45)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(0, s * 1.25);
        for (let k = 1; k <= 6; k++) c.lineTo(Math.sin(this.t * 3 + p.ph + k) * 4, s * 1.25 + k * s * 0.5);
        c.stroke();
        const g = c.createRadialGradient(-s * 0.35, -s * 0.45, 1, 0, 0, s * 1.3);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.2, p.col);
        g.addColorStop(1, p.col);
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(0, 0, s, s * 1.22, Math.sin(this.t + p.ph) * 0.08, 0, TAU);
        c.fill();
        c.beginPath();
        c.moveTo(0, s * 1.15);
        c.lineTo(-4, s * 1.35);
        c.lineTo(4, s * 1.35);
        c.fill();
        break;
      }
      case 'rocket': {
        c.restore();
        c.save();
        c.strokeStyle = this.dark ? p.col[1] : p.col[0];
        c.lineWidth = 2;
        c.lineCap = 'round';
        c.beginPath();
        p.trail.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
        break;
      }
      case 'spark': {
        c.restore();
        c.save();
        c.globalAlpha = Math.max(0, 1 - p.life / p.max);
        c.strokeStyle = p.col[0];
        c.lineWidth = p.s;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(p.px - (p.x - p.px) * 2, p.py - (p.y - p.py) * 2);
        c.lineTo(p.x, p.y);
        c.stroke();
        c.fillStyle = this.dark ? p.col[1] : p.col[0];
        c.beginPath();
        c.arc(p.x, p.y, p.s * 0.7, 0, TAU);
        c.fill();
        break;
      }
      case 'sparkles':
      case 'stars': {
        const k = Math.sin((p.life / p.max) * Math.PI);
        c.globalAlpha = k;
        c.rotate(p.rot * 0.2);
        c.fillStyle = p.col;
        c.shadowColor = p.col;
        c.shadowBlur = 8;
        if (p.kind === 'stars' && p.s < 5) {
          starPath(c, 0, 0, p.s * k + 0.5, p.s * 0.45 * k + 0.2, 5);
        } else sparklePath(c, 0, 0, p.s * (0.4 + k * 0.8));
        c.fill();
        break;
      }
      case 'shooting': {
        c.rotate(Math.atan2(p.vy, p.vx));
        const g = c.createLinearGradient(-140, 0, 0, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)');
        g.addColorStop(1, 'rgba(255,240,200,0.95)');
        c.strokeStyle = g;
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(-140, 0);
        c.lineTo(0, 0);
        c.stroke();
        break;
      }
      case 'snow': {
        c.rotate(p.rot);
        const col = this.dark ? 'rgba(255,255,255,0.92)' : 'rgba(150,180,212,0.9)';
        if (p.s > 3.6) {
          c.strokeStyle = col;
          c.lineWidth = 1.2;
          c.lineCap = 'round';
          for (let k = 0; k < 6; k++) {
            c.rotate(TAU / 6);
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(0, -p.s * 1.6);
            c.moveTo(0, -p.s * 0.9);
            c.lineTo(-p.s * 0.45, -p.s * 1.3);
            c.moveTo(0, -p.s * 0.9);
            c.lineTo(p.s * 0.45, -p.s * 1.3);
            c.stroke();
          }
        } else {
          c.fillStyle = col;
          c.beginPath();
          c.arc(0, 0, p.s * 0.75, 0, TAU);
          c.fill();
        }
        break;
      }
      case 'petals': {
        c.rotate(p.rot);
        c.scale(1, 0.35 + Math.abs(Math.cos(this.t * p.fl + p.ph)) * 0.65);
        const g = c.createLinearGradient(-p.s, 0, p.s, 0);
        g.addColorStop(0, p.col);
        g.addColorStop(1, '#fff');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-p.s, 0);
        c.bezierCurveTo(-p.s * 0.4, -p.s * 0.7, p.s * 0.6, -p.s * 0.6, p.s, -p.s * 0.1);
        c.lineTo(p.s * 0.8, 0);
        c.lineTo(p.s, p.s * 0.1);
        c.bezierCurveTo(p.s * 0.6, p.s * 0.6, -p.s * 0.4, p.s * 0.7, -p.s, 0);
        c.fill();
        break;
      }
      case 'leaves': {
        c.rotate(p.rot);
        c.scale(1, 0.4 + Math.abs(Math.cos(this.t * p.fl + p.ph)) * 0.6);
        c.fillStyle = p.col;
        c.beginPath();
        for (let i = 0; i <= 40; i++) {
          const th = (i / 40) * TAU;
          const r = p.s * (0.4 + 0.6 * Math.pow(Math.abs(Math.cos(th * 2.5)), 0.6));
          c.lineTo(Math.cos(th - Math.PI / 2) * r, Math.sin(th - Math.PI / 2) * r);
        }
        c.fill();
        c.strokeStyle = 'rgba(90,40,10,0.45)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, p.s * 0.8);
        c.lineTo(0, -p.s * 0.8);
        c.stroke();
        break;
      }
      case 'butterflies': {
        c.rotate(p.vx < 0 ? -0.2 : 0.2);
        const flap = 0.25 + Math.abs(Math.sin(this.t * 13 + p.ph)) * 0.75;
        const s = p.s;
        for (const side of [-1, 1]) {
          c.save();
          c.scale(side * flap, 1);
          const g = c.createRadialGradient(s * 0.3, -s * 0.3, 1, s * 0.5, -s * 0.2, s);
          g.addColorStop(0, p.col[1]);
          g.addColorStop(1, p.col[0]);
          c.fillStyle = g;
          c.beginPath();
          c.ellipse(s * 0.55, -s * 0.35, s * 0.6, s * 0.5, -0.5, 0, TAU);
          c.fill();
          c.beginPath();
          c.ellipse(s * 0.4, s * 0.35, s * 0.4, s * 0.32, 0.5, 0, TAU);
          c.fill();
          c.restore();
        }
        c.fillStyle = '#4b3a3a';
        c.beginPath();
        c.ellipse(0, 0, s * 0.08, s * 0.55, 0, 0, TAU);
        c.fill();
        break;
      }
      case 'bubbles': {
        const s = p.s * (1 + Math.sin(this.t * 3 + p.ph) * 0.04);
        const g = c.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s);
        g.addColorStop(0, 'rgba(255,255,255,0.05)');
        g.addColorStop(0.8, 'rgba(180,220,255,0.12)');
        g.addColorStop(1, 'rgba(200,170,255,0.4)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, s, 0, TAU);
        c.fill();
        c.strokeStyle = this.dark ? 'rgba(255,255,255,0.55)' : 'rgba(120,160,210,0.55)';
        c.lineWidth = 1.2;
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.beginPath();
        c.ellipse(-s * 0.4, -s * 0.4, s * 0.18, s * 0.1, -0.7, 0, TAU);
        c.fill();
        break;
      }
      case 'lanterns': {
        const s = p.s, fl = 0.85 + Math.sin(this.t * 9 + p.ph) * 0.08 + Math.sin(this.t * 23 + p.ph) * 0.05;
        const glow = c.createRadialGradient(0, 0, 1, 0, 0, s * 3);
        glow.addColorStop(0, `rgba(255,180,80,${0.45 * fl})`);
        glow.addColorStop(1, 'rgba(255,180,80,0)');
        c.fillStyle = glow;
        c.fillRect(-s * 3, -s * 3, s * 6, s * 6);
        const g = c.createLinearGradient(0, -s, 0, s);
        g.addColorStop(0, '#ffcf73');
        g.addColorStop(1, '#e8632b');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-s * 0.55, -s);
        c.lineTo(s * 0.55, -s);
        c.lineTo(s * 0.7, s * 0.9);
        c.quadraticCurveTo(0, s * 1.05, -s * 0.7, s * 0.9);
        c.closePath();
        c.fill();
        c.fillStyle = `rgba(255,250,220,${fl})`;
        c.beginPath();
        c.ellipse(0, s * 0.75, s * 0.28, s * 0.12, 0, 0, TAU);
        c.fill();
        break;
      }
      case 'embers': {
        const k = 0.6 + Math.sin(this.t * 12 + p.ph) * 0.4;
        const g = c.createRadialGradient(0, 0, 0, 0, 0, p.s * 4);
        g.addColorStop(0, p.col);
        g.addColorStop(0.25, p.col);
        g.addColorStop(1, 'rgba(255,140,40,0)');
        c.globalAlpha *= k;
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, p.s * 4, 0, TAU);
        c.fill();
        break;
      }
      case 'bats': {
        const flap = Math.sin(this.t * 14 + p.ph);
        const s = p.s;
        if (p.vx < 0) c.scale(-1, 1);
        c.fillStyle = this.dark ? '#d8c8e8' : '#2b2233';
        c.beginPath();
        c.ellipse(0, 0, s * 0.18, s * 0.28, 0, 0, TAU);
        c.fill();
        for (const side of [-1, 1]) {
          c.beginPath();
          c.moveTo(0, -s * 0.1);
          c.quadraticCurveTo(side * s * 0.5, -s * 0.2 - flap * s * 0.5, side * s, -flap * s * 0.45);
          c.quadraticCurveTo(side * s * 0.75, s * 0.1, side * s * 0.55, s * 0.05);
          c.quadraticCurveTo(side * s * 0.4, s * 0.2, side * s * 0.2, s * 0.12);
          c.closePath();
          c.fill();
        }
        break;
      }
      default:
        break;
    }
    c.restore();
  }
}
