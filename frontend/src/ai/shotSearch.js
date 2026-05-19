import { serializeState, deserializeState } from '../game/state.js';
import { stepPhysics } from '../game/physics.js';
import { applyShot, updateRules } from '../game/rules.js';

export const SEARCH_STRENGTHS = {
  fast: 200,
  good: 1000,
  strong: 5000,
  pro: 15000
};

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function runMonteCarloSearch(state, { strength = 'good', seed = 12345, timeoutMs = 1200, onProgress } = {}) {
  const budget = SEARCH_STRENGTHS[strength] ?? SEARCH_STRENGTHS.good;
  const rand = mulberry32(seed);
  let best = null;
  const start = performance.now();

  for (let i = 0; i < budget; i += 1) {
    if (performance.now() - start > timeoutMs) break;
    const shot = {
      angle: rand() * Math.PI * 2,
      power: 180 + rand() * 860,
      spinX: 0,
      spinY: 0
    };
    const candidate = simulateCandidate(state, shot);
    if (!best || candidate.score > best.score) best = candidate;

    if (i % 50 === 0 && onProgress) {
      onProgress({ checked: i + 1, budget, bestScore: best?.score ?? null });
    }
  }

  return best || { angle: 0, power: 0, spinX: 0, spinY: 0, score: -999, explanation: 'No candidate' };
}

export function simulateCandidate(state, shot) {
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

  const result = sim.lastShotResult || { foul: true, turnContinues: false, winner: null, reason: 'No result', pottedBalls: [], cueBallPotted: false, firstBallHit: null };
  const score = scoreShot(state, sim, result);
  return { angle: shot.angle, power: shot.power, spinX: 0, spinY: 0, score, explanation: explain(result, score) };
}

function scoreShot(before, after, result) {
  let score = 0;
  const myGroup = before.players[before.currentPlayerIndex]?.group;
  const oppGroup = oppositeGroup(myGroup);

  if (!result.foul) score += 60; else score -= 140;
  if (result.firstBallHit === null) score -= 120;
  if (result.cueBallPotted) score -= 150;

  const potted = result.pottedBalls || [];
  const ownPots = potted.filter((id) => groupForBall(id) === myGroup).length;
  score += ownPots * 35;

  if (result.winner === before.currentPlayerIndex && !result.foul) score += 450;
  if (potted.includes(8) && result.winner !== before.currentPlayerIndex) score -= 400;

  score += clearPathCueToTarget(after, result.firstBallHit) * 18;
  score += clearPathTargetToPocket(after, result.firstBallHit) * 20;
  score += cuePositionValue(after) * 0.4;
  score += legalNextShotsEstimate(after, myGroup) * 12;
  score += defensiveSafetyValue(after, oppGroup) * 10;
  score -= opponentDangerScore(after, oppGroup) * 14;

  return Number(score.toFixed(3));
}

function clearPathCueToTarget(state, firstBallHit) {
  if (!firstBallHit) return -2;
  const cue = state.balls.find((b) => b.id === 0 && !b.sunk);
  const target = state.balls.find((b) => b.id === firstBallHit && !b.sunk);
  if (!cue || !target) return -1;
  return lineClear(state, cue.x, cue.y, target.x, target.y) ? 1 : -1;
}
function clearPathTargetToPocket(state, ballId) {
  const t = state.balls.find((b) => b.id === ballId && !b.sunk);
  if (!t) return 0;
  const { width, height, rail } = state.table;
  const pockets = [[rail, rail], [width / 2, rail], [width - rail, rail], [rail, height - rail], [width / 2, height - rail], [width - rail, height - rail]];
  let best = -1;
  for (const [px, py] of pockets) if (lineClear(state, t.x, t.y, px, py)) best = 1;
  return best;
}
function cuePositionValue(state) { const c = state.balls.find((b) => b.id === 0 && !b.sunk); if (!c) return -180; const cx = state.table.width/2, cy=state.table.height/2; return Math.max(0, 160 - Math.hypot(c.x-cx,c.y-cy)); }
function legalNextShotsEstimate(state, group) { if (!group) return 1; return state.balls.filter((b)=>!b.sunk && groupForBall(b.id)===group).filter((b)=>lineClear(state, state.balls[0].x,state.balls[0].y,b.x,b.y)).length; }
function defensiveSafetyValue(state, oppGroup){ return Math.max(0, 4 - opponentDangerScore(state, oppGroup)); }
function opponentDangerScore(state, oppGroup){ if(!oppGroup) return 0; const cue=state.balls.find((b)=>b.id===0&&!b.sunk); if(!cue) return 10; return state.balls.filter((b)=>!b.sunk&&groupForBall(b.id)===oppGroup).reduce((n,b)=>n+(lineClear(state,cue.x,cue.y,b.x,b.y)?1:0),0); }
function lineClear(state,x1,y1,x2,y2){
  const r=state.table.ballRadius*1.9;
  for(const b of state.balls){ if(b.sunk) continue; if((b.x===x1&&b.y===y1)||(b.x===x2&&b.y===y2)) continue;
    const d=distToSegment(b.x,b.y,x1,y1,x2,y2); if(d<r) return false; }
  return true;
}
function distToSegment(px,py,x1,y1,x2,y2){ const dx=x2-x1,dy=y2-y1; const l2=dx*dx+dy*dy||1; let t=((px-x1)*dx+(py-y1)*dy)/l2; t=Math.max(0,Math.min(1,t)); const x=x1+t*dx,y=y1+t*dy; return Math.hypot(px-x,py-y); }
function explain(result, score){ return `${result.foul?'foul':'legal'} | pots:${(result.pottedBalls||[]).join(',')||'none'} | score=${score}`; }
function groupForBall(id){ if(id>=1&&id<=7)return 'solids'; if(id>=9&&id<=15)return 'stripes'; return null; }
function oppositeGroup(g){ if(g==='solids')return 'stripes'; if(g==='stripes')return 'solids'; return null; }
