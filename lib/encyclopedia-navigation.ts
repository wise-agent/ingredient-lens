import type { AdditiveDictionary } from './additive-lookup';
export type EncyclopediaReference = { entryIds: string[]; categoryCode?: string };
type ReferenceIngredient = { name: string; aliases?: string[]; kind?: string; reviewedReferenceEntryIds?: string[]; encyclopedia?: EncyclopediaReference };
/** Always a same-site native URL. Unknown or ambiguous names remain search, never a claimed identity. */
export function ingredientEncyclopediaHref(ingredient: ReferenceIngredient): string {
  const reference = ingredient.encyclopedia;
  if (reference?.entryIds.length === 1) return `/additives?entry=${encodeURIComponent(reference.entryIds[0])}#additive-index`;
  if (reference?.entryIds.length === 0 && reference.categoryCode) return `/additives?category=${encodeURIComponent(reference.categoryCode)}#additive-index`;
  const name = ingredient.name.trim();
  return name ? `/additives?q=${encodeURIComponent(name)}#additive-index` : '/additives#additive-index';
}
/** Same exact NFKC/name matching as matchAdditives, indexed once to keep catalog requests small and fast. */
export function createIngredientEncyclopediaIndex(dictionary: AdditiveDictionary) {
  const normalize = (value: string) => String(value || '').normalize('NFKC').toLocaleLowerCase('en').trim().replace(/\s+/g,' ');
  const names = new Map<string, string[]>();
  const order = new Map<string, number>();
  dictionary.additives.forEach((entry, index) => {
    order.set(entry.id, index);
    for (const value of [entry.nameZh, entry.nameEn, ...entry.aliases]) {
      const name = normalize(value); if (!name) continue;
      const ids = names.get(name) || [];
      if (!ids.includes(entry.id)) ids.push(entry.id);
      names.set(name, ids);
    }
  });
  const categories = new Map(dictionary.categories.map(category => [normalize(category.nameZh), category.code]));
  return (ingredient: ReferenceIngredient): EncyclopediaReference => {
    const ids = new Set<string>();
    if (ingredient.kind !== 'function_label') for (const id of ingredient.reviewedReferenceEntryIds || []) if (order.has(id)) ids.add(id);
    if (ingredient.kind !== 'function_label') for (const name of [ingredient.name, ...(ingredient.aliases || [])]) {
      for (const id of names.get(normalize(name)) || []) ids.add(id);
    }
    const entryIds = [...ids].sort((a,b) => order.get(a)! - order.get(b)!);
    const categoryCode = categories.get(normalize(ingredient.name));
    return categoryCode ? { entryIds, categoryCode } : { entryIds };
  };
}
