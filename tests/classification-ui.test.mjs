import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root = fileURLToPath(new URL('../', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/link') return nextResolve('next/link.js', context);
    if (specifier.startsWith('@/')) {
      const target = path.join(root, specifier.slice(2));
      const found = ['', '.ts', '.tsx', '.mjs', '.js'].map(ext => target + ext).find(existsSync);
      if (found) return nextResolve(pathToFileURL(found).href, context);
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !context.parentURL.includes('/node_modules/')) {
      const target = fileURLToPath(new URL(specifier, context.parentURL));
      const found = ['.ts', '.tsx', '.mjs', '.js'].map(ext => target + ext).find(existsSync);
      if (found) return nextResolve(pathToFileURL(found).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8') + (url.endsWith('/app/page.tsx') ? '\nexport { ProductDetailModal };' : ''), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
    }
    return nextLoad(url, context);
  }
});

const { FilterPanel } = await import('../app/components/filter-panel.tsx');
const { default: Home, ProductDetailModal } = await import('../app/page.tsx');
const ingredient = (id, name, categoryIds = [], extra = {}) => ({ id, name, categoryIds, aliases: [], warningOnly: false, classificationEvidence: [], classificationVersion: 'v1', ...extra });
const catalog = {
  metadata: { totalProducts: 8, ingredientTextProducts: 8, classification: {
    version: 'v1', encyclopediaMatchedIngredients: 101, newlyClassifiedByEncyclopedia: 67,
    ordinaryClassifiedIngredients: 203, pendingIngredients: 5, warningOnlyIngredients: 3,
  } },
  productCategories: [],
  categories: [
    { id: 'ordinary_food', name: '一般食材', memberCount: 2 },
    { id: 'ordinary_grain', name: '穀物', parentId: 'ordinary_food', memberCount: 2 },
    { id: 'additive', name: '食品添加物', memberCount: 1 },
    { id: 'warning_only', name: '警語專用測試分類', memberCount: 1 },
  ],
  ingredients: [
    ingredient('flour', '麵粉', ['ordinary_grain']),
    ingredient('warning', '警語中的乳', ['ordinary_grain', 'warning_only'], { warningOnly: true }),
    ingredient('pending', '待確認複方', []),
    ingredient('additive', '檸檬酸', ['additive']),
  ],
};
const results = { products: [], total: 8, page: 1, pageSize: 24, eligibleTotal: 8,
  facets: { ingredients: { flour: 8, warning: 4, pending: 2, additive: 1 }, categories: { ordinary_food: 8, ordinary_grain: 8, additive: 1, warning_only: 99 } },
};
const renderPanel = (overrides = {}) => renderToStaticMarkup(React.createElement(FilterPanel, { catalog, results, filters: [], setFilter: () => {}, removeFilter: () => {}, clearFilters: () => {}, loading: false, ...overrides }));
const visibleText = html => html.replace(/<[^>]+>/g, '');

test('filter panel identifies additive categories as reference uses, without manufacturer or legal claims', () => {
  const text = visibleText(renderPanel());
  assert.match(text, /百科參考用途/);
  assert.match(text, /不代表業者實際用途/);
  assert.match(text, /不作為合法使用的證明/);
  assert.match(text, /一般食材分類不代表無添加物/);
});

test('coverage reports pending label names and warning-only names as separate totals', () => {
  const text = visibleText(renderPanel());
  assert.match(text, /百科對應 101/);
  assert.match(text, /其中新增分類 67/);
  assert.match(text, /食材與來源材料 203/);
  assert.match(text, /待確認 5/);
  assert.match(text, /僅警語／過敏原聲明 3/);
  assert.match(text, /標示名稱/);
  assert.match(text, /不是獨立化學物質/);
});

test('category member counts omit warning-only labels, including in descendant categories', () => {
  const html = renderPanel();
  const memberCount = html.match(/aria-label="查看一般食材分類成員"[^>]*>([^<]+)/);
  assert.ok(memberCount, 'the ordinary-food category has an accessible member count');
  assert.equal(memberCount[1], '1 項');
});

test('warning-only categories are not selectable or suggested', () => {
  const html = renderPanel();
  assert.doesNotMatch(html, /警語專用測試分類/);
});

test('warning-only suggestions retain their real positive facet count with a visible disclaimer', () => {
  const html = renderPanel();
  const row = html.split('class="suggestion-row').find(section => section.includes('包含警語中的乳'));
  assert.ok(row, 'explicit allergen declarations remain a selectable ingredient');
  assert.match(row, /僅警語／過敏原聲明/);
  assert.match(row, /class="suggestion-count" role="gridcell">4</);
  assert.match(row, /aria-label="包含警語中的乳"/);
  assert.match(row, /aria-label="排除警語中的乳"/);
  assert.match(visibleText(html), /包含.*明確含有聲明/);
});

test('home names the ingredient index as label names rather than unique substances', () => {
  const text = visibleText(renderToStaticMarkup(React.createElement(Home)));
  assert.match(text, /已辨識標示名稱/);
});

test('product detail describes the server pending count as label names and preserves full evidence', () => {
  const ingredients = Array.from({ length: 9 }, (_, index) => ingredient('full-' + index, '完整原料' + index));
  const detailCatalog = { ...catalog, ingredients: [...ingredients, ...catalog.ingredients] };
  const product = {
    id: 'p', name: '完整測試商品', ingredientStatus: 'parsed',
    ingredientIds: ingredients.map(item => item.id), unclassifiedIngredientIds: ['full-2', 'full-7'],
    ingredientText: '完整原始標示不可截斷', warningText: '本產線亦處理乳製品。',
    declaredContainsIngredientIds: ['warning'], precautionIngredientIds: ['warning'], photos: [],
  };
  const html = renderToStaticMarkup(React.createElement(ProductDetailModal, { initial: product, catalog: detailCatalog, onClose: () => {} }));
  const text = visibleText(html);
  assert.match(text, /2 個原料標示名稱尚待分類確認/);
  assert.match(text, /完整原始標示不可截斷/);
  for (const item of ingredients) assert.ok(text.includes(item.name));
  assert.match(text, /本產線亦處理乳製品。/);
  assert.match(text, /標示聲明含有（與原料清單分開）/);
  assert.match(text, /預防性警語不作為「包含」條件的成分/);
});
test('research progress distinguishes newly resolved labels and remaining uncertainty',()=>{
 const updated={...catalog,metadata:{...catalog.metadata,classification:{...catalog.metadata.classification,researchedIngredients:823,researchClassifiedIngredients:400,researchPendingIngredients:423}}};
 const text=visibleText(renderPanel({catalog:updated}));
 assert.match(text,/本輪核對 823/);assert.match(text,/新增分類 400/);assert.match(text,/仍待確認 423/);assert.match(text,/商品詳情.*來源.*原因/);
});
