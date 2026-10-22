import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const data=read('../data/classification.json');
const dictionary=read('../data/additives.json');
const researchFile=new URL('../data/research-mappings.json',import.meta.url);
const research=existsSync(researchFile)?JSON.parse(readFileSync(researchFile)):null;
const ingredients=new Map(data.ingredients.map(i=>[i.id,i]));
test('research accounts for every one of the 823 previously pending labels',()=>{
 assert.ok(research,'research handoff must be source controlled');
 assert.equal(research.decisions.length,823);
 assert.equal(new Set(research.decisions.map(d=>d.ingredientId)).size,823);
 assert.equal(data.summary.researchedIngredients,823);
 assert.equal(data.summary.researchClassifiedIngredients+data.summary.researchPendingIngredients,823);
 assert.equal(data.summary.pendingIngredients,data.summary.researchPendingIngredients);
});
test('every reviewed label has concrete evidence or a visible unresolved reason',()=>{
 assert.ok(research);
 const sources=new Map(research.sources.map(s=>[s.id,s]));
 for(const d of research.decisions){
  assert.ok(['classify','pending'].includes(d.status));assert.ok(d.reason.length>8,d.name);
  assert.equal(ingredients.get(d.ingredientId)?.name,d.name);
  assert.ok(d.evidenceSourceIds.length,d.name);
  for(const sid of d.evidenceSourceIds){const source=sources.get(sid);assert.ok(source,d.name+'/'+sid);const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.ok(source.title&&source.evidence);}
  const actual=ingredients.get(d.ingredientId);
  assert.equal(actual.classificationResearch.status,d.status);
  assert.equal(actual.classificationResearch.reason,d.reason);
  assert.equal(actual.categoryIds.includes('unclassified'),d.status==='pending',d.name);
  if(d.status==='pending'){assert.equal(d.entryIds.length,0);assert.equal(d.categoryIds.length,0);}
 }
});
test('researched reference identities retain all official purposes and raw names, without broad fuzzy matching',()=>{
 assert.ok(research);const entries=new Map(dictionary.additives.map(e=>[e.id,e]));
 for(const d of research.decisions.filter(d=>d.entryIds.length)){
  assert.equal(d.status,'classify');assert.equal(d.entryIds.length,1,d.name);
  const i=ingredients.get(d.ingredientId);assert.deepEqual(i.reviewedReferenceEntryIds,d.entryIds);
  for(const id of d.entryIds){assert.ok(entries.has(id));const evidence=i.classificationEvidence.find(e=>e.kind==='encyclopedia_reference'&&e.entryId===id);assert.ok(evidence,d.name);assert.deepEqual(evidence.categoryCodes,[...new Set(entries.get(id).purposes.map(p=>p.categoryCode))].sort());}
 }
 for(const name of ['維生素C.檸檬酸鈉','鹽酸硫胺明奶油二氧化矽','羧鉀基纖維素鈉']){const i=data.ingredients.find(i=>i.name===name);assert.ok(i.categoryIds.includes('unclassified'),name);assert.equal(i.reviewedReferenceEntryIds?.length||0,0);}
});
test('source-backed nucleotide punctuation and food names classify without confusing lookalikes',()=>{
 const byName=new Map(data.ingredients.map(i=>[i.name,i]));
 for(const n of ["5'-次黃嘌呤核苷磷酸二鈉","5'-鳥嘌呤核苷磷酸二鈉"]){assert.ok(byName.get(n).categoryIds.includes('seasoning'),n);assert.equal(byName.get(n).reviewedReferenceEntryIds.length,1);}
 const pepper=byName.get('雞心粉');assert.ok(pepper.categoryIds.includes('food_salt_spices_condiments'));assert.ok(!pepper.categoryIds.includes('food_meat'));
 const fragment=byName.get('豬');assert.ok(fragment.categoryIds.includes('unclassified'));assert.ok(!fragment.categoryIds.includes('food_meat'));
});
test('group references retain their purposes but never masquerade as exact aliases',()=>{
 assert.ok(research);const entries=new Map(dictionary.additives.map(e=>[e.id,e]));
 const purposeIds={'01':'preservative','02':'sterilizer','03':'antioxidant','04':'bleaching','05':'color_retention','06':'raising','07':'quality','08':'nutrition','09':'color','10':'flavor','11':'seasoning','11a':'sweetener','12':'thickener','13':'binding','14':'chemical','15':'carrier','16':'emulsifier','17':'other_additive'};
 for(const d of research.decisions.filter(d=>d.referenceGroupIds?.length)){
  const i=ingredients.get(d.ingredientId);assert.equal(d.status,'classify');
  for(const id of d.referenceGroupIds){assert.ok(!d.entryIds.includes(id));const entry=entries.get(id);assert.ok(entry);for(const p of entry.purposes)assert.ok(i.categoryIds.includes(purposeIds[p.categoryCode]),d.name);assert.ok(i.classificationEvidence.some(e=>e.kind==='encyclopedia_group_reference'&&e.entryId===id));}
 }
});
test('material taxonomy separates ethanol from beverages and explicitly bounds researched dextrins',()=>{
 for(const name of ['乙醇','酒精','食用酒精','精製食用酒精','釀造酒精']){const ethanol=data.ingredients.find(i=>i.name===name);assert.ok(ethanol.categoryIds.includes('food_ethanol_material'),name);assert.ok(!ethanol.categoryIds.includes('food_alcohol_fermented'),name);}
 const starch=data.categories.find(c=>c.id==='food_grains_starches');assert.match(starch.description,/核對.*澱粉衍生/);
});
