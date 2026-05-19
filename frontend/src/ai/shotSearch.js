import { serializeState, deserializeState } from '../game/state.js';
import { stepPhysics } from '../game/physics.js';
import { applyShot, updateRules } from '../game/rules.js';

const ANGLE_STEP_DEG = 10;
const POWER_LEVELS = [250, 450, 650, 850];

export function suggestBestShot(state) {
  const candidates = generateCandidates();
  let best = null;

  for (const c of candidates) {
    const simulated = simulateCandidate(state, c);
    if (!best || simulated.score > best.score) best = simulated;
  }

  return best || {
    angle: 0,
    power: 0,
    spinX: 0,
    spinY: 0,
    score: -999,
    explanation: 'No valid candidate found'
  };
}

function generateCandidates() {
  const list = [];
  for (let deg = 0; deg < 360; deg += ANGLE_STEP_DEG) {
    const angle = (deg * Math.PI) / 180;
    for (const power of POWER_LEVELS) {
      list.push({ angle, power, spinX: 0, spinY: 0 });
    }
  }
  return list;
}

function simulateCandidate(state, shot) {
  const sim = deserializeState(serializeState(state));
  sim.phase = 'aiming';
  sim.currentShotEvents = [];
  sim.events = [];

  applyShot(sim, shot.angle, shot.power);

  const fixed = sim.config.fixedTimestep;
  for (let i = 0; i < 12000; i += 1) {
    stepPhysics(sim, fixed);
    updateRules(sim);
    if (!sim.debug.moving && sim.phase !== 'shot') break;
  }

  const result = sim.lastShotResult || {
    foul: true,
    turnContinues: false,
    winner: null,
    reason: 'No resolved result',
    pottedBalls: [],
    cueBallPotted: false,
    firstBallHit: null
  };

  const score = scoreShot(state, sim, shot, result);
  return {
    angle: shot.angle,
    power: shot.power,
    spinX: 0,
    spinY: 0,
    score,
    explanation: explainScore(result, score)
  };
}

function scoreShot(before, after, shot, result) {
  let score = 0;

  if (!result.foul) score += 30;
  if (result.foul) score -= 60;

  const potted = result.pottedBalls || [];
  const myGroup = before.players[before.currentPlayerIndex]?.group;

  const pottedOwn = potted.filter((id) => groupForBall(id) === myGroup).length;
  score += pottedOwn * 25;

  if (result.winner === before.currentPlayerIndex && !result.foul) score += 400;
  if (potted.includes(8) && result.winner !== before.currentPlayerIndex) score -= 300;

  if (result.cueBallPotted) score -= 120;
  if (result.firstBallHit === null) score -= 140;

  if (result.turnContinues) score += 45;

  // crude position heuristic: prefer cue ball near center and not sunk
  const cue = after.balls.find((b) => b.id === 0);
  if (!cue || cue.sunk) {
    score -= 100;
  } else {
    const cx = after.table.width / 2;
    const cy = after.table.height / 2;
    const d = Math.hypot(cue.x - cx, cue.y - cy);
    score += Math.max(0, 80 - d * 0.1);
  }

  // punish likely easy opponent leave: many opponent balls with direct line from cue
  const oppGroup = oppositeGroup(myGroup);
  if (oppGroup) {
    const easyTargets = countOpenTargets(after, oppGroup);
    score -= easyTargets * 8;
  }

  return Number(score.toFixed(3));
}

function countOpenTargets(state, group) {
  const cue = state.balls.find((b) => b.id === 0);
  if (!cue || cue.sunk) return 10;
  const targets = state.balls.filter((b) => !b.sunk && groupForBall(b.id) === group);
  let open = 0;
  for (const t of targets) {
    const dx = t.x - cue.x;
    const dy = t.y - cue.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 260) open += 1;
  }
  return open;
}

function explainScore(result, score) {
  const bits = [];
  bits.push(result.foul ? 'foul' : 'legal');
  if (result.pottedBalls?.length) bits.push(`potted ${result.pottedBalls.join(',')}`);
  if (result.cueBallPotted) bits.push('scratch');
  if (result.winner !== null) bits.push(`winner=${result.winner}`);
  bits.push(`score=${score}`);
  return bits.join(' | ');
}

function groupForBall(ballId) {
  if (ballId >= 1 && ballId <= 7) return 'solids';
  if (ballId >= 9 && ballId <= 15) return 'stripes';
  return null;
}

function oppositeGroup(g) {
  if (g === 'solids') return 'stripes';
  if (g === 'stripes') return 'solids';
  return null;
}
