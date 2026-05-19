export const PHYSICS_CONFIG = {
  tableWidth: 1000,
  tableHeight: 560,
  railSize: 42,
  ballRadius: 10,
  pocketRadius: 18,
  rollingFriction: 16,
  cushionBounce: 0.92,
  minVelocity: 1.5,
  maxSubstepsPerFrame: 6,
  fixedTimestep: 1 / 120
};

function createRack(startX, centerY, radius) {
  const balls = [];
  let id = 1;
  const rowGap = Math.sqrt(3) * radius;

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      balls.push({
        id,
        type: id === 8 ? 'eight' : id <= 7 ? 'solid' : 'stripe',
        x: startX + row * rowGap,
        y: centerY - row * radius + col * radius * 2,
        vx: 0,
        vy: 0,
        sunk: false
      });
      id += 1;
    }
  }

  return balls;
}

export function createInitialState() {
  const table = {
    width: PHYSICS_CONFIG.tableWidth,
    height: PHYSICS_CONFIG.tableHeight,
    rail: PHYSICS_CONFIG.railSize,
    pocketRadius: PHYSICS_CONFIG.pocketRadius,
    ballRadius: PHYSICS_CONFIG.ballRadius
  };

  return {
    config: PHYSICS_CONFIG,
    table,
    players: ['Player 1', 'Player 2'],
    currentPlayerIndex: 0,
    phase: 'aiming',
    shotNumber: 0,
    balls: [
      {
        id: 0,
        type: 'cue',
        x: table.width * 0.25,
        y: table.height * 0.5,
        vx: 0,
        vy: 0,
        sunk: false
      },
      ...createRack(table.width * 0.68, table.height * 0.5, table.ballRadius)
    ],
    input: {
      aimAngle: 0,
      power: 0,
      charging: false,
      maxPower: 900
    },
    debug: {
      fps: 0,
      moving: false,
      determinism: 'Not run',
      collisions: 0
    },
    events: []
  };
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function deserializeState(json) {
  return JSON.parse(json);
}
