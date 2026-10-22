"""Run real filter SQL against a selected persisted D1 SQLite database (read-only)."""
import json,sqlite3,subprocess,sys,pathlib
p=sys.argv[1] if len(sys.argv)>1 else '.wrangler/final-state/v3/d1/miniflare-D1DatabaseObject/faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite'
db=sqlite3.connect('file:'+str(pathlib.Path(p).resolve())+'?mode=ro',uri=True)
categories=[dict(zip(['id','name','parentId','description'],r)) for r in db.execute('SELECT id,name,parent_id,description FROM categories')]
byname={n:i for i,n in db.execute('SELECT id,name FROM ingredients')}
def count(filters):
 js="import {buildWhere} from './lib/filter-query.mjs';let s='';for await (const c of process.stdin)s+=c;const x=JSON.parse(s);console.log(JSON.stringify(buildWhere({filters:x.filters},x.categories)));"
 r=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],input=json.dumps({'filters':filters,'categories':categories}).encode()))
 return db.execute('SELECT COUNT(*) FROM products p WHERE '+r['sql'],r['params']).fetchone()[0]
results={}
for name,category in [('脂肪酸甘油酯','emulsifier'),('亞硝酸鈉','color_retention'),('DL-胺基丙酸','seasoning')]:
 filters=[{'type':'ingredient','id':byname[name],'mode':'include'},{'type':'category','id':category,'mode':'exclude'}]
 results[name]=count(filters)
print(json.dumps(results,ensure_ascii=False),flush=True)
assert all(n==0 for n in results.values()), 'Known exact ingredient/category contradictions must be eliminated'
