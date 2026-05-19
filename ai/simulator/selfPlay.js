import { simulateSingleGame } from './simulator.js';

export function runSelfPlay(config = {}) {
  const {
    totalGames = 200,
    seed = 20260519,
    matchup = 'random_vs_heuristic',
    resumeState = null,
    logEvery = 100,
    searchStrength = 'good',
    currentBestBot = 'shot_search',
    challengerBot = 'heuristic'
  } = config;

  const mapping = resolveMatchup(matchup, currentBestBot, challengerBot);
  const startedAt = new Date().toISOString();

  const state = resumeState || {
    version: 1,
    totalGames,
    seed,
    matchup,
    botA: mapping.botA,
    botB: mapping.botB,
    completedGames: 0,
    nextSeed: seed,
    stats: {
      winsA: 0,
      winsB: 0,
      draws: 0,
      shots: 0,
      fouls: 0,
      legalPots: 0,
      illegal8Losses: 0,
      searchMs: 0,
      searchCount: 0
    },
    shotsJsonl: [],
    gamesJsonl: []
  };

  for (let i = state.completedGames; i < state.totalGames; i += 1) {
    const gameSeed = state.nextSeed;
    state.nextSeed += 1;

    const game = simulateSingleGame({
      seed: gameSeed,
      botA: state.botA,
      botB: state.botB,
      searchStrength
    });

    // Game-level JSONL
    state.gamesJsonl.push(JSON.stringify(game.record));

    // Shot-level JSONL (from in-game summary available now as flattened approximation)
    // We preserve one record per shot index with game context for downstream ingestion.
    for (let s = 1; s <= game.shots; s += 1) {
      const shotRec = {
        type: 'self_play_shot',
        gameSeed,
        matchup: state.matchup,
        botA: state.botA,
        botB: state.botB,
        shotNumber: s,
        winner: game.winner,
        gameFouls: game.fouls,
        legalPotsInGame: game.legalPots,
        illegal8InGame: game.illegal8
      };
      state.shotsJsonl.push(JSON.stringify(shotRec));
    }

    accumulate(state.stats, game);
    state.completedGames += 1;

    if (state.completedGames % logEvery === 0 || state.completedGames === state.totalGames) {
      console.log(`[self-play] ${state.completedGames}/${state.totalGames} games complete`);
    }
  }

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    totalGames: state.totalGames,
    completedGames: state.completedGames,
    matchup: state.matchup,
    botA: state.botA,
    botB: state.botB,
    stats: finalize(state.stats, state.completedGames)
  };

  return {
    summary,
    resumeState: state,
    gamesJsonl: state.gamesJsonl.join('\n'),
    shotsJsonl: state.shotsJsonl.join('\n')
  };
}

export function canPromoteChallenger({ quickEvalSummary, largeEvalSummary, minQuickGames = 200, minLargeGames = 1000 }) {
  const quickOk = quickEvalSummary?.completedGames >= minQuickGames
    && quickEvalSummary.stats?.winRateB > quickEvalSummary.stats?.winRateA;

  const largeOk = largeEvalSummary?.completedGames >= minLargeGames
    && largeEvalSummary.stats?.winRateB > largeEvalSummary.stats?.winRateA;

  return {
    eligible: Boolean(quickOk && largeOk),
    quickOk: Boolean(quickOk),
    largeOk: Boolean(largeOk),
    reason: quickOk && largeOk
      ? 'Challenger beats current_best in both quick and large evaluation sets.'
      : 'Promotion blocked: challenger must beat current_best in 200-game quick eval and 1000+ game large eval.'
  };
}

function resolveMatchup(matchup, currentBestBot, challengerBot) {
  switch (matchup) {
    case 'random_vs_heuristic': return { botA: 'random', botB: 'heuristic' };
    case 'heuristic_vs_shot_search': return { botA: 'heuristic', botB: 'shot_search' };
    case 'shot_search_vs_shot_search': return { botA: 'shot_search', botB: 'shot_search' };
    case 'current_best_vs_challenger': return { botA: currentBestBot, botB: challengerBot };
    default: throw new Error(`Unsupported matchup: ${matchup}`);
  }
}

function accumulate(stats, game) {
  if (game.winner === 0) stats.winsA += 1;
  else if (game.winner === 1) stats.winsB += 1;
  else stats.draws += 1;
  stats.shots += game.shots;
  stats.fouls += game.fouls;
  stats.legalPots += game.legalPots;
  stats.illegal8Losses += game.illegal8;
  stats.searchMs += game.searchTime;
  stats.searchCount += game.searchCount;
}

function finalize(s, games) {
  return {
    winRateA: games ? s.winsA / games : 0,
    winRateB: games ? s.winsB / games : 0,
    drawRate: games ? s.draws / games : 0,
    averageShotsPerGame: games ? s.shots / games : 0,
    foulRate: s.shots ? s.fouls / s.shots : 0,
    legalPotRate: s.shots ? s.legalPots / s.shots : 0,
    illegal8BallLossRate: games ? s.illegal8Losses / games : 0,
    averageSearchTimeMs: s.searchCount ? s.searchMs / s.searchCount : 0
  };
}
