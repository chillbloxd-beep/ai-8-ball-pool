const BALL_COLORS = {
  cue: '#ffffff',
  solid: '#ffce32',
  stripe: '#2d9bff',
  eight: '#111111'
};

export function render(ctx, state) {
  const { width, height, rail, pocketRadius, ballRadius } = state.table;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#5f3b22';
  roundRect(ctx, 0, 0, width, height, 16);
  ctx.fill();

  ctx.fillStyle = '#0f7146';
  roundRect(ctx, rail / 2, rail / 2, width - rail, height - rail, 10);
  ctx.fill();

  drawPockets(ctx, state.table, pocketRadius);

  for (const b of state.balls) {
    if (b.sunk) continue;
    ctx.beginPath();
    ctx.arc(b.x, b.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLORS[b.type] || '#ddd';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (b.type !== 'cue') {
      ctx.fillStyle = b.type === 'eight' ? '#fff' : '#0c2d4f';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(b.id), b.x, b.y);
    }
  }

  drawAimLine(ctx, state);
}

function drawPockets(ctx, table, r) {
  const { width, height, rail } = table;
  const pockets = [[rail, rail], [width / 2, rail], [width - rail, rail], [rail, height - rail], [width / 2, height - rail], [width - rail, height - rail]];
  ctx.fillStyle = '#111';
  for (const [x, y] of pockets) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAimLine(ctx, state) {
  if (state.phase !== 'aiming') return;
  const cue = state.balls.find((b) => b.id === 0);
  if (!cue || cue.sunk) return;

  const length = 140 + state.input.power * 0.1;
  const x2 = cue.x + Math.cos(state.input.aimAngle) * length;
  const y2 = cue.y + Math.sin(state.input.aimAngle) * length;

  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
