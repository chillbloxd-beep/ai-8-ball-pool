# Cloudflare Worker Backend (Web-First Path)

This backend exposes API routes for games, shots, and dataset export, and stores data in Supabase Postgres.

## Implemented routes
- `GET /health`
- `POST /api/games/start`
- `POST /api/shots`
- `GET /api/games/:gameId`
- `GET /api/games/:gameId/shots`
- `GET /api/dataset/export`

## Response format (stable)
All routes return:
```json
{ "ok": true|false, "data": <object|null>, "error": { "code": "...", "message": "..." } | null }
```

## Validation behavior
- Invalid JSON is rejected.
- Required fields are validated.
- Impossible shot values are rejected (e.g. negative/huge power, out-of-range spin).

## Supabase environment variables
Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGIN` (your GitHub Pages URL)

## Cloudflare Dashboard deployment (recommended)
1. Go to Cloudflare Dashboard → Workers & Pages.
2. Create a Worker.
3. Upload/paste `backend-cloudflare/worker.js`, `validation.js`, and `supabaseClient.js`.
4. In Settings → Variables, set:
   - `SUPABASE_URL`
   - `ALLOWED_ORIGIN`
5. In Settings → Secrets, add:
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Deploy.

## Optional local workflow
If you use Wrangler locally, start from `wrangler.toml.example`.

## Rate limiting
`worker.js` includes comments/placeholders for adding rate limiting via Durable Objects/KV or another edge-safe approach.
