const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function createSupabaseClient(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

  async function query(path, { method = 'GET', body, params } = {}) {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    const res = await fetch(`${url}/rest/v1/${path}${qs}`, {
      method,
      headers: { ...JSON_HEADERS, apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=representation' },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(data?.message || `Supabase error (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    insertGame: (payload) => query('games', { method: 'POST', body: payload }),
    getGame: (id) => query('games', { params: { id: `eq.${id}`, select: '*' } }),
    insertShot: (payload) => query('shots', { method: 'POST', body: payload }),
    getShotsByGame: (gameId) => query('shots', { params: { game_id: `eq.${gameId}`, order: 'shot_number.asc' } }),
    exportDataset: () => query('shots', { params: { select: 'id,game_id,shot_number,player_id,player_group,balls_before,shot_input,events,balls_after,result,quality_score,created_at' } })
  };
}
