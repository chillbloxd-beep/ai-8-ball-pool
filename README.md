# eight-ball-ai

Browser-first 8-ball pool prototype.

## Run locally (no build)
Open `frontend/index.html` in a modern browser.

## GitHub Pages deployment (static)
This project is designed to work with GitHub Pages as a static site (no build step required for v1).

### Option A: Serve from repository root
1. Copy or move the `frontend/` files to the publishing root used by Pages.
2. In GitHub: **Settings → Pages**.
3. Set source to the branch/folder containing `index.html`.
4. Save and wait for deployment.

### Option B: Serve `/frontend` folder via GitHub Actions
1. Enable GitHub Pages in repository settings.
2. Add a workflow that uploads `frontend/` as Pages artifact.
3. Deploy; GitHub will host the static files.

## Current v1 features
- Canvas-rendered pool table with rails and 6 pockets.
- Cue ball + 15 object balls.
- Mouse aiming and click-hold-release power shot.
- Basic physics + collisions + simple sink detection.
- Debug panel with FPS, current player, and moving status.
