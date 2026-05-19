# AI Self-Play Workflow (Web Notebook Friendly)

This workflow runs AI-vs-AI matches in the headless simulator and exports JSONL for training/evaluation.

## 1) Supported matchups
- `random_vs_heuristic`
- `heuristic_vs_shot_search`
- `shot_search_vs_shot_search`
- `current_best_vs_challenger`

## 2) Run self-play in notebook/browser JS runtime
```javascript
import { runSelfPlay } from './ai/simulator/selfPlay.js';

const out = runSelfPlay({
  totalGames: 200,
  seed: 42,
  matchup: 'heuristic_vs_shot_search',
  searchStrength: 'good',
  logEvery: 100
});

console.log(out.summary);
// Save out.shotsJsonl and out.gamesJsonl to notebook artifacts/storage.
```

## 3) Resume interrupted runs
Use `resumeState` from previous output:
```javascript
const resumed = runSelfPlay({
  resumeState: previous.resumeState,
  searchStrength: 'good',
  logEvery: 100
});
```

## 4) Promotion rule (current_best vs challenger)
A challenger can be promoted only if it beats `current_best` on both:
- quick gate: **200 games**
- large gate: **1000+ games**

Use:
```javascript
import { canPromoteChallenger } from './ai/simulator/selfPlay.js';

const decision = canPromoteChallenger({
  quickEvalSummary,   // from 200-game run
  largeEvalSummary    // from 1000+ game run
});
console.log(decision);
```

If `decision.eligible` is `true`, challenger promotion is allowed.

## 5) Progress + outputs
- Progress logs every 100 games by default.
- Summary stats are returned after each run.
- Shot-level and game-level JSONL are returned for downstream pipelines.
