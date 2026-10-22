"""Merge individually researched records; never infer research completion from coverage."""
import json,pathlib,collections,sys,re
from urllib.parse import urlparse
root=pathlib.Path(__file__).resolve().parents[1]
p=root/'data/additives.json';data=json.loads(p.read_text());known={e['id']:e for e in data['additives']};seen=set()
batch_root=root/'research/additive-batches'
approved=json.loads((batch_root/'approved-batches.json').read_text())
assert len(approved)==len(set(approved)), 'Duplicate approved batch'
for entry in known.values(): entry.pop('research',None)
for name in sorted(approved):
 assert pathlib.Path(name).name==name and name.startswith('review-') and name.endswith('.json'), name
 batch=batch_root/'approved-content'/name
 for item in json.loads(batch.read_text()):
  key=item['id'];r=item['research']
  if key not in known or key in seen:raise ValueError(f'Unknown or duplicate research ID {key}')
  seen.add(key)
  assert r['status'] in ['reviewed','evidence-limited','identity-pending']
  for field in ['reviewedAt','identity','processingUses','healthEffects','excessRisk','sensitiveGroups','evidenceLimitations']:
   assert isinstance(r[field],str) and r[field].strip(),(key,field)
  assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['reviewedAt']),key
  assert r['sources']
  for source in r['sources']:
   u=urlparse(source['url'])
   assert u.scheme=='https' and u.hostname and not u.username and not u.password and source['title'].strip() and source['supports'].strip(),key
  known[key]['research']=r
pending_specific=set(json.loads((batch_root/'pending-specific-review.json').read_text())['ids'])
assert pending_specific <= set(known), 'Unknown pending review IDs'
for key in pending_specific:
 if 'research' in known[key]: known[key]['research']['status']='research-pending'
counts=collections.Counter(e.get('research',{}).get('status','pending') for e in known.values())
data['metadata']['research']={'schemaVersion':'1.0','updatedAt':'2026-10-21','counts':dict(counts),'scope':'既有717個百科詞條，含營養添加劑、加工助劑與類群；不是717種獨立分子。','completionNote':'初步紀錄覆蓋不等於專屬研究完成。尚待專屬查證與已查後證據有限、身分待確認分開統計；所有狀態均非安全認證。'}
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
ledger=[{'id':e['id'],'name':e['nameZh'],'category':e['purposes'][0]['categoryCode'],'status':e.get('research',{}).get('status','pending')} for e in known.values()]
(root/'research/additive-batches/status.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
print(dict(counts))
