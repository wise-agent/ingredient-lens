import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAdditiveName, matchAdditives, searchAdditives, validateDictionary } from '../lib/additive-lookup.ts';
const source={title:'官方名稱資料',url:'https://data.gov.tw/dataset/6951'};
const purpose={categoryCode:'09',categoryZh:'甜味劑',plainPurpose:'提供甜味。',scope:'general-category'};
const dictionary={metadata:{retrievedAt:'2026-10-16',coverageIsComplete:false,completenessNote:'測試資料'},categories:[{code:'09',nameZh:'甜味劑',plainPurpose:'提供甜味。'}],additives:[
 {id:'a1',nameZh:'醋磺內酯鉀',nameEn:'Acesulfame Potassium',aliases:['醋磺內酯鉀別名'],purposes:[purpose],sources:[source]},
 {id:'a2',nameZh:'L-抗壞血酸',nameEn:'L-Ascorbic Acid',aliases:['維生素C'],purposes:[],sources:[source]},
 {id:'a3',nameZh:'檸檬酸',nameEn:'Citric Acid',aliases:[],purposes:[],sources:[source]},
 {id:'a4',nameZh:'檸檬酸鈉',nameEn:'Sodium Citrate',aliases:[],purposes:[],sources:[source]}
]};
test('normalization respects substance distinctions and folds NFKC/case',()=>{assert.equal(normalizeAdditiveName(' Ｌ－抗壞血酸 '),'l-抗壞血酸');assert.notEqual(normalizeAdditiveName('檸檬酸'),normalizeAdditiveName('檸檬酸鈉'));});
test('exact official Chinese, English and verified aliases resolve the same entry',()=>{for(const name of ['L-抗壞血酸','維生素Ｃ','l-ascorbic acid'])assert.deepEqual(matchAdditives(dictionary,name).map(x=>x.id),['a2']);});
test('a partial ingredient label is never automatically declared an additive match',()=>{assert.deepEqual(matchAdditives(dictionary,'抗壞血酸'),[]);assert.deepEqual(matchAdditives(dictionary,'蔗糖'),[]);assert.deepEqual(matchAdditives(dictionary,'甜味劑'),[]);});
test('ambiguous verified aliases remain explicit multiple matches, not first-match wins',()=>{let copy=structuredClone(dictionary);copy.additives[0].aliases.push('共同別名');copy.additives[1].aliases.push('共同別名');assert.equal(matchAdditives(copy,'共同別名').length,2);});
test('search supports partial Chinese, English, known aliases with exact ranking',()=>{assert.deepEqual(searchAdditives(dictionary,'檸檬酸').map(x=>x.id),['a3','a4']);assert.deepEqual(searchAdditives(dictionary,'ascor').map(x=>x.id),['a2']);assert.deepEqual(searchAdditives(dictionary,'維生素').map(x=>x.id),['a2']);});
test('purpose selector filters multi-purpose dictionary without a false ingredient association',()=>{assert.deepEqual(searchAdditives(dictionary,'','09').map(x=>x.id),['a1']);assert.deepEqual(searchAdditives(dictionary,'檸檬','09'),[]);assert.equal(searchAdditives(dictionary,'').length,4);});
test('validation rejects unsafe sources, duplicate IDs and unsupported description scope',()=>{assert.deepEqual(validateDictionary(dictionary),[]);for(const change of [d=>d.additives[0].sources[0].url='javascript:bad',d=>d.additives[1].id='a1',d=>d.additives[0].purposes[0].scope='specific-claim']){const d=structuredClone(dictionary);change(d);assert.ok(validateDictionary(d).length>0);}});
test('non-unique display names help search but never become verified substance aliases',()=>{const d=structuredClone(dictionary);d.additives[0].displayNames=['泛稱甲'];d.additives[1].displayNames=['泛稱甲'];assert.equal(searchAdditives(d,'泛稱甲').length,2);assert.equal(matchAdditives(d,'泛稱甲').length,0);});
test('verified official-item use is accepted separately from category-general descriptions',()=>{const d=structuredClone(dictionary);d.additives[0].purposes[0]={...d.additives[0].purposes[0],scope:'official-item',evidenceText:'本品可供過濾使用。'};assert.deepEqual(validateDictionary(d),[]);delete d.additives[0].purposes[0].evidenceText;assert.ok(validateDictionary(d).length>0);});
test('research validator rejects unsupported status, incomplete fields, credentials and unsafe URLs',()=>{
 const d=structuredClone(dictionary);d.additives[0].research={status:'reviewed',reviewedAt:'2026-10-21',identity:'身分',processingUses:'用途',healthEffects:'影響',excessRisk:'條件',sensitiveGroups:'族群',evidenceLimitations:'界線',sources:[{...source,supports:'支持用途'}]};
 assert.deepEqual(validateDictionary(d),[]);
 for(const change of [r=>r.status='safe',r=>r.reviewedAt='yesterday',r=>r.healthEffects='',r=>r.sources=[],r=>r.sources[0].url='https://user:password@example.com/',r=>r.sources[0].url='javascript:alert(1)',r=>r.sources[0].supports='']){const copy=structuredClone(d);change(copy.additives[0].research);assert.ok(validateDictionary(copy).some(e=>e.includes('research')));}
});
