import {classificationStatus,applyClassificationBatch,finishClassification} from '@/lib/classification';
export const dynamic='force-dynamic';
// Owner-private Sites access boundary. No arbitrary data/SQL is accepted: only
// source-controlled classification batches, bound to the original dataset version.
export async function GET(){try{return Response.json(await classificationStatus(),{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e instanceof Error?e.message:'Classification status error');return Response.json({error:'Classification source mismatch'},{status:409});}}
export async function POST(request:Request){try{const url=new URL(request.url);if(url.searchParams.get('finish')==='1')return Response.json(await finishClassification());const raw=url.searchParams.get('batch');if(raw===null||!/^\d+$/.test(raw))return Response.json({error:'Invalid batch'},{status:400});return Response.json(await applyClassificationBatch(Number(raw)));}catch(e){console.error(e instanceof Error?e.message:'Classification error');return Response.json({error:'分類批次驗證未通過。'},{status:409});}}
