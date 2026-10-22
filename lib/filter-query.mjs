export function normalize(value) { return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('zh-TW'); }
export function cleanFilters(input) {
  if (!Array.isArray(input) || input.length > 40) throw new Error('篩選條件最多 40 項');
  const map = new Map();
  for (const item of input) {
    if (!item || !['ingredient','category'].includes(item.type) || !['include','exclude'].includes(item.mode) || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)) throw new Error('篩選格式不正確');
    map.set(`${item.type}:${item.id}`, {type:item.type,id:item.id,mode:item.mode,name:String(item.name??'').slice(0,120)});
  }
  return [...map.values()];
}
export function descendants(id, categories) {
  const ids = new Set([id]);
  for (let i=0;i<categories.length;i++) for (const category of categories) if (ids.has(category.parentId)) ids.add(category.id);
  return [...ids];
}
/** @param {{q?:string,productCategory?:string,scope?:string,filters?:Array<{type:string,id:string,mode:string}>}} input */
export function buildWhere({q='',productCategory='',scope='parsed',filters=[]}, categories) {
  const clauses = [], params = [];
  if(scope === 'parsed') clauses.push("p.ingredient_status = 'parsed'");
  else if(scope !== 'all') clauses.push("p.ingredient_text <> ''");
  if(q.trim()) { clauses.push('p.search_text LIKE ? ESCAPE \'\\\''); params.push('%'+normalize(q).replace(/[\\%_]/g, '\\$&')+'%'); }
  if(productCategory) { clauses.push('p.product_category = ?'); params.push(productCategory); }
  if(filters.some(f=>f.mode==='exclude')) clauses.push("p.ingredient_status = 'parsed'");
  for(const filter of filters) {
    const positive = filter.mode==='include';
    const relation = positive ? "pi.relation IN ('contains','declared_contains')" : "pi.relation IN ('contains','declared_contains','precaution')";
    let match;
    if(filter.type==='ingredient') {
      match=`SELECT 1 FROM product_ingredients pi WHERE pi.product_id=p.id AND ${relation} AND pi.ingredient_id=?`;
      params.push(filter.id);
    } else {
      const ids = descendants(filter.id,categories);
      match=`SELECT 1 FROM product_ingredients pi JOIN ingredient_categories ic ON ic.ingredient_id=pi.ingredient_id WHERE pi.product_id=p.id AND ${relation} AND ic.category_id IN (SELECT value FROM json_each(?))`;
      params.push(JSON.stringify(ids));
      const local=`SELECT 1 FROM product_categories pc WHERE pc.product_id=p.id AND pc.category_id IN (SELECT value FROM json_each(?))`;
      params.push(JSON.stringify(ids));
      clauses.push(`${positive?'':'NOT '}(EXISTS (${match}) OR EXISTS (${local}))`);
      continue;
    }
    clauses.push(`${positive?'':'NOT '}EXISTS (${match})`);
  }
  return {sql:clauses.length ? clauses.join(' AND ') : '1=1',params};
}
