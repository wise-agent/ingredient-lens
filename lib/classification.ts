import classification from '@/data/classification.json';
import {database} from './catalog';
const batchSize=50;
const batchCount=1+Math.ceil(classification.ingredients.length/batchSize);
const key='classification:'+classification.version+':';
export async function classificationStatus(){
 const db=database();
 const metadata=await db.prepare("SELECT value FROM dataset_metadata WHERE key='metadata'").first<{value:string}>();
 if(!metadata||JSON.parse(metadata.value).datasetVersion!==classification.sourceDatasetVersion)throw new Error('Source dataset version mismatch');
 const count=await db.prepare('SELECT COUNT(*) AS n FROM ingredients').first<{n:number}>();
 if(count?.n!==classification.ingredients.length)throw new Error('Ingredient count mismatch');
 const rows=await db.prepare('SELECT key FROM dataset_metadata WHERE substr(key,1,?)=?').bind(key.length,key).all<{key:string}>();
 const complete=await db.prepare("SELECT value FROM dataset_metadata WHERE key='classification_version'").first<{value:string}>();
 return {version:classification.version,completed:rows.results.map(r=>Number(r.key.slice(key.length))).sort((a,b)=>a-b),total:batchCount,ready:complete?.value===classification.version,summary:classification.summary};
}
export async function applyClassificationBatch(index:number){
 if(!Number.isInteger(index)||index<0||index>=batchCount)throw new Error('Unknown classification batch');
 const status=await classificationStatus();if(status.completed.includes(index))return{index,alreadyApplied:true};
 if(index>0&&!status.completed.includes(0))throw new Error('Categories must be applied first');
 const db=database();const statements:D1PreparedStatement[]=[];
 if(index===0){
  const names=await db.prepare('SELECT id,name FROM ingredients').all<{id:string,name:string}>();
  const storedNames=new Map(names.results.map(i=>[i.id,i.name]));
  for(const i of classification.ingredients)if(storedNames.get(i.id)!==i.name)throw new Error('Ingredient identity mismatch');
  statements.push(db.prepare("INSERT INTO dataset_metadata (key,value) VALUES ('classification_pending',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(classification.version));
  for(const c of classification.categories)statements.push(db.prepare('INSERT INTO categories(id,name,parent_id,description) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,description=excluded.description').bind(c.id,c.name,c.parentId||null,c.description));
 }else{
  for(const i of classification.ingredients.slice((index-1)*batchSize,index*batchSize)){
   statements.push(db.prepare('UPDATE ingredients SET data=? WHERE id=? AND name=?').bind(JSON.stringify(i),i.id,i.name));
   statements.push(db.prepare('DELETE FROM ingredient_categories WHERE ingredient_id=?').bind(i.id));
   for(const cid of i.categoryIds)statements.push(db.prepare('INSERT INTO ingredient_categories(ingredient_id,category_id) VALUES (?,?)').bind(i.id,cid));
  }
 }
 statements.push(db.prepare('INSERT INTO dataset_metadata (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key+index,new Date().toISOString()));
 await db.batch(statements);return{index,applied:true};
}
export async function finishClassification(){
 const status=await classificationStatus();if(status.completed.length!==batchCount)throw new Error('Classification batches incomplete');
 const db=database();
 const rows=await db.prepare('SELECT id,data FROM ingredients').all<{id:string,data:string}>();
 const links=await db.prepare('SELECT ingredient_id,category_id FROM ingredient_categories').all<{ingredient_id:string,category_id:string}>();
 const actual=new Map(rows.results.map(r=>[r.id,JSON.parse(r.data)]));
 const actualLinks=new Set(links.results.map(r=>r.ingredient_id+':'+r.category_id));
 let expectedLinks=0;
 for(const i of classification.ingredients){if(JSON.stringify(actual.get(i.id))!==JSON.stringify(i))throw new Error('Persisted ingredient differs');for(const cid of i.categoryIds){expectedLinks++;if(!actualLinks.has(i.id+':'+cid))throw new Error('Category relationship missing');}}
 if(actualLinks.size!==expectedLinks)throw new Error('Category relationship count mismatch');
 const storedCategories=await db.prepare('SELECT id,name,parent_id AS parentId,description FROM categories').all<{id:string,name:string,parentId:string|null,description:string}>();
 const catMap=new Map(storedCategories.results.map(c=>[c.id,c]));
 for(const c of classification.categories){const stored=catMap.get(c.id);if(!stored||stored.name!==c.name||stored.parentId!==(c.parentId||null)||stored.description!==c.description)throw new Error('Category definition mismatch');}
 if(catMap.size!==classification.categories.length)throw new Error('Category count mismatch');
 const row=await db.prepare("SELECT value FROM dataset_metadata WHERE key='metadata'").first<{value:string}>();
 const metadata=JSON.parse(row!.value);metadata.databaseCounts={...metadata.databaseCounts,categories:classification.categories.length,ingredient_categories:expectedLinks};metadata.classification={version:classification.version,...classification.summary,sourceDatasetVersion:classification.sourceDatasetVersion,dictionarySha256:classification.dictionarySha256,researchSha256:classification.researchSha256,researchPendingReasons:classification.researchPendingReasons,notes:classification.notes};
 await db.batch([
  db.prepare("UPDATE dataset_metadata SET value=? WHERE key='metadata'").bind(JSON.stringify(metadata)),
  db.prepare("INSERT INTO dataset_metadata(key,value) VALUES ('classification_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(classification.version),
  db.prepare("DELETE FROM dataset_metadata WHERE key='classification_pending'")
 ]);
 return{ready:true,...metadata.classification};
}
