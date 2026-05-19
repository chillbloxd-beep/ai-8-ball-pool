# Asset Policy and Safe Image Sources

This project supports optional local image assets with mandatory attribution metadata in `frontend/assets/assets.json`.

## Allowed asset sources
- Public domain assets.
- Creative Commons assets **with proper attribution** and license compatibility.
- Purchased assets where project usage rights are documented.
- Self-made assets created by the project team.
- Generated assets where usage rights permit commercial/project use.

## Not allowed
- Hotlinking random internet images directly in the app.
- Using copyrighted assets without explicit permission/license terms.
- Importing assets without manifest attribution metadata.

## Manifest requirements
Each asset entry must include:
- `name`
- `path`
- `sourceUrl`
- `license`
- `author`
- `notes`

## Runtime behavior
- The renderer attempts to preload local assets.
- If an asset fails to load, the game falls back to generated canvas shapes.
- Gameplay never depends on image load success.
