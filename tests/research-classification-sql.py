"""Exercise actual generated filter SQL against migrated local D1 (read-only)."""
import json, sqlite3, pathlib, subprocess, sys, hashlib
path=pathlib.Path(sys.argv[1]).resolve()
db=sqlite3.connect('file:'+str(path)+'?mode=ro',uri=True)
data=json.load(open('data/classification.json'));research=json.load(open('data/research-mappings.json'))
byid={i['id']:i for i in data['ingredients']}
categories=data['categories'];cases=[]
for d in research['decisions']:
 if d['status']!='classify':continue
 i=byid[d['ingredientId']]
 for cid in i['categoryIds']:
  if cid in ['ordinary_food','additives']:continue
  cases.append({'name':d['name'],'category':cid,'filters':[{'type':'ingredient','id':i['id'],'mode':'include'},{'type':'category','id':cid,'mode':'exclude'}]})
js="import {buildWhere} from './lib/filter-query.mjs';let s='';for await(const c of process.stdin)s+=c;const x=JSON.parse(s);console.log(JSON.stringify(x.cases.map(c=>buildWhere({filters:c.filters},x.categories))));"
queries=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],input=json.dumps({'cases':cases,'categories':categories}).encode()))
for case,q in zip(cases,queries):
 n=db.execute('SELECT COUNT(*) FROM products p WHERE '+q['sql'],q['params']).fetchone()[0]
 assert n==0,(case,n)
expected={'products':'e00fd206e0be3fa2d174fbed6b8419245de9292a0eb7197dfee59b43f3ea5caa','product_ingredients':'bbe39445b8264937c696ab8cbf1ad3a95532c395218fb9f4751576049bc7cd3d','product_categories':'2f948c94d713724d16f35a399fc2763dda03dfab5187e59311cff6086713a797'}
# Compare the exact rows against the pre-update baseline, not a hash serialization assumption.
baseline=sqlite3.connect('file:'+str(pathlib.Path('.wrangler/classification-state/v3/d1/miniflare-D1DatabaseObject/faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite').resolve())+'?mode=ro',uri=True)
for table in expected:
 actual=list(db.execute('SELECT * FROM '+table+' ORDER BY 1,2,3'))
 prior=list(baseline.execute('SELECT * FROM '+table+' ORDER BY 1,2,3'))
 assert actual==prior,table+' source rows changed'
for d in research['decisions']:
 stored=json.loads(db.execute('SELECT data FROM ingredients WHERE id=?',(d['ingredientId'],)).fetchone()[0]);assert stored==byid[d['ingredientId']]
print(json.dumps({'researchSql':'passed','contradictionCases':len(cases),'sourceTablesUnchanged':list(expected),'researchDecisions':len(research['decisions'])}))
