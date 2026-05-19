import { createInitialState, serializeState, deserializeState } from '../../frontend/src/game/state.js';
import { stepPhysics } from '../../frontend/src/game/physics.js';
import { applyShot, updateRules } from '../../frontend/src/game/rules.js';
import { runMonteCarloSearch } from '../../frontend/src/ai/shotSearch.js';

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateManyGames({ numGames = 100, seed = 1234, botA = 'random', botB = 'heuristic', searchStrength = 'fast' } = {}) {
  const rand = mulberry32(seed);
  const records = [];
  const stats = {
    games: 0, winsA: 0, winsB: 0, shots: 0, fouls: 0, legalPots: 0, illegal8Losses: 0, searchMs: 0, searchCount: 0
  };

  for (let g = 0; g < numGames; g += 1) {
    const gameSeed = Math.floor(rand() * 1e9);
    const game = simulateSingleGame({ seed: gameSeed, botA, botB, searchStrength });
    records.push(game.record);
    aggregate(stats, game);
  }

  return {
    stats: finalizeStats(stats),
    jsonl: records.map((r) => JSON.stringify(r)).join('\n')
  };
}

export function simulateSingleGame({ seed = 1, botA = 'random', botB = 'heuristic', searchStrength = 'fast' } = {}) {
  const rand = mulberry32(seed);
  const state = createInitialState();
  let shotCounter = 0;
  let foulCounter = 0;
  let legalPots = 0;
  let illegal8 = 0;
  let searchTime = 0;
  let searchCount = 0;

  while (state.phase !== 'game-over' && shotCounter < 300) {
    if (state.phase !== 'aiming') {
      fastForwardToAim(state);
      continue;
    }

    const botType = state.currentPlayerIndex === 0 ? botA : botB;
    const t0 = performance.now();
    const shot = chooseShot(state, botType, rand, searchStrength);
    if (botType === 'shot_search') {
      searchTime += performance.now() - t0;
      searchCount += 1;
    }

    applyShot(state, shot.angle, shot.power);
    fastForwardToAim(state);
    shotCounter += 1;

    const r = state.lastShotResult;
    if (!r) continue;
    if (r.foul) foulCounter += 1;
    if (!r.foul && (r.pottedBalls?.length || 0) > 0) legalPots += 1;
    if (r.reason?.includes('illegal 8-ball')) illegal8 += 1;
  }

  const winner = state.winner;
  const record = {
    type: 'sim_game', seed, botA, botB, winner, shots: shotCounter, fouls: foulCounter,
    legalPots, illegal8Losses: illegal8, avgSearchMs: searchCount ? searchTime / searchCount : 0,
    endedAt: new Date().toISOString()
  };

  return {
    record,
    winner,
    shots: shotCounter,
    fouls: foulCounter,
    legalPots,
    illegal8,
    searchTime,
    searchCount
  };
}

function fastForwardToAim(state) {
  const fixed = state.config.fixedTimestep;
  for (let i = 0; i < 12000; i += 1) {
    stepPhysics(state, fixed);
    updateRules(state);
    if (!state.debug.moving && state.phase !== 'shot') break;
  }
}

function chooseShot(state, botType, rand, searchStrength) {
  if (botType === 'random') {
    return { angle: rand() * Math.PI * 2, power: 150 + rand() * 900 };
  }
  if (botType === 'shot_search') {
    const suggestion = runMonteCarloSearch(deserializeState(serializeState(state)), { strength: searchStrength, seed: Math.floor(rand() * 1e9), timeoutMs: 500 });
    return { angle: suggestion.angle, power: suggestion.power };
  }
  // heuristic
  const cue = state.balls.find((b) => b.id === 0 && !b.sunk);
  const target = pickHeuristicTarget(state, rand);
  if (!cue || !target) return { angle: rand() * Math.PI * 2, power: 400 };
  return {
    angle: Math.atan2(target.y - cue.y, target.x - cue.x),
    power: 350 + rand() * 300
  };
}

function pickHeuristicTarget(state, rand) {
  const me = state.players[state.currentPlayerIndex];
  let pool = state.balls.filter((b) => !b.sunk && b.id >= 1 && b.id <= 15);
  if (me.group === 'solids') pool = pool.filter((b) => b.id <= 7);
  if (me.group === 'stripes') pool = pool.filter((b) => b.id >= 9);
  if (!pool.length) return null;
  return pool[Math.floor(rand() * pool.length)];
}

function aggregate(stats, g) {
  stats.games += 1;
  if (g.winner === 0) stats.winsA += 1;
  if (g.winner === 1) stats.winsB += 1;
  stats.shots += g.shots;
  stats.fouls += g.fouls;
  stats.legalPots += g.legalPots;
  stats.illegal8Losses += g.illegal8;
  stats.searchMs += g.searchTime;
  stats.searchCount += g.searchCount;
}

function finalizeStats(s) {
  return {
    games: s.games,
    winRateA: s.games ? s.winsA / s.games : 0,
    winRateB: s.games ? s.winsB / s.games : 0,
    averageShotsPerGame: s.games ? s.shots / s.games : 0,
    foulRate: s.shots ? s.fouls / s.shots : 0,
    legalPotRate: s.shots ? s.legalPots / s.shots : 0,
    illegal8BallLossRate: s.games ? s.illegal8Losses / s.games : 0,
    averageSearchTimeMs: s.searchCount ? s.searchMs / s.searchCount : 0
  };
}
