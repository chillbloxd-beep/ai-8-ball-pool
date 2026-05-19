export function stepPhysics(state, dt) {
  const cfg = state.config;
  const events = [];

  for (const b of state.balls) {
    if (b.sunk) continue;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    applyFrictionAndCutoff(b, cfg, dt);
    resolveCushionCollision(b, cfg, events);
    resolvePocket(b, cfg, events);
  }

  resolveBallCollisions(state.balls, cfg, events);

  state.debug.moving = state.balls.some((b) => !b.sunk && Math.hypot(b.vx, b.vy) > cfg.minVelocity);
  state.events = events;
  state.debug.collisions = events.filter((e) => e.type === 'ball-ball' || e.type === 'cushion').length;
}

function applyFrictionAndCutoff(ball, cfg, dt) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed === 0) return;

  const reduced = Math.max(0, speed - cfg.rollingFriction * dt);
  const scale = speed === 0 ? 0 : reduced / speed;
  ball.vx *= scale;
  ball.vy *= scale;

  if (Math.hypot(ball.vx, ball.vy) < cfg.minVelocity) {
    ball.vx = 0;
    ball.vy = 0;
  }
}

function resolveCushionCollision(ball, cfg, events) {
  const minX = cfg.railSize + cfg.ballRadius;
  const maxX = cfg.tableWidth - cfg.railSize - cfg.ballRadius;
  const minY = cfg.railSize + cfg.ballRadius;
  const maxY = cfg.tableHeight - cfg.railSize - cfg.ballRadius;

  if (ball.x < minX) {
    ball.x = minX;
    ball.vx = Math.abs(ball.vx) * cfg.cushionBounce;
    events.push({ type: 'cushion', ballId: ball.id, side: 'left' });
  } else if (ball.x > maxX) {
    ball.x = maxX;
    ball.vx = -Math.abs(ball.vx) * cfg.cushionBounce;
    events.push({ type: 'cushion', ballId: ball.id, side: 'right' });
  }

  if (ball.y < minY) {
    ball.y = minY;
    ball.vy = Math.abs(ball.vy) * cfg.cushionBounce;
    events.push({ type: 'cushion', ballId: ball.id, side: 'top' });
  } else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy = -Math.abs(ball.vy) * cfg.cushionBounce;
    events.push({ type: 'cushion', ballId: ball.id, side: 'bottom' });
  }
}

function resolvePocket(ball, cfg, events) {
  const pockets = [
    [cfg.railSize, cfg.railSize],
    [cfg.tableWidth / 2, cfg.railSize],
    [cfg.tableWidth - cfg.railSize, cfg.railSize],
    [cfg.railSize, cfg.tableHeight - cfg.railSize],
    [cfg.tableWidth / 2, cfg.tableHeight - cfg.railSize],
    [cfg.tableWidth - cfg.railSize, cfg.tableHeight - cfg.railSize]
  ];

  for (let i = 0; i < pockets.length; i += 1) {
    const [x, y] = pockets[i];
    if (Math.hypot(ball.x - x, ball.y - y) <= cfg.pocketRadius) {
      ball.sunk = true;
      ball.vx = 0;
      ball.vy = 0;
      events.push({ type: 'pocket', ballId: ball.id, pocketIndex: i });
      return;
    }
  }
}

function resolveBallCollisions(balls, cfg, events) {
  const radius = cfg.ballRadius;
  const restitution = cfg.cushionBounce;
  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    if (a.sunk) continue;
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      if (b.sunk) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = radius * 2;
      if (dist === 0 || dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) * 0.5;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal > 0) continue;

      const impulse = -((1 + restitution) * velAlongNormal) / 2;
      const ix = impulse * nx;
      const iy = impulse * ny;
      a.vx -= ix;
      a.vy -= iy;
      b.vx += ix;
      b.vy += iy;

      events.push({ type: 'ball-ball', a: a.id, b: b.id });
    }
  }
}
