import pathlib,json,sys,urllib.request,concurrent.futures,time
# Read the private Site URL and optional service token from stdin; never save credentials.
config=json.loads(sys.stdin.readline());base=config['url'].rstrip('/');token=config.get('token');manifest=json.load(open(pathlib.Path(__file__).parent.parent/'seed/manifest.json'));root=pathlib.Path(__file__).parent.parent/'seed'
def request(path,body=None):
 headers={'Content-Type':'application/json'}
 if token:headers['OAI-Sites-Authorization']='Bearer '+token
 req=urllib.request.Request(base+path,data=body,headers=headers,method='POST' if body is not None else 'GET')
 with urllib.request.urlopen(req,timeout=90) as r:return json.load(r)
status=request('/api/initialize');completed=set(status['completed']);print(json.dumps({'alreadyImported':len(completed),'total':len(manifest['batches'])}),flush=True)
def submit(b):
 for attempt in range(4):
  try:return request('/api/initialize?batch='+str(b['index']),(root/b['file']).read_bytes())
  except Exception:
   if attempt==3:raise
   time.sleep(2**attempt)
for table in ['categories','ingredients','products','ingredient_categories','product_ingredients','product_categories']:
 batch=[b for b in manifest['batches'] if b['table']==table and b['index'] not in completed]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for i,_ in enumerate(pool.map(submit,batch)):
   if i%20==0 or i==len(batch)-1:print(json.dumps({'table':table,'done':i+1,'of':len(batch)}),flush=True)
print(json.dumps(request('/api/initialize?finish=1',b'{}')),flush=True)
