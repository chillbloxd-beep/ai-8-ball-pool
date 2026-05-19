import { createInitialState } from './state.js';
import { resolveShot } from './rules.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function setupState() {
  const state = createInitialState();
  state.players = [
    { name: 'Player 1', group: null, potted: [] },
    { name: 'Player 2', group: null, potted: [] }
  ];
  state.currentPlayerIndex = 0;
  return state;
}

function run() {
  // legal solid pot assigns groups
  {
    const s = setupState();
    const res = resolveShot(s, [{ type: 'ball-ball', a: 0, b: 3 }, { type: 'pocket', ballId: 3 }]);
    assert(res.foul === false, 'legal solid pot should not foul');
    assert(res.groupsAfterShot[0] === 'solids', 'player should get solids');
  }

  // wrong group first hit foul
  {
    const s = setupState();
    s.players[0].group = 'solids';
    s.players[1].group = 'stripes';
    const res = resolveShot(s, [{ type: 'ball-ball', a: 0, b: 10 }]);
    assert(res.foul === true && res.reason.includes('wrong group'), 'wrong group first hit should foul');
  }

  // cue ball scratch
  {
    const s = setupState();
    const res = resolveShot(s, [{ type: 'ball-ball', a: 0, b: 2 }, { type: 'pocket', ballId: 0 }]);
    assert(res.foul === true && res.cueBallPotted, 'scratch should be foul');
  }

  // illegal 8 ball pot
  {
    const s = setupState();
    s.players[0].group = 'solids';
    s.players[1].group = 'stripes';
    const res = resolveShot(s, [{ type: 'ball-ball', a: 0, b: 8 }, { type: 'pocket', ballId: 8 }]);
    assert(res.winner === 1 && res.foul, 'illegal 8 should lose game');
  }

  // legal 8 ball win
  {
    const s = setupState();
    s.players[0].group = 'solids';
    s.players[1].group = 'stripes';
    for (const b of s.balls) {
      if (b.id >= 1 && b.id <= 7) b.sunk = true;
    }
    const res = resolveShot(s, [{ type: 'ball-ball', a: 0, b: 8 }, { type: 'pocket', ballId: 8 }]);
    assert(res.winner === 0 && !res.foul, 'legal 8 should win');
  }

  // no ball hit foul
  {
    const s = setupState();
    const res = resolveShot(s, []);
    assert(res.foul === true && res.reason.includes('no ball hit'), 'no hit should foul');
  }

  console.log('Rules tests: PASS');
}

run();
