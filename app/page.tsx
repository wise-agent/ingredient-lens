'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronLeft, ChevronRight, Database, ExternalLink, Info, Leaf, LoaderCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { FilterChips, FilterPanel } from './components/filter-panel';
import { Modal } from './components/modal';
import { SiteHeader } from './components/site-navigation';
import { IngredientEncyclopediaLink } from './components/ingredient-encyclopedia-link';
import { ProductIngredientInfo } from './components/additive-info';
import { formatDate, formatNumber, hasIngredientPhoto, photoKindLabel, ProductCard, ProductPhoto, statusLabel } from './components/product-display';
import { safeHttpsUrl, setTermFilter, type Filter } from './components/filter-utils';
import type { Catalog, Metadata, Product, ProductDetail, ProductResults } from './components/catalog-types';

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`資料暫時無法讀取（${response.status}）`);
  return response.json();
}

function SourceFacts({ metadata }: { metadata?: Metadata }) {
  return <dl className="source-facts"><div><dt>資料來源</dt><dd>{metadata?.sourceName || '公開食品登錄資料'}</dd></div><div><dt>本次擷取日期</dt><dd>{formatDate(metadata?.retrievedAt)}</dd></div><div><dt>來源更新日期</dt><dd>{formatDate(metadata?.dataUpdatedAt)}</dd></div><div><dt>收錄範圍</dt><dd>{metadata?.partialImport ? '部分資料匯入' : metadata ? '依本次匯入資料' : '等待資料載入'}</dd></div></dl>;
}

