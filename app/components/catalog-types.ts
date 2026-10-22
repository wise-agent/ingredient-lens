export type Category = { id: string; name: string; parentId?: string | null; description?: string; memberCount: number };
export type ClassificationResearch = { status: 'classify' | 'pending'; reason: string; sources: {title:string;url:string}[]; categoryNames: string[]; referenceGroups?: {id:string;name:string}[]; matchKind?: string };
export type Ingredient = { id: string; name: string; aliases: string[]; categoryIds: string[]; productCount?: number; kind?: string; encyclopedia?: {entryIds:string[];categoryCode?:string}; reviewedReferenceEntryIds?: string[]; classificationResearch?: ClassificationResearch; classificationEvidence: unknown; warningOnly: boolean; classificationVersion: string };
export type Photo = { kind: string; url: string; httpsUrl?: string | null; status?: string };
export type Product = {
  id: string; name: string; company?: string; spec?: string; productCategory?: string; traceCode?: string;
  ingredientText?: string; warningText?: string; ingredientStatus: 'parsed' | 'needs_review' | 'missing';
  ingredientIds: string[]; precautionIngredientIds?: string[]; declaredContainsIngredientIds?: string[]; classificationCoverage?: 'partial' | 'complete' | 'unknown'; unclassifiedIngredientIds?: string[]; photos: Photo[]; parseNotes?: string[] | string;
  sourceUrl?: string; sourceDate?: string; updatedAt?: string;
};
export type Metadata = {
  totalProducts: number; ingredientTextProducts: number; ingredientImageOnlyProducts?: number;
  noIngredientEvidenceProducts?: number; parsedProducts?: number; needsReviewProducts?: number; photoUrlProducts?: number;
  partialImport?: boolean; isPartial?: boolean; sourceName?: string; sourceUrl?: string; retrievedAt?: string; dataUpdatedAt?: string; coverageNote?: string;
  classification?: { researchedIngredients?: number; researchClassifiedIngredients?: number; researchPendingIngredients?: number; version: string; encyclopediaMatchedIngredients: number; newlyClassifiedByEncyclopedia: number; ordinaryClassifiedIngredients: number; pendingIngredients: number; warningOnlyIngredients: number };
};
export type Catalog = { metadata: Metadata; categories: Category[]; ingredients: Ingredient[]; productCategories: string[] };
export type ProductResults = {
  products: Product[]; total: number; page: number; pageSize: number; eligibleTotal: number;
  conservativeExclusion?: boolean; classificationCaution?: boolean;
  facets: { ingredients: Record<string, number>; categories: Record<string, number> };
};
export type ProductDetail = { product: Product; ingredients?: Ingredient[]; categories?: Category[]; metadata?: Metadata };
