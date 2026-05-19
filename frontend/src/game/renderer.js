const BALL_COLORS = { cue: '#ffffff', solid: '#ffce32', stripe: '#2d9bff', eight: '#111111' };

export function render(ctx, state, renderAssets = null) {
  const { width, height, rail, pocketRadius, ballRadius } = state.table;
  ctx.clearRect(0, 0, width, height);

  drawTable(ctx, state.table, renderAssets);
  drawPockets(ctx, state.table, pocketRadius, renderAssets);

  for (const b of state.balls) {
    if (b.sunk) continue;
    drawBall(ctx, b, ballRadius, renderAssets);
  }

  drawAimLine(ctx, state, renderAssets);
}

function drawTable(ctx, table, renderAssets) {
  const { width, height, rail } = table;
  ctx.fillStyle = '#5f3b22';
  roundRect(ctx, 0, 0, width, height, 16);
  ctx.fill();

  const railTexture = renderAssets?.['rail-texture'];
  if (railTexture?.ok) {
    const pattern = ctx.createPattern(railTexture.image, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      roundRect(ctx, 0, 0, width, height, 16);
      ctx.fill();
    }
  }

  const cloth = renderAssets?.['table-cloth'];
  if (cloth?.ok) {
    const pattern = ctx.createPattern(cloth.image, 'repeat');
    ctx.fillStyle = pattern || '#0f7146';
  } else {
    ctx.fillStyle = '#0f7146';
  }

  roundRect(ctx, rail / 2, rail / 2, width - rail, height - rail, 10);
  ctx.fill();
}

function drawPockets(ctx, table, r, renderAssets) {
  const { width, height, rail } = table;
  const pockets = [[rail, rail], [width / 2, rail], [width - rail, rail], [rail, height - rail], [width / 2, height - rail], [width - rail, height - rail]];
  const pocketImg = renderAssets?.pocket;
  for (const [x, y] of pockets) {
    if (pocketImg?.ok) {
      ctx.drawImage(pocketImg.image, x - r, y - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
    }
  }
}

function drawBall(ctx, ball, r, renderAssets) {
  const cueImg = renderAssets?.['cue-ball'];
  const objImg = renderAssets?.['object-ball'];

  const chosen = ball.type === 'cue' ? cueImg : objImg;
  if (chosen?.ok) {
    ctx.drawImage(chosen.image, ball.x - r, ball.y - r, r * 2, r * 2);
    return;
  }

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  ctx.fillStyle = BALL_COLORS[ball.type] || '#ddd';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (ball.type !== 'cue') {
    ctx.fillStyle = ball.type === 'eight' ? '#fff' : '#0c2d4f';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ball.id), ball.x, ball.y);
  }
}

function drawAimLine(ctx, state, renderAssets) {
  if (state.phase !== 'aiming') return;
  const cue = state.balls.find((b) => b.id === 0);
  if (!cue || cue.sunk) return;

  const length = 140 + state.input.power * 0.1;
  const x2 = cue.x + Math.cos(state.input.aimAngle) * length;
  const y2 = cue.y + Math.sin(state.input.aimAngle) * length;

  const cueImg = renderAssets?.cue;
  if (cueImg?.ok) {
    const angle = state.input.aimAngle;
    ctx.save();
    ctx.translate(cue.x, cue.y);
    ctx.rotate(angle);
    ctx.drawImage(cueImg.image, -length, -3, length, 6);
    ctx.restore();
    return;
  }

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
