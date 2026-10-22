import {searchProducts,errorResponse,readMetadata} from '@/lib/catalog';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{if(!await readMetadata())return Response.json({error:'資料匯入中。'},{status:503});return Response.json(await searchProducts(new URL(request.url)),{headers:{'Cache-Control':'private, max-age=15'}});}catch(e){return errorResponse(e,e instanceof Error&&/格式|找不到/.test(e.message)?400:500);}}
