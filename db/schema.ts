import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const products = sqliteTable('products', {
  id: text('id').primaryKey(), name: text('name').notNull(), company: text('company').notNull(),
  spec: text('spec').notNull(), productCategory: text('product_category').notNull(), traceCode: text('trace_code').notNull(),
  ingredientText: text('ingredient_text').notNull(), warningText: text('warning_text').notNull(),
  ingredientStatus: text('ingredient_status').notNull(), hasIngredientImage: integer('has_ingredient_image').notNull(),
  searchText: text('search_text').notNull(), data: text('data').notNull(),
}, t => [index('products_status_idx').on(t.ingredientStatus), index('products_category_idx').on(t.productCategory)]);
export const ingredients = sqliteTable('ingredients', { id:text('id').primaryKey(), name:text('name').notNull(), data:text('data').notNull() });
export const categories = sqliteTable('categories', { id:text('id').primaryKey(), name:text('name').notNull(), parentId:text('parent_id'), description:text('description').notNull() });
export const ingredientCategories = sqliteTable('ingredient_categories', { ingredientId:text('ingredient_id').notNull().references(()=>ingredients.id), categoryId:text('category_id').notNull().references(()=>categories.id) }, t=>[primaryKey({columns:[t.ingredientId,t.categoryId]}),index('ingredient_category_category_idx').on(t.categoryId)]);
export const productIngredients = sqliteTable('product_ingredients', { productId:text('product_id').notNull().references(()=>products.id), ingredientId:text('ingredient_id').notNull().references(()=>ingredients.id), relation:text('relation').notNull() }, t=>[primaryKey({columns:[t.productId,t.ingredientId,t.relation]}),index('product_ingredient_ingredient_idx').on(t.ingredientId),index('product_ingredient_product_idx').on(t.productId)]);
export const datasetMetadata = sqliteTable('dataset_metadata', { key:text('key').primaryKey(), value:text('value').notNull() });
export const importBatches = sqliteTable('import_batches', { id:integer('id').primaryKey(), completedAt:text('completed_at').notNull() });
// Product-local explicit label roles: never promote these to global ingredient rules.
export const productCategories = sqliteTable('product_categories', { productId:text('product_id').notNull().references(()=>products.id), categoryId:text('category_id').notNull().references(()=>categories.id), evidence:text('evidence').notNull() }, t=>[primaryKey({columns:[t.productId,t.categoryId]}),index('product_category_category_idx').on(t.categoryId)]);
