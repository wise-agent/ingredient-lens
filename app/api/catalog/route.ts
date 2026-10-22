import { database, readMetadata, readCategories, readIngredients, errorResponse } from '@/lib/catalog';
import { descendants } from '@/lib/filter-query.mjs';
export const dynamic='force-dynamic';
export async function GET() {
 try {
  const metadata=await readMetadata(); if(!metadata)return Response.json({error:'資料匯入中，完成後即可開始篩選。'},{status:503});
  const [categories,ingredients,productRows]=await Promise.all([readCategories(),readIngredients(),database().prepare("SELECT DISTINCT product_category FROM products WHERE product_category<>'' ORDER BY product_category").all<{product_category:string}>()]);
  const finalMetadata=await readMetadata();if(metadata?.classification?.version!==finalMetadata?.classification?.version)throw new Error('分類資料更新中，請稍後重新整理');
  return Response.json({metadata,categories:categories.map(c=>{const ids=new Set(descendants(c.id,categories));return {...c,memberCount:ingredients.filter(i=>i.kind!=='function_label'&&!i.warningOnly&&i.categoryIds.some((id:string)=>ids.has(id))).length};}),ingredients,productCategories:productRows.results.map(r=>r.product_category)},{headers:{'Cache-Control':'private, max-age=30'}});
 }catch(e){return errorResponse(e);}
}
