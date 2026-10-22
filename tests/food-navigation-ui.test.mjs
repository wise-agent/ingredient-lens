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
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
    }
    return nextLoad(url, context);
  }
});
const { default: Home } = await import('../app/page.tsx');
const { default: AdditivesPage, AdditiveCard } = await import('../app/additives/page.tsx');
const { ProductCard } = await import('../app/components/product-display.tsx');
const { ProductIngredientInfo } = await import('../app/components/additive-info.tsx');
const known = { id:'known', name:'原始別名', aliases:[], categoryIds:[], encyclopedia:{entryIds:['add-12']} };
const unknown = { id:'unknown', name:'水 & 茶', aliases:[], categoryIds:[] };
const category = { id:'function', name:'防腐劑', aliases:[], categoryIds:[], kind:'function_label', encyclopedia:{entryIds:[],categoryCode:'preservative'} };
const ambiguous = { id:'ambiguous', name:'維生素 A', aliases:[], categoryIds:[], encyclopedia:{entryIds:['a','b']} };
const product = { id:'p', name:'測試商品', ingredientText:'原始別名、水 & 茶', ingredientStatus:'parsed', ingredientIds:['known','unknown'], photos:[] };
const entry = { id:'add-12', nameZh:'測試詞條', nameEn:'Example', aliases:[], purposes:[], sources:[] };

