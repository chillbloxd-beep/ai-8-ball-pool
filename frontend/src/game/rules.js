export function updateRules(state) {
  if (state.phase === 'shot' && !state.debug.moving) {
    state.phase = 'aiming';
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }
}

export function applyShot(state, angle, power) {
  const cue = state.balls.find((b) => b.id === 0);
  if (!cue || cue.sunk || state.phase !== 'aiming') return;

  cue.vx = Math.cos(angle) * power;
  cue.vy = Math.sin(angle) * power;
  state.phase = 'shot';
  state.shotNumber += 1;
}
