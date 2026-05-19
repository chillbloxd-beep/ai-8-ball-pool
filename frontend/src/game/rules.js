function getPlayer(state, index) {
  return state.players[index];
}

function opponentIndex(index) {
  return index === 0 ? 1 : 0;
}

function groupForBall(ballId) {
  if (ballId >= 1 && ballId <= 7) return 'solids';
  if (ballId >= 9 && ballId <= 15) return 'stripes';
  return null;
}

function isObjectBall(ballId) {
  return ballId >= 1 && ballId <= 15;
}

function getPottedBalls(shotEvents) {
  return shotEvents.filter((e) => e.type === 'pocket').map((e) => e.ballId).filter((id) => isObjectBall(id));
}

function getFirstBallHit(shotEvents) {
  for (const e of shotEvents) {
    if (e.type !== 'ball-ball') continue;
    if (e.a === 0 && isObjectBall(e.b)) return e.b;
    if (e.b === 0 && isObjectBall(e.a)) return e.a;
  }
  return null;
}

function hasClearedGroup(state, playerIndex) {
  const p = getPlayer(state, playerIndex);
  if (!p.group) return false;
  const remaining = state.balls.filter((b) => !b.sunk && groupForBall(b.id) === p.group);
  return remaining.length === 0;
}

export function applyShot(state, angle, power) {
  const cue = state.balls.find((b) => b.id === 0);
  if (!cue || cue.sunk || state.phase !== 'aiming') return;

  cue.vx = Math.cos(angle) * power;
  cue.vy = Math.sin(angle) * power;
  state.phase = 'shot';
  state.shotNumber += 1;
  state.currentShotEvents = [];
  state.shotContext = {
    shotNumber: state.shotNumber,
    playerId: state.currentPlayerIndex,
    playerGroup: state.players[state.currentPlayerIndex]?.group ?? null,
    timestamp: new Date().toISOString(),
    shotInput: { angle, power, spinX: 0, spinY: 0 },
    ballsBefore: state.balls.map((b) => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, sunk: b.sunk, type: b.type })),
    gameStateBefore: {
      phase: 'shot',
      shotNumber: state.shotNumber,
      currentPlayerIndex: state.currentPlayerIndex,
      players: state.players.map((p) => ({ name: p.name, group: p.group, potted: [...p.potted] })),
      winner: state.winner
    }
  };
}

export function updateRules(state) {
  if (state.phase !== 'shot') return;

  if (state.events?.length) {
    state.currentShotEvents.push(...state.events);
  }

  if (state.debug.moving) return;

  const result = resolveShot(state, state.currentShotEvents || []);
  state.lastShotResult = result;
  state.debug.lastReason = result.reason;

  if (result.winner !== null) {
    state.phase = 'game-over';
    state.winner = result.winner;
    return;
  }

  state.phase = 'aiming';
  if (!result.turnContinues) {
    state.currentPlayerIndex = opponentIndex(state.currentPlayerIndex);
  }
}

export function resolveShot(state, shotEvents) {
  const playerIndex = state.currentPlayerIndex;
  const player = getPlayer(state, playerIndex);
  const opp = getPlayer(state, opponentIndex(playerIndex));

  const firstBallHit = getFirstBallHit(shotEvents);
  const pottedBalls = getPottedBalls(shotEvents);
  const cueBallPotted = shotEvents.some((e) => e.type === 'pocket' && e.ballId === 0);
  const pottedEight = pottedBalls.includes(8) || shotEvents.some((e) => e.type === 'pocket' && e.ballId === 8);

  let foul = false;
  let reason = 'Legal shot';
  let winner = null;

  if (firstBallHit === null) {
    foul = true;
    reason = 'Foul: no ball hit';
  }

  if (!foul && player.group) {
    const firstGroup = groupForBall(firstBallHit);
    const shouldHitEight = hasClearedGroup(state, playerIndex);
    if (shouldHitEight) {
      if (firstBallHit !== 8) {
        foul = true;
        reason = 'Foul: must hit 8-ball first';
      }
    } else if (firstGroup !== player.group) {
      foul = true;
      reason = 'Foul: wrong group hit first';
    }
  }

  if (!foul && cueBallPotted) {
    foul = true;
    reason = 'Foul: cue ball scratch';
  }

  // group assignment after first legal non-break pot
  if (!player.group && !foul) {
    const solidPotted = pottedBalls.some((id) => groupForBall(id) === 'solids');
    const stripePotted = pottedBalls.some((id) => groupForBall(id) === 'stripes');
    if (solidPotted && !stripePotted) {
      player.group = 'solids';
      opp.group = 'stripes';
    } else if (stripePotted && !solidPotted) {
      player.group = 'stripes';
      opp.group = 'solids';
    }
  }

  for (const id of pottedBalls) {
    const grp = groupForBall(id);
    if (!grp) continue;
    if (grp === player.group) player.potted.push(id);
    if (grp === opp.group) opp.potted.push(id);
  }

  if (pottedEight) {
    const legalEight = !foul && player.group && hasClearedGroup(state, playerIndex);
    if (legalEight) {
      winner = playerIndex;
      reason = 'Win: legal 8-ball pot';
    } else {
      winner = opponentIndex(playerIndex);
      foul = true;
      reason = 'Loss: illegal 8-ball pot';
    }
  }

  const pottedOwnGroup = pottedBalls.some((id) => groupForBall(id) && groupForBall(id) === player.group);
  const turnContinues = !foul && !pottedEight && pottedOwnGroup;

  return {
    firstBallHit,
    pottedBalls,
    cueBallPotted,
    foul,
    turnContinues,
    winner,
    reason,
    groupsAfterShot: [getPlayer(state, 0).group, getPlayer(state, 1).group]
  };
}
