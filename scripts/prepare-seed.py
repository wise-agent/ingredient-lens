import json,hashlib,pathlib,sys,collections
source=pathlib.Path(sys.argv[1]);dest=pathlib.Path(__file__).parent.parent/'seed';dest.mkdir(exist_ok=True)
s=json.load(source.open());meta=s['metadata'];products=s['products'];ings=s['ingredients'];cats=s['categories'];links=s['productIngredients']
byproduct=collections.defaultdict(list)
for r in links:byproduct[r['productId']].append(r)
string=lambda v:'' if v is None else str(v)
compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
import unicodedata
norm=lambda v:unicodedata.normalize('NFKC',v).strip().lower()
rows={k:[] for k in ['categories','ingredients','products','ingredient_categories','product_ingredients','product_categories']}
for c in cats:rows['categories'].append([c['id'],c['name'],c.get('parentId'),c.get('description','')])
for i in ings:
 rows['ingredients'].append([i['id'],i['name'],compact(i)])
 for c in i['categoryIds']:rows['ingredient_categories'].append([i['id'],c])
for p in products:
 p['ingredientLinks']=byproduct[p['id']]
 for key in ['name','company','spec','productCategory','traceCode','ingredientText','warningText']:p[key]=string(p.get(key))
 hasimage=bool(p.get('ingredientPhotoUrl')) or any(x.get('kind') in ['ingredient','ingredients','ingredient_label','成分','內容物標示照片'] for x in p.get('photos',[]))
 p['hasIngredientImage']=hasimage
 rows['products'].append([p['id'],p['name'],p['company'],p['spec'],p['productCategory'],p['traceCode'],p['ingredientText'],p['warningText'],p['ingredientStatus'],int(hasimage),norm(' '.join(p[k] for k in ['name','company','spec','productCategory','traceCode'])),compact(p)])
localcategories=collections.defaultdict(list)
byingredient={i['id']:i for i in ings}
for r in links:
 item=byingredient[r['ingredientId']]
 if item.get('kind') == 'function_label' and r['relation'] == 'contains':
  for c in item.get('categoryIds',[]):
   if c != 'unclassified':localcategories[(r['productId'],c)].append({'rawToken':r.get('rawToken',''),'sourceField':r.get('sourceField','')})
for (pid,cid),evidence in localcategories.items():rows['product_categories'].append([pid,cid,compact(evidence)])
seen=set()
for r in links:
 k=(r['productId'],r['ingredientId'],r['relation'])
 if k not in seen:rows['product_ingredients'].append(list(k));seen.add(k)
metadata={**meta,'totalProducts':len(products),'ingredientTextProducts':sum(bool(p['ingredientText']) for p in products),'ingredientImageOnlyProducts':sum(not p['ingredientText'] and p['hasIngredientImage'] for p in products),'noIngredientEvidenceProducts':sum(not p['ingredientText'] and not p['hasIngredientImage'] for p in products),'parsedProducts':sum(p['ingredientStatus']=='parsed' for p in products),'needsReviewProducts':sum(p['ingredientStatus']=='needs_review' for p in products),'photoUrlProducts':sum(bool(p.get('photos')) for p in products),'partialImport':meta.get('isPartial',True),'sourceUrl':meta['sourceDatasetUrl'],'coverageNote':meta.get('coverageLabel','')}
metadata['datasetVersion']=hashlib.sha256(source.read_bytes()).hexdigest()
manifest={'version':metadata['datasetVersion'],'metadata':metadata,'batches':[]}
for table,table_rows in rows.items():
 size=200 if table=='products' else 1000
 for start in range(0,len(table_rows),size):
  payload=compact({'table':table,'rows':table_rows[start:start+size]}).encode();index=len(manifest['batches']);filename=f'batch-{index:04d}.json';(dest/filename).write_bytes(payload)
  manifest['batches'].append({'index':index,'file':filename,'table':table,'rows':len(table_rows[start:start+size]),'sha256':hashlib.sha256(payload).hexdigest()})
(dest/'manifest.json').write_text(compact(manifest))
print(compact({'batches':len(manifest['batches']),'counts':{k:len(v) for k,v in rows.items()},'coverage':{k:metadata[k] for k in ['totalProducts','ingredientTextProducts','ingredientImageOnlyProducts','noIngredientEvidenceProducts']}}))
