import { createInitialState, serializeState, deserializeState } from './game/state.js';
import { render } from './game/renderer.js';
import { stepPhysics } from './game/physics.js';
import { attachInput } from './game/input.js';
import { applyShot, updateRules } from './game/rules.js';
import { recordFrame } from './game/replay.js';

const canvas = document.getElementById('table-canvas');
const debugPanel = document.getElementById('debug-panel');
const ctx = canvas.getContext('2d');

const state = createInitialState();
let lastTs = performance.now();
let accumulator = 0;

attachInput(canvas, state, (angle, power) => applyShot(state, angle, power));
runDeterminismTest(state);

function loop(ts) {
  const frameDt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  accumulator += frameDt;

  const fixed = state.config.fixedTimestep;
  let substeps = 0;
  while (accumulator >= fixed && substeps < state.config.maxSubstepsPerFrame) {
    stepPhysics(state, fixed);
    updateRules(state);
    accumulator -= fixed;
    substeps += 1;
  }

  recordFrame(state);
  state.debug.fps = Math.round(1 / Math.max(frameDt, 1 / 240));
  render(ctx, state);
  renderDebug(state);
  requestAnimationFrame(loop);
}

function runDeterminismTest(baseState) {
  const shot = { angle: 0.1, power: 650 };
  const a = deserializeState(serializeState(baseState));
  const b = deserializeState(serializeState(baseState));

  applyShot(a, shot.angle, shot.power);
  applyShot(b, shot.angle, shot.power);

  simulateToRest(a);
  simulateToRest(b);

  const same = compareBallPositions(a, b, 1e-6);
  const msg = `Determinism test: ${same ? 'PASS' : 'FAIL'}`;
  console.log(msg, { first: summarize(a), second: summarize(b) });
  state.debug.determinism = same ? 'PASS' : 'FAIL';
}

function simulateToRest(simState) {
  const fixed = simState.config.fixedTimestep;
  for (let i = 0; i < 10000; i += 1) {
    stepPhysics(simState, fixed);
    updateRules(simState);
    if (!simState.debug.moving && simState.phase === 'aiming') break;
  }
}

function compareBallPositions(a, b, epsilon) {
  for (let i = 0; i < a.balls.length; i += 1) {
    const ba = a.balls[i];
    const bb = b.balls[i];
    if (Math.abs(ba.x - bb.x) > epsilon || Math.abs(ba.y - bb.y) > epsilon || ba.sunk !== bb.sunk) {
      return false;
    }
  }
  return true;
}

function summarize(s) {
  return s.balls.map((b) => ({ id: b.id, x: +b.x.toFixed(4), y: +b.y.toFixed(4), sunk: b.sunk }));
}

function renderDebug(current) {
  const player = current.players[current.currentPlayerIndex];
  const moving = current.debug.moving ? 'Yes' : 'No';
  const eventCount = current.events.length;
  debugPanel.innerHTML = `
    <div class="debug-cell"><div class="label">FPS</div><div class="value">${current.debug.fps}</div></div>
    <div class="debug-cell"><div class="label">Current Player</div><div class="value">${player}</div></div>
    <div class="debug-cell"><div class="label">Balls Moving</div><div class="value">${moving}</div></div>
    <div class="debug-cell"><div class="label">Determinism</div><div class="value">${current.debug.determinism}</div></div>
    <div class="debug-cell"><div class="label">Events (frame)</div><div class="value">${eventCount}</div></div>
    <div class="debug-cell"><div class="label">Collisions</div><div class="value">${current.debug.collisions}</div></div>
  `;
}

requestAnimationFrame(loop);
