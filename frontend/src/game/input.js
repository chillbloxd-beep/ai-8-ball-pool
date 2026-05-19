export function attachInput(canvas, state, onShoot) {
  const getLocal = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  canvas.addEventListener('mousemove', (e) => {
    const cue = state.balls.find((b) => b.id === 0);
    if (!cue || cue.sunk) return;
    const p = getLocal(e);
    state.input.aimAngle = Math.atan2(p.y - cue.y, p.x - cue.x);

    if (state.input.charging) {
      const dist = Math.hypot(p.x - cue.x, p.y - cue.y);
      state.input.power = Math.min(state.input.maxPower, dist * 4);
    }
  });

  canvas.addEventListener('mousedown', () => {
    if (state.phase !== 'aiming') return;
    state.input.charging = true;
    state.input.power = 0;
  });

  canvas.addEventListener('mouseup', () => {
    if (state.phase !== 'aiming' || !state.input.charging) return;
    state.input.charging = false;
    onShoot(state.input.aimAngle, state.input.power);
    state.input.power = 0;
  });
}
