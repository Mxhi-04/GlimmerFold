// Small vector shapes shared by the procedural presets and the letter motif.

export function starPath(ctx, cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rad = i % 2 ? r : R;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
}

// A soft, rounded five point star (filled + stroked with round joins).
export function roundStar(ctx, cx, cy, R, rot = 0, fill = '#fff') {
  starPath(ctx, cx, cy, R * 0.86, R * 0.42, 5, -Math.PI / 2 + rot);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = R * 0.3;
  ctx.fillStyle = ctx.strokeStyle = fill;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function sparklePath(ctx, cx, cy, R, thin = 0.16) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - R);
  ctx.quadraticCurveTo(cx + R * thin, cy - R * thin, cx + R, cy);
  ctx.quadraticCurveTo(cx + R * thin, cy + R * thin, cx, cy + R);
  ctx.quadraticCurveTo(cx - R * thin, cy + R * thin, cx - R, cy);
  ctx.quadraticCurveTo(cx - R * thin, cy - R * thin, cx, cy - R);
  ctx.closePath();
}

export function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.42);
  ctx.bezierCurveTo(cx - s * 1.05, cy - s * 0.2, cx - s * 0.5, cy - s * 0.95, cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.95, cx + s * 1.05, cy - s * 0.2, cx, cy + s * 0.42);
  ctx.closePath();
}

export function crescent(ctx, cx, cy, r, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - r * 3, cy - r * 3, r * 6, r * 6);
  ctx.arc(cx + r * 0.42, cy - r * 0.26, r * 0.84, 0, Math.PI * 2, true);
  ctx.clip('evenodd');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

// Draws a filled motif in the current fillStyle colour.
export function drawMotif(ctx, type, cx, cy, size, fill = '#fff') {
  ctx.save();
  ctx.fillStyle = fill;
  switch (type) {
    case 'star':
      roundStar(ctx, cx, cy, size * 0.55, 0, fill);
      break;
    case 'heart':
      heartPath(ctx, cx, cy, size * 0.55);
      ctx.fill();
      break;
    case 'sparkle':
      sparklePath(ctx, cx, cy, size * 0.5);
      ctx.fill();
      sparklePath(ctx, cx + size * 0.5, cy - size * 0.36, size * 0.16);
      ctx.fill();
      sparklePath(ctx, cx - size * 0.46, cy + size * 0.3, size * 0.12);
      ctx.fill();
      break;
    case 'flower': {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.moveTo(cx + Math.cos(a) * size * 0.27 + size * 0.2, cy + Math.sin(a) * size * 0.27);
        ctx.arc(cx + Math.cos(a) * size * 0.27, cy + Math.sin(a) * size * 0.27, size * 0.2, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'moon':
      crescent(ctx, cx, cy, size * 0.42, fill);
      sparklePath(ctx, cx + size * 0.42, cy - size * 0.3, size * 0.13);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}
