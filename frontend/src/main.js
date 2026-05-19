import { createInitialState, serializeState, deserializeState } from './game/state.js';
import { render } from './game/renderer.js';
import { stepPhysics } from './game/physics.js';
import { attachInput } from './game/input.js';
import { applyShot, updateRules } from './game/rules.js';
import { createShotRecord, saveShotRecord, exportShotRecords, replaceShotRecords, clearShotRecords } from './game/replay.js';

const CLIENT_VERSION = 'frontend-v1';
const canvas = document.getElementById('table-canvas');
const debugPanel = document.getElementById('debug-panel');
const ctx = canvas.getContext('2d');

const state = createInitialState();
let lastTs = performance.now();
let accumulator = 0;
let lastRecordedShot = 0;

attachInput(canvas, state, (angle, power) => applyShot(state, angle, power));
wireDataButtons();
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

  maybeRecordShot();
  state.debug.fps = Math.round(1 / Math.max(frameDt, 1 / 240));
  render(ctx, state);
  renderDebug(state);
  requestAnimationFrame(loop);
}

function maybeRecordShot() {
  if (!state.lastShotResult || !state.shotContext) return;
  if (state.shotContext.shotNumber === lastRecordedShot) return;

  const record = createShotRecord({
    state,
    shotContext: state.shotContext,
    result: state.lastShotResult,
    events: state.currentShotEvents || [],
    clientVersion: CLIENT_VERSION
  });

  try {
    saveShotRecord(record);
    lastRecordedShot = state.shotContext.shotNumber;
  } catch (err) {
    console.error('Shot save failed:', err.message);
  }
}

function wireDataButtons() {
  document.getElementById('export-shots').addEventListener('click', () => {
    const blob = new Blob([exportShotRecords()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shot-records.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('import-shots').addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const records = JSON.parse(text);
        replaceShotRecords(records);
        alert('Import successful.');
      } catch (e) {
        alert(`Import failed: ${e.message}`);
      }
    };
    input.click();
  });

  document.getElementById('clear-shots').addEventListener('click', () => {
    if (!confirm('Clear all local shot records?')) return;
    clearShotRecords();
    alert('Local shot records cleared.');
  });
}

function runDeterminismTest(baseState) { const shot = { angle: 0.1, power: 650 }; const a = deserializeState(serializeState(baseState)); const b = deserializeState(serializeState(baseState)); applyShot(a, shot.angle, shot.power); applyShot(b, shot.angle, shot.power); simulateToRest(a); simulateToRest(b); const same = compareBallPositions(a, b, 1e-6); console.log(`Determinism test: ${same ? 'PASS' : 'FAIL'}`); state.debug.determinism = same ? 'PASS' : 'FAIL'; }
function simulateToRest(simState) { const fixed = simState.config.fixedTimestep; for (let i = 0; i < 10000; i += 1) { stepPhysics(simState, fixed); updateRules(simState); if (!simState.debug.moving && simState.phase === 'aiming') break; } }
function compareBallPositions(a, b, eps) { for (let i = 0; i < a.balls.length; i += 1) { const ba = a.balls[i], bb = b.balls[i]; if (Math.abs(ba.x - bb.x) > eps || Math.abs(ba.y - bb.y) > eps || ba.sunk !== bb.sunk) return false; } return true; }

function renderDebug(current) {
  const player = current.players[current.currentPlayerIndex]?.name || 'N/A';
  const moving = current.debug.moving ? 'Yes' : 'No';
  const eventCount = current.events.length;
  debugPanel.innerHTML = `
    <div class="debug-cell"><div class="label">FPS</div><div class="value">${current.debug.fps}</div></div>
    <div class="debug-cell"><div class="label">Current Player</div><div class="value">${player}</div></div>
    <div class="debug-cell"><div class="label">Balls Moving</div><div class="value">${moving}</div></div>
    <div class="debug-cell"><div class="label">Determinism</div><div class="value">${current.debug.determinism}</div></div>
    <div class="debug-cell"><div class="label">Events (frame)</div><div class="value">${eventCount}</div></div>
    <div class="debug-cell"><div class="label">Last Rule</div><div class="value">${current.debug.lastReason}</div></div>
  `;
}

requestAnimationFrame(loop);
