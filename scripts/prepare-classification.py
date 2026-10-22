"""Reproducible, evidence-preserving classification overlay; original seed stays unchanged."""
import json,hashlib,pathlib,unicodedata,collections,sys
root=pathlib.Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text())
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
manifest=read(root/'seed/manifest.json');dictionary=read(root/'data/additives.json')
ordinary=read(pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root/'data/ordinary-mappings.json')
research=read(root/'data/research-mappings.json')
assert research['sourceDatasetVersion']==manifest['version'], 'Research applies only to its reviewed source snapshot'
research_by={r['ingredientId']:r for r in research['decisions']}
research_sources={s['id']:s for s in research['sources']}
assert len(research_by)==len(research['decisions'])==823
tables=collections.defaultdict(list)
for b in manifest['batches']:
 if b['table'] in ['ingredients','categories','product_ingredients']:tables[b['table']]+=read(root/'seed'/b['file'])['rows']
ingredients=[json.loads(r[2]) for r in tables['ingredients']]
normalize=lambda s:' '.join(unicodedata.normalize('NFKC',str(s or '')).lower().strip().split())
index=collections.defaultdict(set)
for e in dictionary['additives']:
 for name in [e['nameZh'],e['nameEn']]+e['aliases']:
  if normalize(name):index[normalize(name)].add(e['id'])
entries={e['id']:e for e in dictionary['additives']}
crosswalk=dict(zip(['01','02','03','04','05','06','07','08','09','10','11','11a','12','13','14','15','16','17'],['preservative','sterilizer','antioxidant','bleaching','color_retention','raising','quality','nutrition','color','flavor','seasoning','sweetener','thickener','binding','chemical','carrier','emulsifier','other_additive']))
categories=[dict(zip(['id','name','parentId','description'],r)) for r in tables['categories']]
cats={c['id']:c for c in categories}
cats['additives']['name']='食品添加物參考用途'
cats['additives']['description']='依已核對百科詞條的參考用途與原標示用途分類，涵蓋子類。不能據此判定廠商實際用途、准用條件、用量或安全性。'
for c in dictionary['categories']:
 cid=crosswalk[c['code']]
 if cid not in cats:
  cats[cid]={'id':cid,'name':c['nameZh'],'parentId':'additives'};categories.append(cats[cid])
 cats[cid]['description']='百科參考用途：'+c['plainPurpose']+' 名稱對應不表示在這項商品中的實際用途，也不判定可否使用；請查閱詞條的來源與生效日期。'
cats['unclassified']['name']='待核對分類'
cats['unclassified']['description']='尚未建立可靠分類的標示名稱，可能是一般原料、添加物、複方或待釐清字串；未配對不代表不是添加物。'
for c in ordinary['categories']+research.get('categories',[]):
 assert c['id'] not in cats,c['id']
 categories.append(c);cats[c['id']]=c
