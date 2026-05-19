import { createInitialState } from './state.js';
import { stepPhysics } from './physics.js';
import { applyShot, updateRules } from './rules.js';

export function createReplayPlayer(savedShots) {
  const speeds = [0.5, 1, 2, 5];
  const runtime = {
    shots: Array.isArray(savedShots) ? savedShots : [],
    index: 0,
    playing: false,
    speed: 1,
    simState: null,
    warning: ''
  };

  function loadShot(index) {
    if (index < 0 || index >= runtime.shots.length) return null;
    runtime.index = index;
    const shot = runtime.shots[index];
    runtime.simState = createStateFromBalls(shot.ballsBefore);
    return shot;
  }

  function stepFrame(frameDt) {
    if (!runtime.playing || !runtime.simState) return;
    const shot = runtime.shots[runtime.index];
    if (!shot) return;

    if (!runtime.simState.__shotStarted) {
      applyShot(runtime.simState, shot.shotInput.angle, shot.shotInput.power);
      runtime.simState.__shotStarted = true;
    }

    const fixed = runtime.simState.config.fixedTimestep;
    let accum = frameDt * runtime.speed;
    while (accum >= fixed) {
      stepPhysics(runtime.simState, fixed);
      updateRules(runtime.simState);
      accum -= fixed;
      if (!runtime.simState.debug.moving && runtime.simState.phase !== 'shot') {
        const cmp = compareBalls(runtime.simState.balls, shot.ballsAfter);
        runtime.warning = cmp.ok ? '' : cmp.message;
        runtime.playing = false;
        break;
      }
    }
  }

  return {
    speeds,
    runtime,
    loadShot,
    stepFrame,
    play: () => { runtime.playing = true; },
    pause: () => { runtime.playing = false; },
    next: () => loadShot(Math.min(runtime.shots.length - 1, runtime.index + 1)),
    prev: () => loadShot(Math.max(0, runtime.index - 1)),
    setSpeed: (v) => { runtime.speed = speeds.includes(v) ? v : 1; }
  };
}

function createStateFromBalls(ballsBefore) {
  const s = createInitialState();
  s.players = [
    { name: 'Player 1', group: null, potted: [] },
    { name: 'Player 2', group: null, potted: [] }
  ];
  s.balls = ballsBefore.map((b) => ({ ...b }));
  s.phase = 'aiming';
  s.currentShotEvents = [];
  s.events = [];
  return s;
}

function compareBalls(actual, saved, eps = 1e-4) {
  if (!Array.isArray(saved) || actual.length !== saved.length) return { ok: false, message: 'Replay mismatch: ball counts differ.' };
  for (let i = 0; i < actual.length; i += 1) {
    const a = actual[i];
    const b = saved.find((x) => x.id === a.id);
    if (!b) return { ok: false, message: `Replay mismatch: missing ball ${a.id}.` };
    if (Math.abs(a.x - b.x) > eps || Math.abs(a.y - b.y) > eps || a.sunk !== b.sunk) {
      return { ok: false, message: `Replay mismatch on ball ${a.id}: computed (${a.x.toFixed(3)},${a.y.toFixed(3)}, sunk=${a.sunk}) vs saved (${b.x.toFixed(3)},${b.y.toFixed(3)}, sunk=${b.sunk}).` };
    }
  }
  return { ok: true, message: '' };
}
