import { ArrowUpRight } from 'lucide-react';
import { ingredientEncyclopediaHref } from '@/lib/encyclopedia-navigation';
import type { Ingredient } from './catalog-types';

/** Preserve the product label; only exact references are described as entries. */
export function IngredientEncyclopediaLink({ ingredient, className = '' }: { ingredient: Ingredient; className?: string }) {
  const href = ingredientEncyclopediaHref(ingredient);
  const search = href.startsWith('/additives?q=');
  return <a href={href} className={`ingredient-encyclopedia-link ${className}`.trim()} aria-label={search ? `在百科搜尋「${ingredient.name}」（尚未唯一對應詞條）` : `在百科查看「${ingredient.name}」`}>
    <span className="ingredient-label">{ingredient.name}</span>
    {search ? <small className="ingredient-link-action">搜尋百科</small> : <ArrowUpRight size={12} />}
  </a>;
}
