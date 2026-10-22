"""Real built-server routes and references; this is not a browser click test."""
import json,os,urllib.request,urllib.parse
from html.parser import HTMLParser
base=os.environ.get('SITE_TEST_BASE','http://127.0.0.1:5173')
def get(path):
 with urllib.request.urlopen(base+path,timeout=45) as r:return r.status,dict(r.headers),r.read().decode()
class Links(HTMLParser):
 def __init__(self):super().__init__();self.items=[];self.current=None
 def handle_starttag(self,tag,attrs):
  if tag=='a':self.current={'href':dict(attrs).get('href'),'text':''};self.items.append(self.current)
 def handle_endtag(self,tag):
  if tag=='a':self.current=None
 def handle_data(self,data):
  if self.current is not None:self.current['text']+=data

def anchors(path):
 status,headers,html=get(path);assert status==200;p=Links();p.feed(html);return p.items,html
home,homehtml=anchors('/');encyclopedia,ench=anchors('/additives')
assert sum(a['href']=='/additives' for a in home)>=2
assert any(a['href']=='/' and '首頁' in a['text'] for a in home)
assert any(a['href']=='/' and '首頁' in a['text'] for a in encyclopedia)
for href in {a['href'] for a in home+encyclopedia if a['href'] and a['href'].startswith('/') and not a['href'].startswith('//')}:
 assert get(urllib.parse.urldefrag(href)[0])[0]==200,href
catalog=json.loads(get('/api/catalog')[2]);dictionary=json.loads(get('/api/additives')[2]);ids={e['id'] for e in dictionary['additives']};catids={c['code'] for c in dictionary['categories']}
for ingredient in catalog['ingredients']:
 reference=ingredient['encyclopedia'];assert set(reference['entryIds'])<=ids
 if reference.get('categoryCode'):assert reference['categoryCode'] in catids
 if ingredient.get('kind')=='function_label':assert reference['entryIds']==[]
matched=next(i for i in catalog['ingredients'] if i['name']=='檸檬酸')
assert len(matched['encyclopedia']['entryIds'])==1
entry_id=matched['encyclopedia']['entryIds'][0]
deep='/additives?entry='+urllib.parse.quote(entry_id,safe='')
assert get(deep)[0]==200 and entry_id in get(deep)[2]
unknown=next(i for i in catalog['ingredients'] if i['name']=='水');assert unknown['encyclopedia']['entryIds']==[]
query='/additives?q='+urllib.parse.quote(unknown['name'],safe='');assert get(query)[0]==200
product=json.loads(get('/api/products/p_cb12b1f50706')[2])
assert all('encyclopedia' in i for i in product['ingredients'])
assert catalog['metadata']['totalProducts']==50769
print(json.dumps({'navigationRouteTests':'passed','homeToEncyclopediaLinks':sum(a['href']=='/additives' for a in home),'encyclopediaToHomeLinks':sum(a['href']=='/' for a in encyclopedia),'indexedIngredients':len(catalog['ingredients']),'directEntry':entry_id,'unknownSearch':'水','productDetailsHaveReferences':True,'productRecords':50769},ensure_ascii=False))
