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
const { AdditiveEntryDetails } = await import('../app/components/additive-info.tsx');
const entry = { id:'test', nameZh:'測試名稱', nameEn:'Example ingredient', aliases:['別名'], purposes:[{ categoryCode:'test', categoryZh:'分類甲', plainPurpose:'此類用於調整食品質地。', scope:'general-category' }], sources:[{title:'官方來源',url:'https://example.org/source'},{title:'不安全連結',url:'javascript:alert(1)'},{title:'純HTTP',url:'http://example.org/'}] };
test('details show reference name and clearly category-general purpose', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry }));
  assert.ok(html.includes('測試名稱'));
  assert.ok(html.includes('一般用途'));
  assert.ok(html.includes('此類用於調整食品質地。'));
  assert.ok(html.includes('不代表它在這項商品中的實際用途'));
});
test('details preserve useful aliases and render only safe source URLs', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry }));
  assert.ok(html.includes('別名'));
  assert.ok(html.includes('href="https://example.org/source"'));
  assert.ok(html.includes('noopener noreferrer'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('href="http:'));
});
test('an entry without purpose does not invent a specific use', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry: {...entry, purposes:[]} }));
  assert.ok(html.includes('尚無可顯示的分類用途說明'));
});
test('group entries and future/mixed legal dates are visibly distinct', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry: {...entry, entryType:'group', regulatoryStatus:'mixed-effective-dates', regulatoryNote:'部分規定於 2027-07-01 施行。'} }));
  assert.ok(html.includes('類群條目'));
  assert.ok(html.includes('部分規定尚未施行'));
  assert.ok(html.includes('2027-07-01'));
});
test('official-listed notes remain visible without a blanket approval claim', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry: {...entry, regulatoryStatus:'official-listed', regulatoryNote:'使用範圍與限量請查官方原文。'} }));
  assert.ok(html.includes('使用範圍與限量請查官方原文。'));
  assert.ok(!html.includes('目前全部准用'));
});
const { default: AdditivesPage, AdditiveCard } = await import('../app/additives/page.tsx');
test('encyclopedia opens with clear scope, labelled search and category controls', () => {
  const html = renderToStaticMarkup(React.createElement(AdditivesPage));
  assert.ok(html.includes('官方附表所列添加物'));
  assert.ok(html.includes('搜尋添加物中文名、英文名或別名'));
  assert.ok(html.includes('依用途分類'));
  assert.ok(html.includes('href="/"'));
});
test('each compact card displays a simple general purpose and an accessible details toggle', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveCard, { entry, expanded:false, onToggle:() => {} }));
  assert.ok(html.includes('此類用於調整食品質地。'));
  assert.ok(html.includes('一般用途'));
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(!html.includes('href="https://example.org/source"'));
  const open = renderToStaticMarkup(React.createElement(AdditiveCard, { entry, expanded:true, onToggle:() => {} }));
  assert.ok(open.includes('aria-expanded="true"'));
  assert.ok(open.includes('href="https://example.org/source"'));
});
test('generic supplemental names are distinct from verified aliases', () => {
  const html = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry: {...entry, displayNames:['維生素C類群泛稱']} }));
  assert.ok(html.includes('原表補充名稱（可能為泛稱）'));
  assert.ok(html.includes('維生素C類群泛稱'));
});
test('item-specific source purposes are labelled separately from category summaries', () => {
  const specific = { ...entry, purposes: [{...entry.purposes[0], scope:'official-item', plainPurpose:'原表載明的用途。'}] };
  const details = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry:specific }));
  assert.ok(details.includes('官方原表用途'));
  const card = renderToStaticMarkup(React.createElement(AdditiveCard, { entry:specific, expanded:false, onToggle:() => {} }));
  assert.ok(card.includes('官方原表用途'));
  assert.ok(card.includes('原表載明的用途。'));
});
test('official item purposes link directly to their evidence page using safe HTTPS', () => {
  const withEvidence = { ...entry, purposes: [{...entry.purposes[0], scope:'official-item', evidenceSourceUrl:'https://example.org/table.pdf#page=2'}] };
  const html = renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry:withEvidence }));
  assert.ok(html.includes('href="https://example.org/table.pdf#page=2"'));
  assert.ok(html.includes('查看原表用途'));
  const unsafe = { ...entry, purposes: [{...entry.purposes[0], scope:'official-item', evidenceSourceUrl:'https://user:password@example.org/'}] };
  assert.ok(!renderToStaticMarkup(React.createElement(AdditiveEntryDetails, { entry:unsafe })).includes('user:password'));
});
const { resolveIngredientExplanations } = await import('../app/components/additive-info.tsx');
test('product references keep unknown ingredients and do not mistake a function label for a substance', () => {
  const dictionary = { metadata:{}, categories:[{code:'test', nameZh:'分類甲', plainPurpose:'分類的一般說明'}], additives:[entry] };
  const ingredients = [
    {id:'unknown',name:'水',aliases:[],categoryIds:[]},
    {id:'function',name:'分類甲',aliases:['測試名稱'],kind:'function_label',categoryIds:[]},
    {id:'known',name:'別名',aliases:[],categoryIds:[]}
  ];
  const choices = resolveIngredientExplanations(dictionary, ingredients);
  assert.equal(choices.length, 3);
  assert.equal(choices[0].ingredient.name, '水');
  assert.equal(choices[0].entries.length, 0);
  assert.equal(choices[1].entries.length, 0);
  assert.equal(choices[1].category.nameZh, '分類甲');
  assert.equal(choices[2].entries[0].id, 'test');
});
test('ambiguous product labels preserve every exact dictionary candidate', () => {
  const dictionary = { metadata:{}, categories:[], additives:[entry,{...entry,id:'test-two',nameZh:'另一名稱'}] };
  const choices = resolveIngredientExplanations(dictionary, [{id:'ambiguous',name:'別名',aliases:[],categoryIds:[]}]);
  assert.deepEqual(choices[0]?.entries.map(item=>item.id), ['test','test-two']);
});
test('research-backed identity has the same tooltip entry as its permanent encyclopedia link',()=>{
 const dictionary={metadata:{},categories:[],additives:[entry]};
 const choice=resolveIngredientExplanations(dictionary,[{id:'reviewed',name:'核對寫法',aliases:[],categoryIds:[],reviewedReferenceEntryIds:['test']}])[0];
 assert.deepEqual(choice.entries.map(e=>e.id),['test']);
});
const { ClassificationResearchDetails, ProductIngredientInfoContent } = await import('../app/components/additive-info.tsx');
test('research evidence and unresolved reasons remain visible with safe source links',()=>{
 const research={status:'pending',reason:'名稱合併，無法確認原料邊界。',sources:[{title:'原始標示',url:'https://data.gov.tw/dataset/33575'},{title:'不安全',url:'javascript:bad'}],categoryNames:[]};
 assert.equal(typeof ClassificationResearchDetails,'function');
 const html=renderToStaticMarkup(React.createElement(ClassificationResearchDetails,{research}));
 assert.match(html,/名稱合併，無法確認原料邊界/);assert.match(html,/待確認原因/);assert.match(html,/https:\/\/data.gov.tw\/dataset\/33575/);assert.doesNotMatch(html,/javascript:/);
});
test('pending research explanations remain accessible even without an additive identity',()=>{
 const ingredients=[{id:'pending',name:'模糊名稱',aliases:[],categoryIds:['unclassified'],classificationResearch:{status:'pending',reason:'來源不足',sources:[],categoryNames:[]}}];
 const html=renderToStaticMarkup(React.createElement(ProductIngredientInfoContent,{ingredients,dictionary:{metadata:{},categories:[],additives:[]},loading:false,error:'',retry:()=>{}}));
 assert.match(html,/aria-label="查看模糊名稱的用途說明"/);assert.match(html,/搜尋百科/);
});
test('broader group references are labelled as groups, not exact ingredient identities',()=>{
 const research={status:'classify',reason:'僅確認屬於酵素製劑類群，未確認單一物質。',sources:[],categoryNames:['其他參考用途'],referenceGroups:[{id:'group-1',name:'酵素製劑'}]};
 const html=renderToStaticMarkup(React.createElement(ClassificationResearchDetails,{research}));
 assert.match(html,/參考類群詞條/);assert.match(html,/href="\/additives\?entry=group-1#additive-index"/);
});
test('research detail shows evidence status, conditional risk and sources without safety scores', () => {
 const research={status:'reviewed',reviewedAt:'2026-10-21',identity:'物質身分',processingUses:'加工理由',healthEffects:'已知人體影響',excessRisk:'高攝取條件',sensitiveGroups:'特定族群',evidenceLimitations:'證據限制',sources:[{title:'逐項評估',url:'https://example.org/evaluation',supports:'支持範圍'}]};
 const html=renderToStaticMarkup(React.createElement(AdditiveEntryDetails,{entry:{...entry,research}}));
 for(const value of ['加工理由','已知人體影響','高攝取條件','特定族群','證據限制','2026-10-21','https://example.org/evaluation','支持範圍']) assert.ok(html.includes(value),value);
});
test('unresearched entry explicitly distinguishes missing evidence from safety',()=>{
 const html=renderToStaticMarkup(React.createElement(AdditiveEntryDetails,{entry}));
 assert.ok(html.includes('尚待逐項研究')); assert.ok(html.includes('不代表安全或有害'));
});
test('initial background work is not presented as established evidence scarcity',()=>{
 const research={status:'research-pending',reviewedAt:'2026-10-21',identity:'初步身分',processingUses:'用途',healthEffects:'一般背景',excessRisk:'條件',sensitiveGroups:'族群',evidenceLimitations:'專屬評估尚待查證',sources:[{title:'背景',url:'https://example.org/background',supports:'一般資料'}]};
 const html=renderToStaticMarkup(React.createElement(AdditiveEntryDetails,{entry:{...entry,research}}));
 assert.match(html,/尚待專屬查證/);assert.match(html,/不表示科學界已確定缺乏資料/);
});
