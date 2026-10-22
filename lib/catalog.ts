import additiveDictionary from '@/data/additives.json';
import { createIngredientEncyclopediaIndex } from './encyclopedia-navigation';
import type { AdditiveDictionary } from './additive-lookup';
const encyclopediaReference = createIngredientEncyclopediaIndex(additiveDictionary as unknown as AdditiveDictionary);
import { env } from 'cloudflare:workers';
import { buildWhere, cleanFilters, descendants, normalize } from './filter-query.mjs';
export function database(): D1Database { if(!env.DB) throw new Error('資料庫尚未連線'); return env.DB; }
export async function readMetadata() {
 const rows=await database().prepare("SELECT key,value FROM dataset_metadata WHERE key IN ('metadata','classification_pending')").all<{key:string,value:string}>();
 if(rows.results.some(row=>row.key==='classification_pending'))throw new Error('分類資料更新中，請稍後重新整理');
 const row=rows.results.find(row=>row.key==='metadata');return row?JSON.parse(row.value):null;
}
export async function readCategories() { const rows=await database().prepare('SELECT id,name,parent_id AS parentId,description FROM categories ORDER BY rowid').all(); return rows.results as {id:string,name:string,parentId:string|null,description:string}[]; }
export async function readIngredients() { const rows=await database().prepare('SELECT data FROM ingredients ORDER BY name').all<{data:string}>(); return rows.results.map(r=>{const ingredient=JSON.parse(r.data);return {...ingredient,encyclopedia:encyclopediaReference(ingredient)};}); }
export function parseSearch(url:URL) {
 let filters; try { filters=cleanFilters(JSON.parse(url.searchParams.get('filters')||'[]')); } catch { throw new Error('篩選條件格式不正確，請清除後重試'); }
 return {q:(url.searchParams.get('q')||'').slice(0,200),productCategory:(url.searchParams.get('productCategory')||'').slice(0,150),scope:['all','ingredients','parsed'].includes(url.searchParams.get('scope')||'')?url.searchParams.get('scope')!:'parsed',page:Math.max(1,Math.min(3000,parseInt(url.searchParams.get('page')||'1',10)||1)),filters};
}
export async function searchProducts(url:URL) {
 const initialMetadata=await readMetadata();
 const db=database(), categories=await readCategories(), input=parseSearch(url), where=buildWhere(input,categories);
 const ingredients=await readIngredients();
 const ids=new Set(ingredients.map(i=>i.id));
 for(const f of input.filters) if(f.type==='ingredient'?!ids.has(f.id):!categories.some(c=>c.id===f.id)) throw new Error('找不到此原料或分類，請重新選擇');
 const pageSize=24;
 const relation="pi.relation IN ('contains','declared_contains')";
 const [totalRow,rows,ingredientRows,categoryRows] = await db.batch([
   db.prepare(`SELECT COUNT(*) AS n FROM products p WHERE ${where.sql}`).bind(...where.params),
   db.prepare(`SELECT p.data FROM products p WHERE ${where.sql} ORDER BY CASE p.ingredient_status WHEN 'parsed' THEN 0 WHEN 'needs_review' THEN 1 ELSE 2 END,p.name,p.id LIMIT ? OFFSET ?`).bind(...where.params,pageSize,(input.page-1)*pageSize),
   db.prepare(`SELECT pi.ingredient_id AS id,COUNT(DISTINCT p.id) AS n FROM products p JOIN product_ingredients pi ON pi.product_id=p.id WHERE ${where.sql} AND ${relation} GROUP BY pi.ingredient_id`).bind(...where.params),
   db.prepare(`WITH RECURSIVE closure(id,ancestor) AS (SELECT id,id FROM categories UNION ALL SELECT closure.id,c.parent_id FROM closure JOIN categories c ON c.id=closure.ancestor WHERE c.parent_id IS NOT NULL), matched AS (SELECT p.id FROM products p WHERE ${where.sql}), evidence AS (SELECT pi.product_id,ic.category_id FROM product_ingredients pi JOIN ingredient_categories ic ON ic.ingredient_id=pi.ingredient_id WHERE ${relation} UNION SELECT product_id,category_id FROM product_categories) SELECT cl.ancestor AS id,COUNT(DISTINCT m.id) AS n FROM matched m JOIN evidence e ON e.product_id=m.id JOIN closure cl ON cl.id=e.category_id GROUP BY cl.ancestor`).bind(...where.params),
 ]);
 const metadata=await readMetadata();
 if(initialMetadata?.classification?.version!==metadata?.classification?.version)throw new Error('分類資料更新中，請稍後重新整理');
 return {products:rows.results.map((r:any)=>refreshProductClassification(JSON.parse(r.data),ingredients)),total:Number((totalRow.results[0] as any)?.n??0),page:input.page,pageSize,eligibleTotal:input.scope==='parsed'?(metadata?.parsedProducts??0):(metadata?.ingredientTextProducts??0),facets:{ingredients:Object.fromEntries(ingredientRows.results.map((r:any)=>[r.id,Number(r.n)])),categories:Object.fromEntries(categoryRows.results.map((r:any)=>[r.id,Number(r.n)]))},conservativeExclusion:input.filters.some((f:any)=>f.mode==='exclude'),classificationCaution:input.filters.some((f:any)=>f.type==='category'&&f.mode==='exclude'&&f.id!=='unclassified')};
}
export function refreshProductClassification(product:{ingredientIds:string[];[key:string]:unknown},ingredients:{id:string,categoryIds:string[]}[]) {
 const pending=ingredients.filter(i=>product.ingredientIds.includes(i.id)&&i.categoryIds.includes('unclassified')).map(i=>i.id);
 return {...product,unclassifiedIngredientIds:pending,classificationCoverage:!product.ingredientIds.length?'unknown':pending.length?'partial':'complete'};
}
export function errorResponse(error:unknown,status=500) { if(error instanceof Error&&error.message==='分類資料更新中，請稍後重新整理')return Response.json({error:error.message},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'10'}}); console.error('Catalog operation failed:',error instanceof Error ? error.message : 'unknown');return Response.json({error:status===400?(error instanceof Error?error.message:'查詢格式錯誤'):'資料目前無法載入，請稍後重試。'},{status,headers:{'Cache-Control':'no-store'}}); }
