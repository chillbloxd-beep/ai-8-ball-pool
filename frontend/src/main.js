import { createInitialState, serializeState, deserializeState } from './game/state.js';
import { render } from './game/renderer.js';
import { stepPhysics } from './game/physics.js';
import { attachInput } from './game/input.js';
import { applyShot, updateRules } from './game/rules.js';
import { createShotRecord, saveShotRecord, exportShotRecords, replaceShotRecords, clearShotRecords, loadShotRecords, enqueueShotForUpload, loadUploadQueue, saveUploadQueue } from './game/replay.js';
import { postShotRecord } from './api/client.js';
import { createReplayPlayer } from './game/replayPlayer.js';
import { loadAssetManifest, preloadAssets } from './assetsConfig.js';
import { runMonteCarloSearch } from './ai/shotSearch.js';

const CLIENT_VERSION = 'frontend-v1';
const canvas = document.getElementById('table-canvas');
const debugPanel = document.getElementById('debug-panel');
const replayMeta = document.getElementById('replay-meta');
const shotSyncStatusEl = document.getElementById('shot-sync-status');
const ctx = canvas.getContext('2d');
const assetStatusEl = document.getElementById('asset-status');
const aiShotStatusEl = document.getElementById('ai-shot-status');

const state = createInitialState();
let lastTs = performance.now();
let accumulator = 0;
let lastRecordedShot = 0;
let replayPlayer = null;
let renderAssets = null;
let shotSyncStatus = 'local only';
let lastAiSuggestion = null;
let aiWorker = null;
let aiThinking = false;

attachInput(canvas, state, (angle, power) => {
  if (replayPlayer) return;
  applyShot(state, angle, power);
});
wireDataButtons();
wireReplayControls();
wireSyncButtons();
wireAiButtons();
updateShotSyncStatus();
runDeterminismTest(state);
initAssets();

function loop(ts) {
  const frameDt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  if (replayPlayer) {
    replayPlayer.stepFrame(frameDt);
    if (replayPlayer.runtime.simState) {
      render(ctx, replayPlayer.runtime.simState, renderAssets);
      renderReplayMeta(replayPlayer);
    }
  } else {
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
    render(ctx, state, renderAssets);
  }

  state.debug.fps = Math.round(1 / Math.max(frameDt, 1 / 240));
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
    enqueueShotForUpload(record);
    shotSyncStatus = 'syncing';
    updateShotSyncStatus();
    syncLocalShots();
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

function wireReplayControls() {
  document.getElementById('replay-load').addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const shots = JSON.parse(text);
        replayPlayer = createReplayPlayer(shots);
        replayPlayer.loadShot(0);
        renderReplayMeta(replayPlayer);
      } catch (e) {
        alert(`Replay load failed: ${e.message}`);
      }
    };
    input.click();
  });

  document.getElementById('replay-play').addEventListener('click', () => replayPlayer?.play());
  document.getElementById('replay-pause').addEventListener('click', () => replayPlayer?.pause());
  document.getElementById('replay-next').addEventListener('click', () => {
    replayPlayer?.next();
    replayPlayer?.pause();
    renderReplayMeta(replayPlayer);
  });
  document.getElementById('replay-prev').addEventListener('click', () => {
    replayPlayer?.prev();
    replayPlayer?.pause();
    renderReplayMeta(replayPlayer);
  });
  document.getElementById('replay-speed').addEventListener('change', (e) => replayPlayer?.setSpeed(Number(e.target.value)));
}

