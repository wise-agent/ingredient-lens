'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers3, Minus, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Catalog, Category, ProductResults } from './catalog-types';
import { rankSuggestions, type Filter, type Suggestion } from './filter-utils';
import { formatNumber } from './product-display';

type Props = { catalog: Catalog | null; results: ProductResults | null; filters: Filter[]; setFilter: (filter: Filter) => void; removeFilter: (filter: Filter) => void; clearFilters: () => void; loading: boolean };

export function FilterChips({ filters, onRemove }: { filters: Filter[]; onRemove: (filter: Filter) => void }) {
  return <div className="filter-chips">{filters.map(filter => <button className={`filter-chip ${filter.mode}`} key={`${filter.type}:${filter.id}`} onClick={() => onRemove(filter)} aria-label={`移除${filter.mode === 'include' ? '包含' : '排除'}${filter.name}條件`}>{filter.mode === 'include' ? <Plus size={12} /> : <Minus size={12} />}<span>{filter.name}</span><X size={12} /></button>)}</div>;
}

export function FilterPanel({ catalog, results, filters, setFilter, removeFilter, clearFilters, loading }: Props) {
  const [query, setQuery] = useState('');
  const [browse, setBrowse] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const inputId = useId();
  const suggestionId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectableCategories = useMemo(() => catalog?.categories.filter(category => category.id !== 'warning_only') || [], [catalog]);
  const coverage = catalog?.metadata.classification;
  const suggestions = useMemo(() => {
    if (!catalog) return [];
    const ingredients: Suggestion[] = catalog.ingredients.filter(item => item.kind !== 'function_label').map(item => ({ type: 'ingredient', id: item.id, name: item.name, aliases: item.aliases || [], count: results?.facets.ingredients[item.id] ?? (results ? 0 : item.productCount || 0) }));
    const categories: Suggestion[] = selectableCategories.map(item => ({ type: 'category', id: item.id, name: item.name, aliases: [], count: results?.facets.categories[item.id] || 0 }));
    if (query.trim()) return rankSuggestions([...categories, ...ingredients], query, 12).sort((a, b) => a.type === b.type ? 0 : a.type === 'category' ? -1 : 1);
    return [...rankSuggestions(categories.filter(item => item.count > 0), '', 3), ...rankSuggestions(ingredients.filter(item => item.count > 0), '', 7)];
  }, [catalog, results, query, selectableCategories]);
  const selectedMode = (item: Suggestion | Category, type?: Filter['type']) => filters.find(filter => filter.type === (type || ('type' in item ? item.type : 'category')) && filter.id === item.id)?.mode;
  const roots = selectableCategories.filter(category => !category.parentId);
  const quickCategories = roots.length ? roots.slice(0, 6) : selectableCategories.slice(0, 6);
  const members = (categoryId: string) => {
    const ids = new Set([categoryId]);
    let changed = true;
    while (changed) { changed = false; for (const category of catalog?.categories || []) { if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) { ids.add(category.id); changed = true; } } }
    return catalog?.ingredients.filter(ingredient => ingredient.kind !== 'function_label' && !ingredient.warningOnly && ingredient.categoryIds.some(id => ids.has(id))) || [];
  };
  const categoryDetails = (category: Category) => <div className="category-members"><p>{category.description || '此分類包含下列成分；分類成員僅供檢視。'}</p><div>{members(category.id).map(member => <span key={member.id}>{member.name}</span>)}</div>{members(category.id).length === 0 && <p>此分類目前沒有已收錄成分。</p>}</div>;
  const toggleCategory = (id: string) => setExpanded(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  return <div className="filter-panel">
    <div className="panel-heading"><h2><SlidersHorizontal size={18} />成分篩選</h2>{filters.length > 0 && <button className="text-button" onClick={clearFilters}>清除全部</button>}</div>
    <p className="panel-description">想找什麼、避開什麼，交給成分決定。</p>
    {coverage && <p className="panel-description" aria-label="成分分類覆蓋">百科對應 {formatNumber(coverage.encyclopediaMatchedIngredients)}（其中新增分類 {formatNumber(coverage.newlyClassifiedByEncyclopedia)}）<br />食材與來源材料 {formatNumber(coverage.ordinaryClassifiedIngredients)} · 待確認 {formatNumber(coverage.pendingIngredients)}<br />僅警語／過敏原聲明 {formatNumber(coverage.warningOnlyIngredients)}<br />以上為標示名稱數，不是獨立化學物質的計數；分類可重疊。</p>}
    {!!coverage?.researchedIngredients && <p className="panel-description" aria-label="本輪分類核對">本輪核對 {formatNumber(coverage.researchedIngredients)} · 新增分類 {formatNumber(coverage.researchClassifiedIngredients || 0)} · 仍待確認 {formatNumber(coverage.researchPendingIngredients || 0)}<br />商品詳情的 ⓘ 可查看分類來源與待確認原因。</p>}
    {filters.length > 0 && <div className="panel-selected"><FilterChips filters={filters} onRemove={removeFilter} /></div>}
    <label className="field-label" htmlFor={inputId}>搜尋成分或分類</label>
    <div className="ingredient-search"><Search size={17} /><input id={inputId} placeholder="例如：乳、糖、麵粉" value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(-1); }} role="combobox" aria-haspopup="grid" aria-expanded={suggestions.length > 0} aria-controls={suggestionId} aria-autocomplete="list" aria-activedescendant={activeIndex >= 0 && suggestions[activeIndex] ? `${suggestionId}-${activeIndex}` : undefined} onKeyDown={event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(current => Math.min(current + 1, suggestions.length - 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(current => Math.max(current - 1, 0)); }
      if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) { event.preventDefault(); document.getElementById(`${suggestionId}-${activeIndex}`)?.querySelector<HTMLButtonElement>('button.include-action')?.focus(); }
      if (event.key === 'Escape') { setQuery(''); setActiveIndex(-1); }
    }} />{query && <button onClick={() => setQuery('')} aria-label="清除成分搜尋"><X size={15} /></button>}</div>
    <div className="suggestion-heading"><span>{query ? '搜尋結果' : '目前結果中的常見項目'}</span><span title="目前搜尋結果中含有該成分或分類的商品數">商品數</span></div>
    <div className="suggestions" id={suggestionId} role="grid" aria-label="成分與分類建議" aria-busy={loading}>
      {!catalog ? <div className="suggestions-loading">正在載入成分索引…</div> : !suggestions.length ? <div className="suggestions-empty">{query ? '找不到相符的成分或分類。試試其他名稱或別名。' : '目前沒有可建議的成分，請調整搜尋條件。'}</div> : suggestions.map((item, index) => {
        const category = item.type === 'category' ? catalog.categories.find(value => value.id === item.id) : undefined;
        const warningOnly = item.type === 'ingredient' && catalog.ingredients.find(value => value.id === item.id)?.warningOnly;
        const selected = selectedMode(item);
        const previousType = suggestions[index - 1]?.type;
        return <div className="suggestion-wrapper" key={`${item.type}:${item.id}`}>
          {previousType !== item.type && <div className="suggestion-group">{item.type === 'category' ? '成分類別' : '個別成分'}</div>}
          <div className={`suggestion-row ${activeIndex === index ? 'keyboard-active' : ''}`} id={`${suggestionId}-${index}`} role="row" aria-selected={activeIndex === index}>
            <div className="suggestion-name" role="gridcell"><span>{item.name}</span>{warningOnly && <small title="未出現在原料清單；可能來自明確含有聲明或預防性警語">僅警語／過敏原聲明</small>}{category && <button className="member-toggle" onClick={() => toggleCategory(category.id)} aria-expanded={expanded.includes(category.id)} aria-label={`查看${category.name}分類成員`} title="原料標示名稱數，不含僅警語／過敏原聲明">{members(category.id).length} 項<ChevronDown size={11} /></button>}</div>
            <span className="suggestion-count" role="gridcell">{loading ? '·' : formatNumber(item.count)}</span>
            <div className="polarity-buttons" role="gridcell"><button className={`include-action ${selected === 'include' ? 'selected' : ''}`} onClick={() => setFilter({ type: item.type, id: item.id, name: item.name, mode: 'include' })} aria-label={`包含${item.name}`} aria-pressed={selected === 'include'}><Plus size={11} />包含</button><button className={`exclude-action ${selected === 'exclude' ? 'selected' : ''}`} onClick={() => setFilter({ type: item.type, id: item.id, name: item.name, mode: 'exclude' })} aria-label={`排除${item.name}`} aria-pressed={selected === 'exclude'}><Minus size={11} />排除</button></div>
          </div>{category && expanded.includes(category.id) && categoryDetails(category)}
        </div>;
      })}
    </div>
    <div className="quick-categories"><div className="field-label">快速包含分類</div><div className="quick-category-list">{quickCategories.map(category => <button key={category.id} className={selectedMode(category, 'category') === 'include' ? 'selected' : ''} onClick={() => setFilter({ type: 'category', id: category.id, name: category.name, mode: 'include' })}><Plus size={12} />{category.name}</button>)}</div></div>
    <button className="browse-categories" onClick={() => setBrowse(!browse)} aria-expanded={browse}><span><Layers3 size={15} />瀏覽所有成分類別</span>{browse ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
    {browse && <div className="category-browser">{selectableCategories.map(category => <div key={category.id} className={category.parentId ? 'child-category' : ''}><button className="category-browser-heading" onClick={() => toggleCategory(category.id)} aria-expanded={expanded.includes(category.id)}><span>{category.name}</span><span title="原料標示名稱數，不含僅警語／過敏原聲明">{members(category.id).length}<ChevronDown size={12} /></span></button>{expanded.includes(category.id) && <>{categoryDetails(category)}<div className="category-browser-actions"><button className="include-action" onClick={() => setFilter({ type: 'category', id: category.id, name: category.name, mode: 'include' })}><Plus size={12} />包含此類</button><button className="exclude-action" onClick={() => setFilter({ type: 'category', id: category.id, name: category.name, mode: 'exclude' })}><Minus size={12} />排除此類</button></div></>}</div>)}</div>}
    <div className="filter-explanation"><span className="tiny-leaf"><Layers3 size={16} /></span><div><strong>篩選怎麼運作？</strong><p>商品須同時符合所有「包含」條件；命中任何「排除」條件即移除。分類會涵蓋其子分類成分。</p><p>添加物分類是「百科參考用途」，不代表業者實際用途，也不作為合法使用的證明。排除後僅表示依現有標示未辨識出所選添加物，不是無添加認證。一般食材分類不代表無添加物；待確認項目保留原始標示名稱，不能當作已證實不含。</p><p>「包含」比對原料與明確含有聲明；預防性警語僅用於保守排除。僅警語／過敏原聲明的名稱不計入原料分類成員數。</p></div></div>
  </div>;
}
