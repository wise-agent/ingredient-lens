"""Read-only API acceptance tests, supports private Site credentials via hidden stdin."""
import json,sys,pathlib,urllib.request,urllib.parse,urllib.error
if sys.stdin.isatty():
 import termios
 t=termios.tcgetattr(sys.stdin);t[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSANOW,t)
 print('Ready for classification API test JSON (input hidden).',flush=True)
cfg=json.loads(sys.stdin.readline());base=cfg['url'].rstrip('/');token=cfg.get('token')
if token:assert base=='https://ingredient-lens-taiwan.aceonhuang.chatgpt.site'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect());requests=[]
def get(path,**params):
 headers={'Cache-Control':'no-cache'}
 if token:headers['OAI-Sites-Authorization']='Bearer '+token
 url=base+path+('?' + urllib.parse.urlencode(params) if params else '')
 with opener.open(urllib.request.Request(url,headers=headers),timeout=60) as r:
  assert r.status==200;data=json.load(r);requests.append({'path':path,'status':r.status});return data
expected=json.load(open('data/classification.json'));catalog=get('/api/catalog',classification=expected['version']);metadata=catalog['metadata'];byname={i['name']:i for i in catalog['ingredients']};byid={i['id']:i for i in catalog['ingredients']}
assert metadata['classification']['version']==expected['version']
for k,v in expected['summary'].items():assert metadata['classification'][k]==v,(k,v)
assert len(catalog['categories'])==len(expected['categories'])
for i in expected['ingredients']:
 actual=byid[i['id']]
 for k,v in i.items():assert actual[k]==v,(i['name'],k)
assert metadata['totalProducts']==50769 and metadata['ingredientTextProducts']==2030 and metadata['parsedProducts']==1657
assert metadata['databaseCounts']['categories']==len(expected['categories']) and metadata['databaseCounts']['ingredient_categories']==sum(len(i['categoryIds']) for i in expected['ingredients'])
def f(name,mode='include',typ='ingredient'):return {'type':typ,'id':byname[name]['id'] if typ=='ingredient' else name,'mode':mode}
def search(filters=[],**params):return get('/api/products',filters=json.dumps(filters),**params)
results={}
for name,cid in [('脂肪酸甘油酯','emulsifier'),('亞硝酸鈉','color_retention'),('DL-胺基丙酸','seasoning'),('關華豆膠','thickener'),('關華豆膠','emulsifier'),('巴糖醇','sweetener')]:
 result=search([f(name),f(cid,'exclude','category')]);assert result['total']==0,(name,cid,result['total']);results[name+'/'+cid]=0
for name,cid in [('水','food_water'),('麵粉','food_grains_starches'),('豬肉','food_meat'),('牛奶','food_dairy')]:assert search([f(name),f(cid,'exclude','category')])['total']==0,(name,cid)
# New researched names must agree across identity navigation and category exclusion.
for name,cid in [("5'-次黃嘌呤核苷磷酸二鈉",'seasoning'),("5'-鳥嘌呤核苷磷酸二鈉",'seasoning'),('雞心粉','food_salt_spices_condiments'),('甘草','food_botanicals'),('木瓜酵素','other_additive'),('雞蛋8%','food_eggs')]:
 assert search([f(name),f(cid,'exclude','category')])['total']==0,(name,cid)
for i in expected['ingredients']:
 if i.get('reviewedReferenceEntryIds'):assert byid[i['id']]['encyclopedia']['entryIds']==i['reviewedReferenceEntryIds'],i['name']
# Unknown/compound labels remain explicitly pending.
for name in ['維生素C.檸檬酸鈉','羧鉀基纖維素鈉','蛋白粉']:assert 'unclassified' in byname[name]['categoryIds']
# Find a parsed record whose fish-group warning is precaution-only; category negative must exclude it.
source=json.load(open('seed/manifest.json'));warning_product=None
for batch in source['batches']:
 if batch['table']!='products':continue
 for row in json.load(open(pathlib.Path('seed')/batch['file']))['rows']:
  p=json.loads(row[-1]);iid=byname['魚類']['id']
  if p['ingredientStatus']=='parsed' and iid in p.get('precautionIngredientIds',[]) and iid not in p.get('ingredientIds',[])+p.get('declaredContainsIngredientIds',[]):warning_product=p;break
 if warning_product:break
assert warning_product
p=warning_product;detail=get('/api/products/'+p['id'])['product'];assert byname['魚類']['id'] not in detail['ingredientIds']
r=search([f('魚類')],q=p['name']);assert p['id'] not in [v['id'] for v in r['products']]
r=search([f('food_seafood','exclude','category')],q=p['name']);assert p['id'] not in [v['id'] for v in r['products']]
# Current pending counts are based on current classes in both search and detail, without changing raw labels.
for p in search()['products']:
 expected_pending=[iid for iid in p['ingredientIds'] if 'unclassified' in byid[iid]['categoryIds']]
 assert set(p['unclassifiedIngredientIds'])==set(expected_pending)
for pid in ['p_cb12b1f50706','p_b9acc7b0c023','p_4b5facd586fe']:
 detail=get('/api/products/'+pid);p=detail['product'];expected_pending=[iid for iid in p['ingredientIds'] if 'unclassified' in byid[iid]['categoryIds']];assert set(p['unclassifiedIngredientIds'])==set(expected_pending)
assert search()['total']==1657
counts={'water':search([f('水')])['total'],'salt':search([f('鹽')])['total'],'waterAndSalt':search([f('水'),f('鹽')])['total'],'excludeSugar':search([f('糖','exclude')])['total'],'includeAdditiveReferences':search([f('additives',typ='category')])['total'],'excludeAdditiveReferences':search([f('additives','exclude','category')])['total']}
assert [counts[k] for k in ['water','salt','waterAndSalt','excludeSugar']]==[616,407,142,1269]
summary={'classificationApi':'passed','version':expected['version'],'classification':expected['summary'],'contradictions':results,'warningFixture':warning_product['id'],'filterCounts':counts,'requests':len(requests),'actualBrowserClicksVerified':False}
if cfg.get('out'):pathlib.Path(cfg['out']).write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False),flush=True)
