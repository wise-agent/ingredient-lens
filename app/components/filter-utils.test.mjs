import test from 'node:test';
import assert from 'node:assert/strict';
import { setTermFilter, safeHttpsUrl, rankSuggestions } from './filter-utils.ts';

test('switching polarity replaces the existing term instead of adding a contradiction', () => {
  const include = { type: 'ingredient', id: 'milk', name: '牛奶', mode: 'include' };
  const result = setTermFilter([include], { ...include, mode: 'exclude' });
  assert.equal(result.length, 1);
  assert.equal(result[0].mode, 'exclude');
});
test('category and ingredient identities remain separate and filters are not mutated', () => {
  const current = [{ type: 'ingredient', id: 'milk', name: '牛奶', mode: 'include' }];
  const result = setTermFilter(current, { type: 'category', id: 'milk', name: '乳製品', mode: 'exclude' });
  assert.equal(result.length, 2);
  assert.equal(current.length, 1);
});
test('only HTTPS external image and source URLs are accepted', () => {
  assert.equal(safeHttpsUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  for (const url of ['http://example.com', 'javascript:alert(1)', '//example.com', 'data:text/html,hi', undefined]) assert.equal(safeHttpsUrl(url), null);
});
test('suggestions match ingredient aliases and sort matching name before alias', () => {
  const results = rankSuggestions([
    { type: 'ingredient', id: 'a', name: '奶粉', aliases: ['乳粉'], count: 30 },
    { type: 'ingredient', id: 'b', name: '乳粉', aliases: [], count: 4 },
    { type: 'category', id: 'c', name: '穀物', aliases: [], count: 100 },
  ], '乳粉', 10);
  assert.deepEqual(results.map(item => item.id), ['b', 'a']);
});
test('empty-search suggestions rank by current results and respect the limit', () => {
  const results = rankSuggestions([
    { type: 'ingredient', id: 'a', name: '糖', aliases: [], count: 12 },
    { type: 'ingredient', id: 'b', name: '鹽', aliases: [], count: 22 },
  ], '', 1);
  assert.deepEqual(results.map(item => item.id), ['b']);
});
test('suggestion search normalizes full-width ingredient names and aliases', () => {
  const results = rankSuggestions([{ type: 'ingredient', id: 'a', name: 'L-抗壞血酸', aliases: ['維生素Ｃ'], count: 4 }], 'Ｌ－抗', 10);
  assert.equal(results[0]?.id, 'a');
  assert.equal(rankSuggestions([{ type: 'ingredient', id: 'a', name: 'L-抗壞血酸', aliases: ['維生素Ｃ'], count: 4 }], '維生素C', 10)[0]?.id, 'a');
});
