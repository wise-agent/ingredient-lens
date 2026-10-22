"""Read-only integration checks. Local preview defaults to port 5173."""
import json, os, urllib.request, hashlib, pathlib
base=os.environ.get('SITE_TEST_BASE','http://127.0.0.1:5173')
def read(path):
    with urllib.request.urlopen(base+path,timeout=40) as response:
        return response.status, response.headers, response.read()
status,headers,raw=read('/api/additives')
data=json.loads(raw)
source=json.loads(pathlib.Path('data/additives.json').read_text())
assert status==200 and data==source
assert len(data['additives'])>300
assert len(data['categories'])>=17
assert headers.get('Cache-Control','').startswith('private')
status,_,html=read('/additives')
assert status==200
assert '添加物'.encode() in html
_,_,home=read('/')
assert b'/additives' in home
_,_,catalog=read('/api/catalog')
assert json.loads(catalog)['metadata']['totalProducts']==50769
print(json.dumps({'api':'passed','entryCount':len(data['additives']),'categoryCount':len(data['categories']),'dictionarySha256':hashlib.sha256(raw).hexdigest(),'productRecordsUnchanged':50769},ensure_ascii=False))
