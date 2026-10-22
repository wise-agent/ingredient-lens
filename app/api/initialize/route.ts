import {importBatch,importStatus,finishImport} from '@/lib/seed';
export const dynamic='force-dynamic';
// This endpoint accepts only exact source-controlled seed hashes. The owner-private
// Sites access boundary protects both browser and supported service access.
export async function GET(){try{return Response.json(await importStatus());}catch{return Response.json({error:'Initialization unavailable'},{status:503});}}
export async function POST(request:Request){try{const url=new URL(request.url);if(url.searchParams.get('finish')==='1')return Response.json(await finishImport());const index=Number(url.searchParams.get('batch'));const length=Number(request.headers.get('content-length')||0);if(length>4000000)return Response.json({error:'Batch too large'},{status:413});const raw=await request.text();if(raw.length>4000000)return Response.json({error:'Batch too large'},{status:413});return Response.json(await importBatch(index,raw));}catch(e){console.error(e instanceof Error?e.message:'Import error');return Response.json({error:'匯入批次驗證未通過或資料庫尚未就緒。'},{status:400});}}
