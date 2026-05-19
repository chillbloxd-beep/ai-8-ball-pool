import { createSupabaseClient } from './supabaseClient.js';
import { parseJson, validateShot, validateStartGame } from './validation.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default {
  async fetch(request, env) {
    const cors = buildCorsHeaders(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      // Placeholder for rate limiting (recommended):
      // 1) Identify user/IP key
      // 2) Count requests in Durable Object / KV / external rate limiter
      // 3) Reject with 429 if threshold exceeded

      const url = new URL(request.url);
      const path = url.pathname;
      const supabase = createSupabaseClient(env);

      if (request.method === 'GET' && path === '/health') {
        return json({ ok: true, data: { service: 'eight-ball-worker', status: 'healthy' }, error: null }, 200, cors);
      }

      if (request.method === 'POST' && path === '/api/games/start') {
        const body = validateStartGame(await parseJson(request));
        const row = {
          game_code: body.gameCode,
          player1_user_id: body.player1Id,
          player2_user_id: body.player2Id,
          game_metadata: body.metadata,
          status: 'in_progress'
        };
        const [created] = await supabase.insertGame(row);
        return json({ ok: true, data: created, error: null }, 201, cors);
      }

      if (request.method === 'POST' && path === '/api/shots') {
        const body = validateShot(await parseJson(request));
        const row = {
          game_id: body.gameId,
          shot_number: body.shotNumber,
          player_id: body.playerId,
          player_group: body.playerGroup,
          balls_before: body.ballsBefore,
          shot_input: body.shotInput,
          events: body.events,
          balls_after: body.ballsAfter,
          result: body.result,
          quality_score: body.qualityScore ?? null
        };
        const [created] = await supabase.insertShot(row);
        return json({ ok: true, data: created, error: null }, 201, cors);
      }

      const gameMatch = path.match(/^\/api\/games\/([0-9a-fA-F-]+)$/);
      if (request.method === 'GET' && gameMatch) {
        const rows = await supabase.getGame(gameMatch[1]);
        return json({ ok: true, data: rows[0] || null, error: null }, 200, cors);
      }

      const shotsMatch = path.match(/^\/api\/games\/([0-9a-fA-F-]+)\/shots$/);
      if (request.method === 'GET' && shotsMatch) {
        const rows = await supabase.getShotsByGame(shotsMatch[1]);
        return json({ ok: true, data: rows, error: null }, 200, cors);
      }

      if (request.method === 'GET' && path === '/api/dataset/export') {
        const rows = await supabase.exportDataset();
        return json({ ok: true, data: { rows, format: 'shot-json' }, error: null }, 200, cors);
      }

      return json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404, cors);
    } catch (err) {
      const status = err.status || 500;
      return json({ ok: false, data: null, error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Unexpected error' } }, status, cors);
    }
  }
};

function json(payload, status, cors) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...cors } });
}

function buildCorsHeaders(env, request) {
  const allowed = (env.ALLOWED_ORIGIN || '').trim();
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = origin && origin === allowed ? origin : allowed || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    Vary: 'Origin'
  };
}
