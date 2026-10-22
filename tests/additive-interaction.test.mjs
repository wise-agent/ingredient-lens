import test from 'node:test';
import assert from 'node:assert/strict';
import { additiveInfoReducer as reduce, initialAdditiveInfoState as initial, paginateAdditives } from '../app/components/additive-interaction.mjs';

test('hover or focus previews an ingredient and leave closes it', () => {
  const open = reduce(initial, { type: 'preview', id: 'one' });
  assert.equal(open.activeId, 'one');
  assert.equal(open.pinned, false);
  assert.equal(reduce(open, { type: 'leave' }).activeId, null);
});
test('click pins a preview so pointer movement does not replace or close it', () => {
  const preview = reduce(initial, { type: 'preview', id: 'one' });
  const pinned = reduce(preview, { type: 'toggle', id: 'one' });
  assert.equal(pinned.pinned, true);
  assert.equal(reduce(pinned, { type: 'leave' }).activeId, 'one');
  assert.equal(reduce(pinned, { type: 'preview', id: 'two' }).activeId, 'one');
  assert.equal(reduce(pinned, { type: 'toggle', id: 'two' }).activeId, 'two');
});
test('a second click closes and focus restoration does not reopen it', () => {
  const pinned = reduce(initial, { type: 'toggle', id: 'one' });
  const closed = reduce(pinned, { type: 'toggle', id: 'one' });
  assert.equal(closed.activeId, null);
  assert.equal(reduce(closed, { type: 'preview', id: 'one' }).activeId, null);
  const leave = reduce(closed, { type: 'leave' });
  assert.equal(reduce(leave, { type: 'preview', id: 'one' }).activeId, 'one');
});
test('Escape, close button, and outside click dismiss pinned content', () => {
  const pinned = reduce(initial, { type: 'toggle', id: 'one' });
  const closed = reduce(pinned, { type: 'dismiss' });
  assert.equal(closed.activeId, null);
  assert.equal(closed.pinned, false);
  assert.equal(reduce(closed, { type: 'preview', id: 'one' }).activeId, null);
  assert.equal(reduce(closed, { type: 'preview', id: 'two' }).activeId, 'two');
});
test('reset clears stale interaction state for a new item', () => {
  assert.deepEqual(reduce(reduce(initial, { type: 'toggle', id: 'one' }), { type: 'reset' }), initial);
});
test('pagination clamps a stale page after filtering and preserves item order', () => {
  const items = Array.from({ length: 27 }, (_, i) => i);
  assert.deepEqual(paginateAdditives(items, 2, 24), { entries: [24,25,26], page: 2, pages: 2, start: 25, end: 27 });
  assert.deepEqual(paginateAdditives(items.slice(0, 2), 9, 24), { entries: [0,1], page: 1, pages: 1, start: 1, end: 2 });
});
test('empty results have no phantom range and invalid page stays bounded', () => {
  assert.deepEqual(paginateAdditives([], 1), { entries: [], page: 1, pages: 0, start: 0, end: 0 });
  assert.equal(paginateAdditives([1,2], -10).page, 1);
  assert.equal(paginateAdditives([1,2], Number.NaN).page, 1);
});
