const STORAGE_KEY = 'eight-ball-ai-shot-records-v1';

export function snapshotBalls(state) {
  return state.balls.map((b) => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, sunk: b.sunk, type: b.type }));
}

export function snapshotGameState(state) {
  return {
    phase: state.phase,
    shotNumber: state.shotNumber,
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players.map((p) => ({ name: p.name, group: p.group, potted: [...p.potted] })),
    winner: state.winner
  };
}

export function createShotRecord({ state, shotContext, result, events, clientVersion }) {
  return {
    gameId: state.gameId,
    shotNumber: shotContext.shotNumber,
    playerId: shotContext.playerId,
    playerGroup: shotContext.playerGroup,
    timestamp: shotContext.timestamp,
    ballsBefore: shotContext.ballsBefore,
    shotInput: shotContext.shotInput,
    events: {
      collisions: events.filter((e) => e.type === 'ball-ball' || e.type === 'cushion'),
      firstBallHit: result.firstBallHit,
      pottedBalls: result.pottedBalls
    },
    ballsAfter: snapshotBalls(state),
    result: {
      foul: result.foul,
      turnContinues: result.turnContinues,
      winner: result.winner,
      reason: result.reason
    },
    gameStateBefore: shotContext.gameStateBefore,
    gameStateAfter: snapshotGameState(state),
    clientVersion
  };
}

export function validateShotRecord(r) {
  if (!r || typeof r !== 'object') return false;
  const required = ['gameId','shotNumber','playerId','timestamp','ballsBefore','shotInput','events','ballsAfter','result','gameStateBefore','gameStateAfter','clientVersion'];
  if (required.some((k) => !(k in r))) return false;
  if (!Array.isArray(r.ballsBefore) || !Array.isArray(r.ballsAfter)) return false;
  if (typeof r.shotInput !== 'object' || typeof r.result !== 'object') return false;
  if (!Array.isArray(r.events?.collisions) || !Array.isArray(r.events?.pottedBalls)) return false;
  return true;
}

export function loadShotRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(validateShotRecord) : [];
  } catch {
    return [];
  }
}

export function saveShotRecord(record) {
  if (!validateShotRecord(record)) throw new Error('Malformed shot record');
  const records = loadShotRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function replaceShotRecords(records) {
  if (!Array.isArray(records) || !records.every(validateShotRecord)) {
    throw new Error('Import rejected: malformed shot records');
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearShotRecords() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportShotRecords() {
  return JSON.stringify(loadShotRecords(), null, 2);
}