test('home exposes a prominent encyclopedia route in addition to its header', () => {
  const html = renderToStaticMarkup(React.createElement(Home));
  assert.ok((html.match(/href="\/additives"/g) || []).length >= 2);
  assert.match(html, /<nav[^>]*>[\s\S]*href="\/"[\s\S]*首頁/);
});
test('encyclopedia explicitly names the home route in header and return link', () => {
  const html = renderToStaticMarkup(React.createElement(AdditivesPage));
  assert.ok((html.match(/href="\/"/g) || []).length >= 3);
  assert.match(html, /回到首頁/);
});
test('result cards omit ingredient names and encyclopedia links while retaining product identity', () => {
  const html = renderToStaticMarkup(React.createElement(ProductCard, { product, onOpen:()=>{} }));
  assert.doesNotMatch(html, /ingredient-preview|ingredient-encyclopedia-link|原始別名|水 &amp; 茶/);
  assert.doesNotMatch(html, /href="\/additives/);
  assert.match(html, /測試商品/);
  assert.match(html, /有成分文字/);
});
test('product name is an explicit dialog action wired to the detail opener', () => {
  let opened = 0;
  const tree = ProductCard({ product, onOpen:()=>{ opened++; } });
  const nodes = [];
  function visit(node) { if (!React.isValidElement(node)) return; nodes.push(node); React.Children.forEach(node.props.children, visit); }
  visit(tree);
  const name = nodes.find(node => node.type === 'button' && node.props.className === 'product-name-button');
  assert.ok(name, 'product name has its dedicated visible action');
  assert.equal(name.props['aria-haspopup'], 'dialog');
  assert.match(name.props['aria-label'], /測試商品.*成分/);
  name.props.onClick();
  assert.equal(opened, 1);
});
test('detail ingredients are not truncated to the result-card preview length', () => {
  const ingredients = Array.from({length:7}, (_, index) => ({...unknown,id:'detail-'+index,name:'完整原料'+index}));
  const html = renderToStaticMarkup(React.createElement(ProductIngredientInfo, { ingredients }));
  for (const item of ingredients) assert.ok(html.includes(item.name), item.name);
  assert.equal((html.match(/class="ingredient-encyclopedia-link"/g)||[]).length, 7);
});
test('every detail ingredient has a direct entry, category, or visibly labelled search link', () => {
  const html = renderToStaticMarkup(React.createElement(ProductIngredientInfo, { ingredients:[known,unknown,category,ambiguous] }));
  assert.match(html, /href="\/additives\?entry=add-12#additive-index"/);
  assert.match(html, /href="\/additives\?category=preservative#additive-index"/);
  assert.ok(html.includes('href="/additives?q=%E6%B0%B4%20%26%20%E8%8C%B6#additive-index"'));
  assert.ok(html.includes('href="/additives?q=%E7%B6%AD%E7%94%9F%E7%B4%A0%20A#additive-index"'));
  assert.equal((html.match(/搜尋百科/g)||[]).length >= 2, true);
  assert.ok(!/<button[^>]*>[\s\S]*?<a/.test(html.split('ingredient-info-chips')[1].split('ingredient-help-status')[0]));
});
test('cross-page navigation uses native anchors and never depends on the SPA Link component', () => {
  for (const filename of ['app/page.tsx','app/additives/page.tsx','app/components/additive-info.tsx','app/components/site-navigation.tsx','app/components/ingredient-encyclopedia-link.tsx']) {
    assert.doesNotMatch(readFileSync(path.join(root,filename),'utf8'), /from ['"]next\/link['"]/);
  }
});
test('compact mobile navigation does not hide either main destination', () => {
  const css = readFileSync(path.join(root,'app/globals.css'),'utf8');
  assert.doesNotMatch(css, /\.site-header nav \.nav-active\s*\{[^}]*display:none/);
  assert.doesNotMatch(css, /\.additive-site-header nav>a:first-child\s*\{[^}]*display:none/);
});
test('linked encyclopedia card has a stable focus target', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveCard, { entry, expanded:true, focused:true, onToggle:()=>{} }));
  assert.match(html, /id="additive-entry-add-12"/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, /is-linked-target/);
});
const additiveModule = await import('../app/additives/page.tsx');
const infoModule = await import('../app/components/additive-info.tsx');
const dictionary = { metadata:{}, categories:[{code:'preservative',nameZh:'防腐劑',plainPurpose:'分類用途'}], additives:[entry,{...entry,id:'other-entry',nameZh:'測試詞條延伸'}] };
const ready = { dictionary, error:'', loading:false, retry:()=>{} };
test('a direct entry URL displays and expands precisely its target, not name-search neighbours', () => {
  assert.equal(typeof additiveModule.AdditivesContent, 'function');
  const html = renderToStaticMarkup(React.createElement(additiveModule.AdditivesContent, {...ready,locationSearch:'?entry=add-12'}));
  assert.match(html, /id="additive-entry-add-12"/);
  assert.match(html, /is-linked-target/);
  assert.match(html, /aria-expanded="true"/);
  assert.ok(!html.includes('id="additive-entry-other-entry"'));
  assert.match(html, /已開啟連結指定的詞條/);
});
test('unknown direct IDs report the missing reference without claiming a match', () => {
  assert.equal(typeof additiveModule.AdditivesContent, 'function');
  const html = renderToStaticMarkup(React.createElement(additiveModule.AdditivesContent, {...ready,locationSearch:'?entry=missing'}));
  assert.match(html, /連結中的詞條目前未收錄/);
  assert.ok(!html.includes('is-linked-target'));
});
test('an unknown search preserves the query and gives a useful empty-state explanation', () => {
  assert.equal(typeof additiveModule.AdditivesContent, 'function');
  const html = renderToStaticMarkup(React.createElement(additiveModule.AdditivesContent, {...ready,locationSearch:'?q=%E6%B0%B4'}));
  assert.match(html, /value="水"/);
  assert.match(html, /還沒找到這個名字/);
  assert.match(html, /沒有查到，不代表該成分不是添加物/);
});
test('resolved ingredient names are native anchors with a separate help button', () => {
  assert.equal(typeof infoModule.ProductIngredientInfoContent, 'function');
  const item = {...known,name:'測試詞條'};
  const html = renderToStaticMarkup(React.createElement(infoModule.ProductIngredientInfoContent, {...ready,ingredients:[item]}));
  assert.match(html, /href="\/additives\?entry=add-12#additive-index"/);
  assert.match(html, /aria-label="查看測試詞條的用途說明"/);
  assert.match(html, /<\/a><button/);
  assert.ok(!/<a[^>]*>[^]*?<button[^]*?<\/a>/.test(html));
});