function renderReplayMeta(player) {
  if (!player || !player.runtime.shots.length) {
    replayMeta.innerHTML = '';
    return;
  }

  const shot = player.runtime.shots[player.runtime.index];
  const potted = (shot.events?.pottedBalls || []).join(', ') || 'None';
  const mismatch = player.runtime.warning
    ? `<div class="debug-cell"><div class="label">Determinism</div><div class="value">⚠️ MISMATCH</div></div>
       <div class="debug-cell"><div class="label">Mismatch</div><div class="value">${player.runtime.warning}</div></div>`
    : '<div class="debug-cell"><div class="label">Determinism</div><div class="value">PASS</div></div>';

  replayMeta.innerHTML = `
    <div class="debug-cell"><div class="label">Shot</div><div class="value">${shot.shotNumber}</div></div>
    <div class="debug-cell"><div class="label">Player</div><div class="value">${shot.playerId}</div></div>
    <div class="debug-cell"><div class="label">Angle</div><div class="value">${shot.shotInput.angle.toFixed(3)}</div></div>
    <div class="debug-cell"><div class="label">Power</div><div class="value">${shot.shotInput.power.toFixed(1)}</div></div>
    <div class="debug-cell"><div class="label">Potted Balls</div><div class="value">${potted}</div></div>
    <div class="debug-cell"><div class="label">Foul</div><div class="value">${shot.result.foul ? 'Yes' : 'No'}</div></div>
    <div class="debug-cell"><div class="label">Reason</div><div class="value">${shot.result.reason}</div></div>
    ${mismatch}
  `;
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
  console.log(`Determinism test: ${same ? 'PASS' : 'FAIL'}`);
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

function compareBallPositions(a, b, eps) {
  for (let i = 0; i < a.balls.length; i += 1) {
    const ba = a.balls[i];
    const bb = b.balls[i];
    if (Math.abs(ba.x - bb.x) > eps || Math.abs(ba.y - bb.y) > eps || ba.sunk !== bb.sunk) return false;
  }
  return true;
}

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


async function initAssets() {
  try {
    assetStatusEl.textContent = 'Assets: loading manifest...';
    const manifest = await loadAssetManifest();
    const result = await preloadAssets(manifest, ({ loaded, total, name, ok }) => {
      assetStatusEl.textContent = `Assets: ${loaded}/${total} loaded (${name}: ${ok ? 'ok' : 'fallback'})`;
    });
    renderAssets = result.images;
    const failures = Object.values(result.images).filter((v) => !v.ok).length;
    assetStatusEl.textContent = failures ? `Assets loaded with ${failures} fallback(s).` : 'Assets loaded successfully.';
  } catch (err) {
    renderAssets = null;
    assetStatusEl.textContent = `Assets unavailable, using shape fallback. (${err.message})`;
  }
}


function updateShotSyncStatus() {
  if (!shotSyncStatusEl) return;
  shotSyncStatusEl.textContent = `Shot Sync: ${shotSyncStatus}`;
}

async function syncLocalShots() {
  const queue = loadUploadQueue();
  if (!queue.length) {
    shotSyncStatus = 'online saved';
    updateShotSyncStatus();
    return;
  }

  shotSyncStatus = 'syncing';
  updateShotSyncStatus();

  const remaining = [];
  for (const record of queue) {
    try {
      await postShotRecord(record);
    } catch (err) {
      remaining.push(record);
    }
  }

  saveUploadQueue(remaining);
  shotSyncStatus = remaining.length ? 'upload failed' : 'online saved';
  updateShotSyncStatus();
}

function wireSyncButtons() {
  document.getElementById('sync-local-shots').addEventListener('click', async () => {
    await syncLocalShots();
  });

  document.getElementById('export-local-dataset').addEventListener('click', () => {
    const dataset = {
      exportedAt: new Date().toISOString(),
      count: loadShotRecords().length,
      shots: loadShotRecords()
    };
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'local-shot-dataset.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}


function wireAiButtons() {
  document.getElementById('ai-suggest-shot').addEventListener('click', async () => {
    if (replayPlayer || aiThinking) return;
    aiThinking = true;
    const strength = document.getElementById('ai-strength').value;
    aiShotStatusEl.textContent = `AI Shot: thinking... (0%) strength=${strength}`;
    try {
      const suggestion = await suggestShotViaWorker(state, strength, 20260519, 2500);
      lastAiSuggestion = suggestion;
      aiShotStatusEl.textContent = `AI Shot: angle=${suggestion.angle.toFixed(3)} power=${suggestion.power.toFixed(1)} score=${suggestion.score} | ${suggestion.explanation}`;
      state.input.aimAngle = suggestion.angle;
      state.input.power = suggestion.power;
    } catch (e) {
      aiShotStatusEl.textContent = `AI Shot: fallback due to timeout/error (${e.message})`;
      lastAiSuggestion = runMonteCarloSearch(state, { strength: 'fast', seed: 20260519, timeoutMs: 700 });
    } finally {
      aiThinking = false;
    }
  });

  document.getElementById('ai-take-shot').addEventListener('click', () => {
    if (replayPlayer) return;
    if (!lastAiSuggestion) {
      lastAiSuggestion = suggestBestShot(state);
    }
    applyShot(state, lastAiSuggestion.angle, lastAiSuggestion.power);
    aiShotStatusEl.textContent = `AI Shot taken: score=${lastAiSuggestion.score}`;
  });
}


function suggestShotViaWorker(stateObj, strength, seed, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!aiWorker) aiWorker = new Worker('./ai/shotSearchWorker.js', { type: 'module' });
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('AI search timeout'));
    }, timeoutMs);

    aiWorker.onmessage = (ev) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        const pct = Math.min(100, Math.round((msg.checked / msg.budget) * 100));
        aiShotStatusEl.textContent = `AI Shot: thinking... (${pct}%) best=${msg.bestScore ?? 'n/a'}`;
      }
      if (msg.type === 'done' && !done) {
        done = true;
        clearTimeout(timer);
        resolve(msg.result);
      }
    };

    aiWorker.onerror = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(new Error(err.message || 'AI worker error'));
    };

    aiWorker.postMessage({ state: stateObj, options: { strength, seed, timeoutMs: Math.max(200, timeoutMs - 100) } });
  });
}