function ProductDetailModal({ initial, catalog, onClose }: { initial: Product; catalog: Catalog | null; onClose: () => void }) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/products/${encodeURIComponent(initial.id)}`, { signal: controller.signal }).then(readResponse<ProductDetail>).then(value => setDetail(value)).catch(reason => { if (reason.name !== 'AbortError') setError('商品詳細資料暫時無法載入。以下顯示已取得的商品資訊。'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [initial.id, retry]);
  const product = detail?.product || initial;
  const metadata = detail?.metadata || catalog?.metadata;
  const detailIngredients = detail?.ingredients || catalog?.ingredients || [];
  const ingredients = detailIngredients.filter(item => product.ingredientIds?.includes(item.id));
  const declaredContains = detailIngredients.filter(item => product.declaredContainsIngredientIds?.includes(item.id));
  const precautionNames = detailIngredients.filter(item => product.precautionIngredientIds?.includes(item.id));
  const sourceUrl = safeHttpsUrl(product.sourceUrl) || safeHttpsUrl(metadata?.sourceUrl);
  const photos = product.photos || [];
  const parseNotes = Array.isArray(product.parseNotes) ? product.parseNotes.join('；') : product.parseNotes;
  return <Modal title="商品資料" onClose={onClose} className="product-modal">
    <div className="detail-content">
      <div className="detail-overview"><ProductPhoto photos={photos} name={product.name} label /><div><div className="detail-eyebrow">{product.productCategory || '未分類食品'}</div><h2>{product.name}</h2><p>{product.company || '來源未提供業者名稱'}</p><span className="detail-status"><span />{statusLabel(product)}</span><dl className="detail-mini-facts"><div><dt>商品規格</dt><dd>{product.spec || '未提供'}</dd></div><div><dt>追溯／登錄編號</dt><dd>{product.traceCode || '未提供'}</dd></div></dl></div></div>
      {loading && <div className="inline-loading"><LoaderCircle className="spin" size={14} />正在讀取完整資料…</div>}
      {error && <div className="inline-error">{error}<button onClick={() => { setLoading(true); setError(''); setRetry(value => value + 1); }}>重試</button></div>}
      <section className="detail-section"><div className="section-label"><BookOpen size={17} /><h3>原始成分標示</h3><span>完整原文</span></div>{product.ingredientText?.trim() ? <p className="ingredient-original">{product.ingredientText}</p> : <div className="missing-ingredients"><Info size={18} /><div><strong>{hasIngredientPhoto(product) ? '有原料標籤圖片，成分文字待辨識' : '此筆資料未提供成分文字'}</strong><p>{hasIngredientPhoto(product) ? '這項商品尚未納入文字成分篩選。請直接查看下方原料標籤圖片。' : '目前無法依成分判斷這項商品。請以實際包裝或業者資訊確認。'}</p></div></div>}
        {ingredients.length > 0 && <ProductIngredientInfo ingredients={ingredients} />}
        {declaredContains.length > 0 && <div className="parsed-ingredients"><div className="small-label">標示聲明含有（與原料清單分開）</div><div>{declaredContains.map(item => <IngredientEncyclopediaLink key={item.id} ingredient={item} />)}</div></div>}
        {product.unclassifiedIngredientIds && product.unclassifiedIngredientIds.length > 0 && <p className="parse-note"><Info size={14} />目前有 {product.unclassifiedIngredientIds.length} 個原料標示名稱尚待分類確認；不是獨立化學物質的計數。分類未命中不等於不含。</p>}
        {parseNotes && <p className="parse-note"><Info size={14} />{parseNotes}</p>}
      </section>
      <section className="precaution-note"><AlertTriangle size={19} /><div><h3>警語與交叉接觸資訊</h3><p>{product.warningText || '此筆來源未提供獨立的預防性警語。未列出警語，不代表沒有交叉接觸或其他風險。'}</p>{precautionNames.length > 0 && <div className="precaution-tags">{precautionNames.map(item => <IngredientEncyclopediaLink key={item.id} ingredient={item} />)}</div>}<small>預防性警語不作為「包含」條件的成分；使用「排除」時，相關警語會保守移除。</small></div></section>
      {photos.length > 0 && <details className="source-images" open={!product.ingredientText?.trim()}><summary>查看來源圖片 <span>{photos.length} 張</span><ChevronRight size={16} /></summary><div className="source-image-grid">{photos.map((photo, index) => <div key={`${photo.url}-${index}`}><ProductPhoto photos={[photo]} name={product.name} label /><span>{photoKindLabel(photo.kind)}</span>{(safeHttpsUrl(photo.httpsUrl) || safeHttpsUrl(photo.url)) && <a className="photo-source-link" href={safeHttpsUrl(photo.httpsUrl) || safeHttpsUrl(photo.url) || undefined} target="_blank" rel="noopener noreferrer">開啟來源圖片<ExternalLink size={11} /></a>}</div>)}</div><p className="image-link-note">圖片由原始來源提供，來源連結可能失效。</p></details>}
      <section className="detail-section detail-source"><div className="section-label"><Database size={17} /><h3>資料來源與日期</h3></div><SourceFacts metadata={metadata} />{sourceUrl && <a className="external-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">前往原始資料來源<ExternalLink size={14} /></a>}</section>
      <div className="detail-disclaimer">本工具僅協助查找公開資料，解析結果可能不完整。過敏、特殊飲食或其他健康需求，請核對最新包裝標示並向業者確認。</div>
    </div>
  </Modal>;
}

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [results, setResults] = useState<ProductResults | null>(null);
  const [completedRequest, setCompletedRequest] = useState('');
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [query, setQuery] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [scope, setScope] = useState<'parsed' | 'ingredients' | 'all'>('parsed');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const serializedFilters = JSON.stringify(filters);
  const requestKey = JSON.stringify([query, productCategory, scope, page, serializedFilters, reload]);
  const loading = completedRequest !== requestKey;
  const error = requestError && requestError.key === requestKey ? requestError.message : '';
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catalog', { signal: controller.signal }).then(readResponse<Catalog>).then(setCatalog).catch(reason => { if (reason.name !== 'AbortError') setCatalogError('成分索引暫時無法載入。請稍後再試。'); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: query.trim(), productCategory, scope, page: String(page), filters: serializedFilters });
      fetch(`/api/products?${params}`, { signal: controller.signal }).then(readResponse<ProductResults>).then(value => { if (!controller.signal.aborted) setResults(value); }).catch(reason => { if (reason.name !== 'AbortError') setRequestError({ key: requestKey, message: '商品資料暫時無法載入，請稍後重試。' }); }).finally(() => { if (!controller.signal.aborted) setCompletedRequest(requestKey); });
    }, 240);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, productCategory, scope, page, serializedFilters, reload, requestKey]);
  const metadata = catalog?.metadata;
  const updateFilter = (filter: Filter) => { setFilters(current => setTermFilter(current, filter)); setPage(1); };
  const removeFilter = (filter: Filter) => { setFilters(current => current.filter(item => item.type !== filter.type || item.id !== filter.id)); setPage(1); };
  const clearFilters = () => { setFilters([]); setPage(1); };
  const resetSearch = () => { setFilters([]); setQuery(''); setProductCategory(''); setPage(1); };
  const filterProps = { catalog, results, filters, setFilter: updateFilter, removeFilter, clearFilters, loading };
  const pageCount = results ? Math.ceil(results.total / results.pageSize) : 0;
  const resultStart = results && results.total > 0 ? (results.page - 1) * results.pageSize + 1 : 0;
  const sourceUrl = safeHttpsUrl(metadata?.sourceUrl);
  return <>
    <SiteHeader page="home" />
    <main>
      <section className="hero page-width" aria-labelledby="hero-title"><div className="hero-copy"><div className="eyebrow"><span />READ THE LABEL. FIND YOUR FIT.</div><h1 id="hero-title">好好選擇，<br />從<span className="hero-accent">看懂成分</span>開始。</h1><p>把複雜的成分表，變成清楚的選擇。<br className="mobile-break" />包含你想要的，排除你在意的。</p><div className="hero-actions"><a className="hero-explore" href="#explore">找到適合你的食品<ArrowDown size={16} /></a><a className="hero-encyclopedia" href="/additives"><BookOpen size={16} />查添加物百科<ArrowUpRight size={15} /></a></div></div><div className="hero-aside"><div className="data-caption"><span className="data-caption-line" />以公開資料為起點</div><div className="hero-stat"><span className="stat-number">{formatNumber(metadata?.parsedProducts)}</span><span className="stat-label">筆資料可解析成分<ArrowUpRight size={16} /></span></div><div className="hero-stat-secondary"><div><strong>{formatNumber(metadata?.totalProducts)}</strong><span>已收錄商品紀錄</span></div><span className="stat-divider" /><div><strong>{catalog ? formatNumber(catalog.ingredients.filter(item => item.kind !== 'function_label').length) : '—'}</strong><span>已辨識標示名稱</span></div></div><div className="hero-data-note"><span />{metadata?.partialImport ? '目前為部分資料匯入' : '以本次匯入資料為準'}<a href="#data-notes">了解範圍<ArrowUpRight size={12} /></a></div></div><div className="hero-index" aria-hidden="true">01 / EXPLORE</div></section>
      <section id="explore" className="explore-section page-width" aria-label="探索食品與成分">
        <div className="explore-heading"><div><span className="section-kicker">THE FOOD INDEX</span><h2>你的成分，你的選擇。</h2></div><span className="explore-heading-note"><Check size={14} />保留原始標示，資訊有據可查</span></div>
        <div className="workspace"><aside className="desktop-filter" aria-label="成分篩選面板"><FilterPanel {...filterProps} /></aside><div className="results-area">
          <div className="search-toolbar"><div className="product-search"><Search size={19} /><input aria-label="搜尋商品名稱、業者、規格" placeholder="搜尋商品名稱、業者或規格" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />{query && <button className="search-clear" aria-label="清除商品搜尋" onClick={() => { setQuery(''); setPage(1); }}><X size={16} /></button>}</div><div className="category-select"><select aria-label="食品分類" value={productCategory} onChange={event => { setProductCategory(event.target.value); setPage(1); }}><option value="">所有食品類別</option>{catalog?.productCategories.map(category => <option key={category} value={category}>{category}</option>)}</select><ChevronRight size={15} /></div></div>
          <div className="results-controls"><div className="scope-tabs" role="group" aria-label="搜尋資料範圍"><button className={scope === 'parsed' ? 'active' : ''} aria-pressed={scope === 'parsed'} onClick={() => { setScope('parsed'); setPage(1); }}>可解析資料<span>{formatNumber(metadata?.parsedProducts)}</span></button><button className={scope === 'ingredients' ? 'active' : ''} aria-pressed={scope === 'ingredients'} onClick={() => { setScope('ingredients'); setPage(1); }}>全部有文字<span>{formatNumber(metadata?.ingredientTextProducts)}</span></button><button className={scope === 'all' ? 'active' : ''} aria-pressed={scope === 'all'} onClick={() => { setScope('all'); setPage(1); }}>全部資料<span>{formatNumber(metadata?.totalProducts)}</span></button></div><button className="mobile-filter-trigger" onClick={() => setMobileFilters(true)}><SlidersHorizontal size={16} />篩選{filters.length > 0 && <span>{filters.length}</span>}</button></div>
          {filters.length > 0 && <div className="applied-filters"><span>目前條件</span><FilterChips filters={filters} onRemove={removeFilter} /><button className="text-button" onClick={clearFilters}>全部清除</button></div>}
          <div className="results-summary"><div aria-live="polite" aria-atomic="true"><span className="result-count">{loading ? <span className="count-loading">更新中</span> : error ? '—' : formatNumber(results?.total)}</span><span>筆商品資料{filters.length > 0 || query || productCategory ? '符合條件' : '可供探索'}</span>{loading && <LoaderCircle className="spin" size={14} />}</div><span className="results-note">{scope === 'parsed' ? '僅顯示可解析成分的資料' : scope === 'ingredients' ? '包含解析待確認的成分文字' : '亦顯示成分資料不完整的紀錄'}</span></div>
          {scope === 'ingredients' && <div className="scope-notice"><Info size={16} /><p>有文字不代表成分完整；此範圍包含解析待確認或內容不足的紀錄。可查看原文，但不會通過排除條件。</p></div>}
          {scope === 'all' && <div className="scope-notice"><Info size={16} /><p>全部資料包含僅有圖片或成分缺漏的紀錄。明確原料或含有聲明的文字證據可作「包含」比對；「排除」仍只使用可解析成分資料。成分不明不能視為不含。</p></div>}
          {filters.some(filter => filter.mode === 'exclude') && <div className="scope-notice exclusion-notice"><Info size={16} /><p>排除條件只列可確認解析的資料；缺漏、解析待確認與相應警語會保守移除。{filters.some(filter => filter.mode === 'exclude' && filter.type === 'category') && ' 分類排除依目前分類規則；分類尚未完整，未命中不等於不含。'}</p></div>}
          {(catalogError || error) && <div className="error-state" role="alert"><AlertTriangle size={23} /><h3>資料暫時沒有連上</h3><p>{error || catalogError}</p><button className="primary-button" onClick={() => { setCatalogError(''); setReload(value => value + 1); }}>重新載入<ArrowRight size={15} /></button></div>}
          {!error && <div className={`products-grid ${loading && results ? 'is-updating' : ''}`} aria-busy={loading}>{!results && loading ? Array.from({ length: 6 }, (_, index) => <div className="product-skeleton" key={index} aria-hidden="true"><div /><span /><span /><span /></div>) : results?.products.map(product => <ProductCard key={product.id} product={product} onOpen={() => setSelectedProduct(product)} />)}</div>}
          {!loading && !error && results?.total === 0 && <div className="empty-state"><div className="empty-icon"><Search size={31} strokeWidth={1.3} /><Leaf size={17} /></div><h3>還沒找到符合條件的商品</h3><p>試著移除一個條件，或改用其他成分名稱。<br />「包含」條件越多，符合的商品會越少。</p><button className="primary-button" onClick={resetSearch}>清除條件，重新探索<ArrowRight size={16} /></button></div>}
          {!error && results && results.total > 0 && <div className="pagination"><span>顯示 {formatNumber(resultStart)}–{formatNumber(Math.min(results.page * results.pageSize, results.total))} 筆，共 {formatNumber(results.total)} 筆</span><div><button aria-label="上一頁" disabled={page <= 1 || loading} onClick={() => { setPage(value => value - 1); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }); }}><ChevronLeft size={16} /></button><span>{page} <span>/</span> {pageCount}</span><button aria-label="下一頁" disabled={page >= pageCount || loading} onClick={() => { setPage(value => value + 1); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }); }}><ChevronRight size={16} /></button></div></div>}
          <div className="results-disclaimer"><Info size={15} /><p>統計為商品資料筆數，可能含相同商品的不同登錄紀錄。成分文字可能不完整，不能替代包裝標示或作為過敏安全保證。</p></div>
        </div></div>
      </section>
      <section id="data-notes" className="data-section page-width"><div className="data-section-heading"><span className="section-kicker">BEHIND THE LABEL</span><h2>資料透明，選擇更有底。</h2><p>知道資料從哪裡來，也知道它還有哪些空白。</p></div><div className="data-info"><div className="coverage-grid"><div><span className="coverage-dot green" /><strong>{formatNumber(metadata?.ingredientTextProducts)}</strong><span>有成分文字</span></div><div><span className="coverage-dot gold" /><strong>{formatNumber(metadata?.ingredientImageOnlyProducts)}</strong><span>僅有原料標籤圖片</span></div><div><span className="coverage-dot gray" /><strong>{formatNumber(metadata?.noIngredientEvidenceProducts)}</strong><span>無成分文字或原料圖</span></div></div><p className="coverage-note">{metadata?.coverageNote || '成分欄位與圖片完整度因來源而異。僅有原料標籤圖片的商品，須完成辨識後才能加入文字篩選。'}{metadata?.partialImport && ' 本站目前僅匯入部分來源資料，不代表市場上所有食品。'}</p><SourceFacts metadata={metadata} />{sourceUrl && <a className="external-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">查看公開資料來源<ExternalLink size={14} /></a>}</div></section>
    </main>
    <footer className="site-footer page-width"><div><span className="footer-brand"><Leaf size={17} />成分透鏡</span><span>把標示看清楚，把選擇留給你。</span></div><span>公開資料查找工具 · 請以最新包裝為準</span></footer>
    <div className="mobile-sticky-bar"><div><strong>{loading ? '…' : formatNumber(results?.total)}</strong><span>筆符合條件</span></div><button onClick={() => setMobileFilters(true)}><SlidersHorizontal size={17} />調整成分篩選{filters.length > 0 && <span>{filters.length}</span>}</button></div>
    {mobileFilters && <Modal title="調整成分篩選" onClose={() => setMobileFilters(false)} className="filter-sheet"><FilterPanel {...filterProps} /><div className="filter-sheet-footer"><button className="primary-button" onClick={() => setMobileFilters(false)}>查看 {loading ? '…' : formatNumber(results?.total)} 筆商品資料<ArrowRight size={17} /></button></div></Modal>}
    {selectedProduct && <ProductDetailModal key={selectedProduct.id} initial={selectedProduct} catalog={catalog} onClose={() => setSelectedProduct(null)} />}
  </>;
}
