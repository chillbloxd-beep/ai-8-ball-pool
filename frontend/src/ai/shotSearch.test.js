import { createInitialState } from '../game/state.js';
import { simulateCandidate } from './shotSearch.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }
const s = createInitialState();
const legal = simulateCandidate(s, { angle: 0, power: 500, spinX:0, spinY:0 });
const foulish = simulateCandidate(s, { angle: Math.PI, power: 50, spinX:0, spinY:0 });
assert(legal.score !== undefined && foulish.score !== undefined, 'scores should exist');
assert(legal.score > foulish.score, `legal should beat foulish: ${legal.score} <= ${foulish.score}`);
console.log('AI shotSearch tests: PASS');
