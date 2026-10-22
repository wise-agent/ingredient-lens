"""Promote only explicitly QA-approved research IDs from working batches.
Usage: python scripts/approve-additive-research.py [--delta FILE] ID [ID ...]
The caller must first complete content QA. This does not make a safety judgment.
"""
import sys,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]; b=root/'research/additive-batches'
args=sys.argv[1:];delta=None
if args[:1]==['--delta']:
 assert len(args)>=3, 'Supply a QA-approved delta file and IDs'
 rows=json.loads(pathlib.Path(args[1]).read_text());delta={x['id']:x for x in rows}
 assert len(delta)==len(rows), 'Duplicate delta IDs'
 args=args[2:]
ids=set(args);assert ids and len(ids)==len(args),'Provide unique, content-QA-approved IDs'
if delta is not None: assert ids<=set(delta), 'Requested IDs absent from delta'
blocked=b/'blocked-specific-review.json'
if blocked.exists(): assert not ids.intersection(json.loads(blocked.read_text())['ids']), 'Blocked review IDs require resolution before promotion'
names=json.loads((b/'approved-batches.json').read_text());found={};updates={}
for name in names:
 live={x['id']:x for x in json.loads((b/name).read_text())}; path=b/'approved-content'/name
 rows=json.loads(path.read_text());changed=False
 for i,row in enumerate(rows):
  key=row['id']
  if key in ids:
   assert key not in found and key in live,key
   candidate=(delta[key] if delta is not None else live[key]);r=candidate['research']
   assert r['status'] in ['reviewed','evidence-limited','identity-pending']
   assert r['sources'] and all(r.get(f) for f in ['identity','processingUses','healthEffects','excessRisk','sensitiveGroups','evidenceLimitations'])
   rows[i]=candidate;found[key]=name;changed=True
 if changed:updates[path]=rows
assert set(found)==ids, f'Unknown requested IDs: {ids-set(found)}'
for path,rows in updates.items():path.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
p=b/'pending-specific-review.json';data=json.loads(p.read_text());data['ids']=[x for x in data['ids'] if x not in ids];p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'promotedIds':sorted(ids),'remainingSpecificReview':len(data['ids'])},ensure_ascii=False))
