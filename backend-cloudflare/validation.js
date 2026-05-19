const ALLOWED_GROUPS = new Set([null, 'solids', 'stripes', 'unassigned']);

export function parseJson(req) {
  return req.json().catch(() => {
    throw badRequest('INVALID_JSON', 'Body must be valid JSON');
  });
}

export function validateStartGame(body) {
  if (!body || typeof body !== 'object') throw badRequest('INVALID_BODY', 'Body required');
  const { player1Id, player2Id, gameCode, metadata } = body;
  if (!isUuidLike(player1Id) || !isUuidLike(player2Id)) {
    throw badRequest('INVALID_PLAYER_IDS', 'player1Id and player2Id must be UUID-like strings');
  }
  if (typeof gameCode !== 'string' || gameCode.length < 4 || gameCode.length > 64) {
    throw badRequest('INVALID_GAME_CODE', 'gameCode must be 4-64 chars');
  }
  if (metadata !== undefined && typeof metadata !== 'object') throw badRequest('INVALID_METADATA', 'metadata must be object');
  return { player1Id, player2Id, gameCode, metadata: metadata || {} };
}

export function validateShot(body) {
  if (!body || typeof body !== 'object') throw badRequest('INVALID_BODY', 'Body required');
  const required = ['gameId', 'shotNumber', 'playerId', 'playerGroup', 'ballsBefore', 'shotInput', 'events', 'ballsAfter', 'result'];
  for (const k of required) if (!(k in body)) throw badRequest('MISSING_FIELD', `Missing ${k}`);

  if (!isUuidLike(body.gameId) || !isUuidLike(body.playerId)) throw badRequest('INVALID_IDS', 'gameId/playerId must be UUID-like strings');
  if (!Number.isInteger(body.shotNumber) || body.shotNumber <= 0) throw badRequest('INVALID_SHOT_NUMBER', 'shotNumber must be positive integer');
  if (!ALLOWED_GROUPS.has(body.playerGroup)) throw badRequest('INVALID_PLAYER_GROUP', 'playerGroup invalid');
  if (!Array.isArray(body.ballsBefore) || !Array.isArray(body.ballsAfter)) throw badRequest('INVALID_BALLS', 'ballsBefore/ballsAfter must be arrays');
  if (!body.shotInput || typeof body.shotInput !== 'object') throw badRequest('INVALID_SHOT_INPUT', 'shotInput must be object');
  if (!body.events || typeof body.events !== 'object') throw badRequest('INVALID_EVENTS', 'events must be object');
  if (!body.result || typeof body.result !== 'object') throw badRequest('INVALID_RESULT', 'result must be object');

  validateShotInput(body.shotInput);
  validateBalls(body.ballsBefore);
  validateBalls(body.ballsAfter);

  if (body.qualityScore !== undefined && body.qualityScore !== null && typeof body.qualityScore !== 'number') {
    throw badRequest('INVALID_QUALITY', 'qualityScore must be numeric or null');
  }

  return body;
}

function validateShotInput(input) {
  const { angle, power, spinX = 0, spinY = 0 } = input;
  if (![angle, power, spinX, spinY].every((n) => typeof n === 'number' && Number.isFinite(n))) {
    throw badRequest('INVALID_SHOT_INPUT', 'angle/power/spinX/spinY must be finite numbers');
  }
  if (power < 0 || power > 2000) throw badRequest('IMPOSSIBLE_SHOT_POWER', 'power must be between 0 and 2000');
  if (Math.abs(spinX) > 1 || Math.abs(spinY) > 1) throw badRequest('IMPOSSIBLE_SHOT_SPIN', 'spinX/spinY must be between -1 and 1');
}

function validateBalls(balls) {
  if (balls.length < 1 || balls.length > 32) throw badRequest('IMPOSSIBLE_BALL_COUNT', 'ball list size invalid');
}

function isUuidLike(v) {
  return typeof v === 'string' && /^[0-9a-fA-F-]{8,}$/.test(v);
}

export function badRequest(code, message) {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
}
