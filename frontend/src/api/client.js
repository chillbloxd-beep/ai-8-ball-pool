import { validateShotRecord } from '../game/replay.js';

export const API_BASE_URL = window.EIGHT_BALL_API_BASE_URL || 'https://example-worker.yourdomain.workers.dev';

export async function postShotRecord(record) {
  if (!validateShotRecord(record)) throw new Error('Invalid shot record payload');

  const res = await fetch(`${API_BASE_URL}/api/shots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) throw new Error(payload?.error?.message || `Upload failed (${res.status})`);
  return payload.data;
}