cats['food_grains_starches']['description']='穀物、穀粉、明確來源澱粉及經本輪來源核對的澱粉衍生材料（如麥芽糊精、糊精）。分類只表示材料類型；未明來源、修飾型態或複方規格者仍待確認，不能推定無添加物或依法准用。'
cats['ordinary_food']['name']='食材與來源材料'
cats['ordinary_food']['description']+=' 本輪亦按標示納入植物、菌種、真菌等來源材料類型；不能據此認定均可直接食用、依法准用或沒有添加物。'
ordinary_by={r['ingredientId']:r for r in ordinary['mappings']}
warning_by={r['ingredientId']:r for r in ordinary.get('warningMappings',[])}
assert len(ordinary_by)==len(ordinary['mappings'])
relations=collections.defaultdict(set)
for _,iid,relation in tables['product_ingredients']:relations[iid].add(relation)
counts=collections.Counter();records=[]
for original in ingredients:
 i=dict(original);prior=list(i['categoryIds']);ids=set()
 if i.get('kind')!='function_label':
  for name in [i['name']]+i.get('aliases',[]):ids.update(index.get(normalize(name),set()))
 decision=research_by.get(i['id'])
 evidence=[];category_ids=set(prior)
 if decision:
  assert decision['name']==i['name'] and 'unclassified' in prior
  assert i['id'] not in ordinary_by and i['id'] not in warning_by
  assert decision['status'] in ['classify','pending'] and decision['reason']
  assert decision['evidenceSourceIds'] and all(s in research_sources for s in decision['evidenceSourceIds'])
  assert not ids, 'Research must not override an existing exact identity'
  if decision['status']=='classify':
   assert decision['entryIds'] or decision['categoryIds']
   assert len(decision['entryIds'])<=1 and all(eid in entries for eid in decision['entryIds'])
   ids.update(decision['entryIds']);category_ids.update(decision['categoryIds'])
   counts['researchClassifiedIngredients']+=1
   if ids:i['reviewedReferenceEntryIds']=sorted(ids)
  else:
   assert not decision['entryIds'] and not decision['categoryIds']
   counts['researchPendingIngredients']+=1
  assert all(gid in entries for gid in decision.get('referenceGroupIds',[]))
  if decision.get('referenceGroupIds'):
   assert decision['status']=='classify'
   counts['researchGroupReferenceIngredients']+=1
   for gid in decision['referenceGroupIds']:
    assert gid not in ids
    entry=entries[gid];purposes=sorted(set(p['categoryCode'] for p in entry['purposes']))
    category_ids.update(crosswalk[c] for c in purposes)
    evidence.append({'kind':'encyclopedia_group_reference','entryId':gid,'entryName':entry['nameZh'],'categoryCodes':purposes,'categoryIds':[crosswalk[c] for c in purposes],'sources':entry['sources'],'note':'參考類群或合併列名的用途，不是單一物質的精確別名，也不是商品實際用途或法規判定。'})
  counts['researchedIngredients']+=1
 warning=bool(relations[i['id']]) and 'contains' not in relations[i['id']]
 if len(ids)==1:
  entry=entries[next(iter(ids))]
  purposes=sorted(set(p['categoryCode'] for p in entry['purposes']))
  category_ids.update(crosswalk[c] for c in purposes)
  evidence.append({'kind':'encyclopedia_reference','entryId':entry['id'],'entryName':entry['nameZh'],'entryType':entry.get('entryType'),'categoryCodes':purposes,'categoryIds':[crosswalk[c] for c in purposes],'sources':entry['sources'],'regulatoryStatus':entry.get('regulatoryStatus'),'regulatoryNote':entry.get('regulatoryNote'),'note':'精確名稱／核對別名的百科參考用途，不是商品實際用途或法規判定。'})
  counts['encyclopediaMatchedIngredients']+=1
  if 'unclassified' in prior:counts['newlyClassifiedByEncyclopedia']+=1
  if len(purposes)>1:counts['multiPurposeIngredients']+=1
 elif len(ids)>1:counts['ambiguousEncyclopediaMatches']+=1
 if i['id'] in ordinary_by:
  m=ordinary_by[i['id']];assert m['name']==i['name']
  category_ids.update(m['categoryIds']);evidence.append({'kind':'reviewed_food_type',**m})
  counts['ordinaryClassifiedIngredients']+=1
  if 'unclassified' in prior and not ids:counts['newlyClassifiedByFoodType']+=1
 if decision:
  if decision['status']=='classify':
   for cid in list(category_ids):
    assert cid in cats,cid
    current=cats[cid]
    while current.get('parentId'):
     category_ids.add(current['parentId']);current=cats[current['parentId']]
   if 'ordinary_food' in category_ids:
    counts['ordinaryClassifiedIngredients']+=1;counts['newlyClassifiedByFoodType']+=1
   evidence.append({'kind':'researched_classification','matchKind':decision.get('matchKind'),'reason':decision['reason'],'sourceIds':decision['evidenceSourceIds']})
  i['classificationResearch']={'status':decision['status'],'reasonCode':decision.get('reasonCode'),'reason':decision['reason'],'matchKind':decision.get('matchKind'),'referenceGroups':[{'id':gid,'name':entries[gid]['nameZh']} for gid in decision.get('referenceGroupIds',[])],'categoryNames':[cats[cid]['name'] for cid in sorted(category_ids) if cid not in ['unclassified','ordinary_food','additives']],'sources':[{'title':research_sources[s]['title'],'url':research_sources[s]['url']} for s in decision['evidenceSourceIds']]}
 if i['id'] in warning_by:
  assert warning
  m=warning_by[i['id']];assert m['name']==i['name']
  category_ids.update(m['categoryIds']);evidence.append({'kind':'warning_category_reference',**m});counts['classifiedWarningLabels']+=1
 if evidence or warning:category_ids.discard('unclassified')
 assert category_ids.issubset(cats), category_ids-set(cats)
 i['sourceCategoryIds']=prior;i['categoryIds']=sorted(category_ids);i['warningOnly']=warning
 i['classificationEvidence']=[*i.get('classificationEvidence',[]),*evidence]
 i['sourceClassificationStatus']=original.get('classificationStatus')
 i['classificationStatus']='warning_only' if warning else 'linked_reference' if len(ids)==1 else 'researched_category' if decision and decision['status']=='classify' else 'reviewed_food_type' if i['id'] in ordinary_by else original.get('classificationStatus','unclassified')
 i['classificationBasis']='reference_and_food_type_v2'
 if warning:counts['warningOnlyIngredients']+=1
 elif i.get('kind')!='function_label' and 'unclassified' in category_ids:counts['pendingIngredients']+=1
 records.append(i)
pending_reasons=collections.Counter(d.get('reasonCode','insufficient_evidence') for d in research['decisions'] if d['status']=='pending')
counts['totalIngredientLabels']=len(records);counts['functionLabels']=sum(i.get('kind')=='function_label' for i in records)
counts['classifiedRecipeLabels']=sum(not i['warningOnly'] and i.get('kind')!='function_label' and 'unclassified' not in i['categoryIds'] for i in records)
assert counts['researchedIngredients']==823
payload={'sourceDatasetVersion':manifest['version'],'dictionarySha256':hashlib.sha256((root/'data/additives.json').read_bytes()).hexdigest(),'researchSha256':hashlib.sha256((root/'data/research-mappings.json').read_bytes()).hexdigest(),'researchPendingReasons':dict(pending_reasons),'categories':categories,'ingredients':records,'summary':dict(counts),'notes':['百科用途是參考用途，不代表廠商實際使用目的、可否使用、用量或安全性。','一般原料分類按核對名稱歸類；複方類別不能推論其內含成分。','原始種子資料、商品成分原文及警語關聯保留不動；未配對不等於非添加物。','本輪逐項核對既有 823 個待分類標示，依官方／原廠來源及原始標示建立有界對照；仍不明確者保留原因與來源，不自動修正錯字或猜測複方。']}
version=hashlib.sha256(compact(payload).encode()).hexdigest();payload['version']=version
for i in records:i['classificationVersion']=version
(root/'data/classification.json').write_text(compact(payload)+'\n')
print(compact({'version':version,**counts,'categories':len(categories)}))
