import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ingredientEncyclopediaHref, createIngredientEncyclopediaIndex } from '../lib/encyclopedia-navigation.ts';
import { matchAdditives } from '../lib/additive-lookup.ts';
const dictionary=JSON.parse(readFileSync(new URL('../data/additives.json',import.meta.url),'utf8'));
test('a single verified match links directly to the encoded entry and visible result anchor',()=>{assert.equal(ingredientEncyclopediaHref({name:'例',encyclopedia:{entryIds:['id/空 &?']}}),'/additives?entry=id%2F%E7%A9%BA%20%26%3F#additive-index');});
test('unknown and ambiguous names use explicit encoded search without pretending to identify them',()=>{for(const encyclopedia of [undefined,{entryIds:[]},{entryIds:['a','b']}])assert.equal(ingredientEncyclopediaHref({name:'名稱 / &?',encyclopedia}),'/additives?q=%E5%90%8D%E7%A8%B1%20%2F%20%26%3F#additive-index');});
test('function category links and empty fallback remain valid same-site routes',()=>{assert.equal(ingredientEncyclopediaHref({name:'防腐劑',encyclopedia:{entryIds:[],categoryCode:'01'}}),'/additives?category=01#additive-index');assert.equal(ingredientEncyclopediaHref({name:''}),'/additives#additive-index');});
test('fast reference index equals exact dictionary matching and refuses generic aliases',()=>{const resolve=createIngredientEncyclopediaIndex(dictionary);for(const name of ['己二烯酸','山梨酸','L-抗壞血酸','檸檬酸','水','Metallic','solution','維生素Ｃ'])assert.deepEqual(resolve({name,aliases:[]}).entryIds,matchAdditives(dictionary,name).map(x=>x.id),name);});
test('function labels get category references rather than false substance identities',()=>{const resolve=createIngredientEncyclopediaIndex(dictionary);assert.deepEqual(resolve({name:'防腐劑',kind:'function_label'}),{entryIds:[],categoryCode:'01'});});
test('index matches reference lookup across every official name and verified alias',()=>{const resolve=createIngredientEncyclopediaIndex(dictionary);const names=[...new Set(dictionary.additives.flatMap(e=>[e.nameZh,e.nameEn,...e.aliases]).filter(Boolean))];for(const name of names){const result=resolve({name});assert.deepEqual(result.entryIds,matchAdditives(dictionary,name).map(x=>x.id),name);assert.ok(ingredientEncyclopediaHref({name,encyclopedia:result}).startsWith('/additives'));}});
test('reviewed identity links use explicit known IDs without widening name normalization',()=>{
 const entry=dictionary.additives.find(e=>e.nameZh==='檸檬酸');const resolve=createIngredientEncyclopediaIndex(dictionary);
 assert.deepEqual(resolve({name:'經來源核對的寫法',reviewedReferenceEntryIds:[entry.id]}).entryIds,[entry.id]);
 assert.deepEqual(resolve({name:'未核對相似寫法'}).entryIds,[]);
 assert.deepEqual(resolve({name:'不明名稱',reviewedReferenceEntryIds:['missing-entry']}).entryIds,[]);
 assert.deepEqual(resolve({name:'防腐劑',kind:'function_label',reviewedReferenceEntryIds:[entry.id]}).entryIds,[]);
});
