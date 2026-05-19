# Headless Pool Simulator (No Canvas)

Location: `ai/simulator/`

This simulator reuses frontend game logic modules (`state`, `physics`, `rules`, and `shotSearch`) and runs **without graphics** for faster offline simulation.

## Bot types
- `random`
- `heuristic`
- `shot_search`

## Outputs
`simulateManyGames()` returns:
- `stats`
  - win rate
  - average shots per game
  - foul rate
  - legal pot rate
  - illegal 8-ball loss rate
  - average search time
- `jsonl`
  - one JSON object per game line (JSONL format)

## Determinism
Provide a `seed` to make game generation and bot randomness reproducible.

## Browser / notebook usage (Google Colab or Kaggle)
Recommended web-only path:
1. Open a Colab/Kaggle notebook.
2. Clone or upload this repo files.
3. Use a JavaScript runtime cell (or Node runtime in notebook environment).
4. Run:
   ```javascript
   import { runSimulation } from './ai/simulator/runSimulation.js';
   const { stats, jsonl } = runSimulation({
     numGames: 200,
     seed: 42,
     botA: 'shot_search',
     botB: 'heuristic',
     searchStrength: 'good'
   });
   console.log(stats);
   ```
5. Save `jsonl` to a file/artifact in notebook storage for downstream training.

## Node quick run (optional)
```bash
node ai/simulator/runSimulation.js
```

This is optional; notebook/browser workflows remain the recommended path.
