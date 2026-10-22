import json,urllib.request,urllib.parse,pathlib
base='http://127.0.0.1:5173'
def get(path,**params):
 url=base+path+('?' + urllib.parse.urlencode(params) if params else '')
 with urllib.request.urlopen(url,timeout=45) as r:return json.load(r)
cat=get('/api/catalog');meta=cat['metadata'];assert meta['totalProducts']==50769;assert meta['ingredientTextProducts']==2030;assert meta['ingredientImageOnlyProducts']==11149;assert meta['noIngredientEvidenceProducts']==37590
assert meta['parsedProducts']+meta['needsReviewProducts']==2030
byname={i['name']:i for i in cat['ingredients']}
def f(name,mode='include',typ='ingredient'):
 return {'type':typ,'id':byname[name]['id'] if typ=='ingredient' else name,'mode':mode,'name':name}
def search(filters=[],**kwargs):return get('/api/products',filters=json.dumps(filters,ensure_ascii=False),**kwargs)
initial=search();assert initial['total']==meta['parsedProducts'];assert len(initial['products'])==24
assert search(scope='ingredients')['total']==2030
allp=search(scope='all');assert allp['total']==50769
second=search(page=2);assert not({p['id'] for p in initial['products']}&{p['id'] for p in second['products']})
water=search([f('水')]);salt=search([f('鹽')]);both=search([f('水'),f('鹽')]);assert both['total']<=min(water['total'],salt['total'])
for p in both['products']:assert all(byname[n]['id'] in p['ingredientIds']+p.get('declaredContainsIngredientIds',[]) for n in ['水','鹽'])
negative=search([f('糖','exclude')],scope='all');assert negative['total']<50769
for p in negative['products']:
 assert p['ingredientStatus']=='parsed'
 assert byname['糖']['id'] not in p['ingredientIds']+p['precautionIngredientIds']+p.get('declaredContainsIngredientIds',[])
contradiction=search([f('糖'),f('糖','exclude')],scope='all');assert contradiction['total']==negative['total']
add=search([f('additives',typ='category')]);noadd=search([f('additives','exclude','category')]);assert noadd['classificationCaution'];assert noadd['total']>4
fixture=get('/api/products/p_4b5facd586fe');assert fixture['product']['precautionIngredientIds']
for id in fixture['product']['precautionIngredientIds']:
 if id not in fixture['product']['ingredientIds']+fixture['product'].get('declaredContainsIngredientIds',[]):
  result=search([{'type':'ingredient','id':id,'mode':'include'}],q=fixture['product']['name']);assert fixture['product']['id'] not in [p['id'] for p in result['products']]
  result=search([{'type':'ingredient','id':id,'mode':'exclude'}],q=fixture['product']['name']);assert fixture['product']['id'] not in [p['id'] for p in result['products']]
for id in ['p_0cbd8060c465','p_8c65ba3001a9','p_05240cb28d88','p_06aa77624af4']:
 product=get('/api/products/'+id)['product'];assert product['ingredientStatus']!='parsed', (id,product['ingredientStatus'])
try:search([{'type':'ingredient','id':"' OR 1=1",'mode':'include'}]);raise AssertionError('invalid input accepted')
except urllib.error.HTTPError as e:assert e.code==400
print(json.dumps({'apiTests':'passed','total':allp['total'],'defaultParsed':initial['total'],'parsed':meta['parsedProducts'],'needsReview':meta['needsReviewProducts'],'includeWater':water['total'],'includeSalt':salt['total'],'includeBoth':both['total'],'excludeSugar':negative['total'],'includeAdditives':add['total'],'excludeClassifiedAdditives':noadd['total']},ensure_ascii=False))

for pid,category in [('p_cb12b1f50706','sweetener'),('p_b9acc7b0c023','antioxidant')]:
 p=get('/api/products/'+pid)['product'];result=search([f(category,typ='category')],q=p['name'],scope='ingredients');assert pid in [p['id'] for p in result['products']],(pid,category)
 result=search([f(category,'exclude','category')],q=p['name'],scope='ingredients');assert pid not in [p['id'] for p in result['products']]
print('Product-local category evidence fixtures passed')
