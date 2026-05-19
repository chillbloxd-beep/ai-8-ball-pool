import { simulateManyGames } from './simulator.js';

export function runSimulation(config = {}) {
  return simulateManyGames(config);
}

if (typeof process !== 'undefined' && process.argv?.[1]?.includes('runSimulation.js')) {
  const result = runSimulation({ numGames: 50, seed: 20260519, botA: 'shot_search', botB: 'heuristic', searchStrength: 'fast' });
  console.log(JSON.stringify(result.stats, null, 2));
  console.log('\n--- JSONL SAMPLE ---\n');
  console.log(result.jsonl.split('\n').slice(0, 3).join('\n'));
}
