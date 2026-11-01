import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleTankIds, canSeeTank } from '../src/render/visibility.js';

test('online player sees only the tank controlled by their client', () => {
  const state = { active: 1 };
  const session = { online: true, localPlayers: new Set([0]) };
  const visible = visibleTankIds(state, session);
  assert.equal(canSeeTank(0, visible), true);
  assert.equal(canSeeTank(1, visible), false);
});

test('hot-seat play reveals only the active local tank', () => {
  const session = { online: false, localPlayers: new Set([0, 1]) };
  const visible = visibleTankIds({ active: 1 }, session);
  assert.equal(canSeeTank(0, visible), false);
  assert.equal(canSeeTank(1, visible), true);
});

test('single-player play keeps the human tank visible during AI turns', () => {
  const session = { online: false, localPlayers: new Set([0]) };
  const visible = visibleTankIds({ active: 1 }, session);
  assert.equal(canSeeTank(0, visible), true);
  assert.equal(canSeeTank(1, visible), false);
});

test('AI demo with no local players can show every tank', () => {
  const visible = visibleTankIds({ active: 1 }, { online: false, localPlayers: new Set() });
  assert.equal(visible, null);
  assert.equal(canSeeTank(0, visible), true);
});
