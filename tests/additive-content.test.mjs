import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDictionary, matchAdditives, searchAdditives } from '../lib/additive-lookup.ts';
const dictionary=JSON.parse(readFileSync(new URL('../data/additives.json',import.meta.url),'utf8'));
test('shipped official dictionary has substantive coverage, sources and no duplicate identities',()=>{assert.ok(dictionary.additives.length>300,'official full annex should be larger than a demonstration dictionary');assert.ok(dictionary.categories.length>=17);assert.deepEqual(validateDictionary(dictionary),[]);assert.ok(dictionary.metadata.retrievedAt);assert.ok(dictionary.metadata.completenessNote);});
test('official common additives are discoverable by original name',()=>{for(const name of ['檸檬酸','苯甲酸','L-抗壞血酸'])assert.ok(matchAdditives(dictionary,name).length>=1,name);});
test('every purpose has a recognized classification and explicit provenance scope',()=>{for(const entry of dictionary.additives){assert.ok(entry.purposes.length>0,entry.nameZh);for(const purpose of entry.purposes){assert.ok(['general-category','official-item'].includes(purpose.scope));if(purpose.scope==='official-item')assert.ok(purpose.evidenceText?.trim());assert.ok(dictionary.categories.some(category=>category.code===purpose.categoryCode));assert.ok(purpose.plainPurpose.trim());}}});
test('encyclopedia text search never upgrades a partial match to confirmed product identity',()=>{assert.ok(searchAdditives(dictionary,'苯甲').length>0);assert.equal(matchAdditives(dictionary,'苯甲').length,0);assert.equal(matchAdditives(dictionary,'食品添加物').length,0);});
test('all official entries retain substance/group and legal-status distinctions',()=>{for(const entry of dictionary.additives){assert.ok(['substance','group'].includes(entry.entryType),entry.nameZh);assert.ok(['official-listed','amended-not-yet-effective','mixed-effective-dates'].includes(entry.regulatoryStatus),entry.nameZh);assert.ok(entry.regulatoryNote?.trim(),entry.nameZh);}});
test('ordinary English descriptors are not verified substance aliases',()=>{for(const name of ['Metallic','solution'])assert.equal(matchAdditives(dictionary,name).length,0,name);});
test('generic vitamin C remains searchable without a single-substance assignment',()=>{assert.ok(searchAdditives(dictionary,'維生素C').length>1);assert.equal(matchAdditives(dictionary,'維生素C').length,0);});
test('research records keep all evidence fields and safe sources when present', () => {
 for(const entry of dictionary.additives ?? []) {
  if(!entry.research) continue;
  const r=entry.research;
  assert.ok(['reviewed','evidence-limited','identity-pending','research-pending'].includes(r.status));
  for(const key of ['reviewedAt','identity','processingUses','healthEffects','excessRisk','sensitiveGroups','evidenceLimitations']) assert.ok(typeof r[key]==='string' && r[key].trim(),`${entry.id} ${key}`);
  assert.ok(r.sources.length);
  for(const source of r.sources) { assert.ok(source.url.startsWith('https://')); assert.ok(source.title && source.supports); }
 }
});
test('only approved research batches reach the shared dictionary and ledger', () => {
 const base=new URL('../research/additive-batches/',import.meta.url);
 const approved=JSON.parse(readFileSync(new URL('approved-batches.json',base),'utf8'));
 const pendingSpecific=new Set(JSON.parse(readFileSync(new URL('pending-specific-review.json',base),'utf8')).ids);
 const records=new Map();
 for(const file of approved) for(const item of JSON.parse(readFileSync(new URL('approved-content/'+file,base),'utf8'))) {
  assert.ok(!records.has(item.id),`duplicate ${item.id}`); records.set(item.id,pendingSpecific.has(item.id)?{...item.research,status:'research-pending'}:item.research);
 }
 const counts={};
 const ledger=JSON.parse(readFileSync(new URL('status.json',base),'utf8'));
 assert.equal(ledger.length,dictionary.additives.length);
 for(const entry of dictionary.additives) {
  assert.deepEqual(entry.research,records.get(entry.id),entry.id);
  const status=entry.research?.status ?? 'pending'; counts[status]=(counts[status]??0)+1;
  assert.equal(ledger.find(x=>x.id===entry.id)?.status,status);
 }
 assert.deepEqual(dictionary.metadata.research.counts,counts);
});
