'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Native document navigation is intentional: these routes must work independently of the SPA router. */

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Info, Leaf, LoaderCircle, Search, X } from 'lucide-react';
import { SiteHeader } from '@/app/components/site-navigation';
import { searchAdditives, type AdditiveDictionary, type AdditiveEntry } from '@/lib/additive-lookup';
import { AdditiveEntryBadges, AdditiveEntryDetails, AdditiveSources, useAdditiveDictionary } from '@/app/components/additive-info';
import { paginateAdditives } from '@/app/components/additive-interaction.mjs';
import { formatDate, formatNumber } from '@/app/components/product-display';

function subscribeLocation(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
const locationSnapshot = () => window.location.search;
const serverLocationSnapshot = () => '';

export function AdditiveCard({ entry, expanded, focused = false, onToggle }: { entry: AdditiveEntry; expanded: boolean; focused?: boolean; onToggle: () => void }) {
  const detailId = useId();
  return <article id={`additive-entry-${entry.id}`} tabIndex={-1} className={`additive-card${expanded ? ' is-expanded' : ''}${focused ? ' is-linked-target' : ''}`}>
    <div className="additive-card-heading"><span className="additive-card-index">{entry.purposes[0]?.categoryZh || '添加物詞條'}</span><BookOpen size={17} strokeWidth={1.4} /></div>
    <h3>{entry.nameZh}</h3>{entry.nameEn && <p className="additive-english" lang="en">{entry.nameEn}</p>}
    <AdditiveEntryBadges entry={entry} />
    <div className="additive-card-purpose"><span>用途參考</span>{entry.purposes.slice(0, 2).map((purpose, index) => <div className="additive-card-purpose-item" key={`${purpose.categoryCode}-${index}`}><span>{purpose.scope === 'official-item' ? '官方原表用途' : '分類的一般用途'}</span><p>{entry.purposes.length > 1 && <strong>{purpose.categoryZh}：</strong>}{purpose.plainPurpose}</p></div>)}{!entry.purposes.length && <p>尚無可顯示的分類用途說明。</p>}{entry.purposes.length > 2 && <small>另有 {entry.purposes.length - 2} 類用途，可展開查看。</small>}</div>
    <button className="additive-detail-toggle" aria-expanded={expanded} aria-controls={detailId} aria-label={`${expanded ? '收起' : '查看'}${entry.nameZh}的詳細說明`} onClick={onToggle}>{expanded ? '收起詳細說明' : '查看用途、人體影響與來源'}<ChevronDown size={16} /></button>
    <div id={detailId} className="additive-card-expanded" hidden={!expanded}>{expanded && <AdditiveEntryDetails entry={entry} />}</div>
  </article>;
}

export default function AdditivesPage() {
  const dictionaryState = useAdditiveDictionary();
  const locationSearch = useSyncExternalStore(subscribeLocation, locationSnapshot, serverLocationSnapshot);
  // A new URL owns a fresh search view, including after browser Back/Forward.
  return <AdditivesContent key={locationSearch} locationSearch={locationSearch} {...dictionaryState} />;
}

export function AdditivesContent({ dictionary, error, loading, retry, locationSearch }: { dictionary: AdditiveDictionary | null; error: string; loading: boolean; retry: () => void; locationSearch: string }) {
  const params = useMemo(() => new URLSearchParams(locationSearch), [locationSearch]);
  const linkedEntry = dictionary?.additives.find(entry => entry.id === params.get('entry'));
  const [queryInput, setQueryInput] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState<string | null>(null);
  const [expandedInput, setExpandedInput] = useState<string | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const query = queryInput ?? params.get('q') ?? linkedEntry?.nameZh ?? '';
  const requestedCategory = categoryInput ?? params.get('category') ?? '';
  const category = dictionary?.categories.some(item => item.code === requestedCategory) ? requestedCategory : '';
  const expandedId = expandedInput ?? linkedEntry?.id ?? '';
  const isLinkedView = queryInput === null && categoryInput === null && !!params.get('entry');
  const linkedTargetId = isLinkedView ? linkedEntry?.id : undefined;
  const results = useMemo(() => linkedTargetId && linkedEntry ? [linkedEntry] : dictionary ? searchAdditives(dictionary, query, category) : [], [linkedTargetId, linkedEntry, dictionary, query, category]);
  useEffect(() => {
    if (!linkedTargetId) return;
    const target = document.getElementById(`additive-entry-${linkedTargetId}`);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start' });
  }, [linkedTargetId]);
  const pagination = paginateAdditives(results, requestedPage, 24);
  const selectedCategory = dictionary?.categories.find(item => item.code === category);
  const metadata = dictionary?.metadata;
  const reset = () => { setQueryInput(''); setCategoryInput(''); setExpandedInput(''); setRequestedPage(1); };
  const changePage = (page: number) => { setRequestedPage(page); setExpandedInput(''); document.getElementById('additive-index')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return <>
    <SiteHeader page="additives" />
    <main className="additives-page page-width">
      <section className="additive-hero" aria-labelledby="additive-page-title"><div><a className="additive-back" href="/"><ArrowLeft size={14} />回到首頁・探索商品</a><div className="eyebrow"><span />THE ADDITIVE REFERENCE</div><h1 id="additive-page-title">食品添加物百科</h1><p>把成分表上的陌生名字，<br className="mobile-break" />換成容易理解的用途與風險說明。</p></div><div className="additive-hero-stat"><BookOpen size={25} strokeWidth={1.2} /><strong>{dictionary ? formatNumber(dictionary.additives.length) : '—'}</strong><span>官方附表所列添加物詞條</span><small>{dictionary ? `${dictionary.categories.length} 個用途分類 · 含類群條目` : '正在讀取收錄範圍'}</small></div></section>
      <div className="additive-scope-note"><Info size={19} /><div><strong>先了解用途，也留意資料範圍。</strong><p>用途參考會標明「分類的一般用途」或「官方原表用途」，都不代表它在特定商品中的實際作用。本頁含類群條目與分期施行的修正，不能當作所有個別物質或目前准用情況的完整清單。</p><a href="#additive-data-notes">查看來源、擷取日期與收錄說明<ArrowUpRight size={12} /></a></div></div>
      {dictionary && <div className="additive-scope-note"><Info size={19}/><div><strong>逐項研究進度</strong><p>首輪資料覆蓋 {dictionary.additives.filter(entry => !!entry.research).length} / {dictionary.additives.length} 個詞條，並非全部研究結案：已整理資料 {dictionary.additives.filter(entry => entry.research?.status === 'reviewed').length}，尚待專屬查證 {dictionary.additives.filter(entry => entry.research?.status === 'research-pending').length}，已查後證據有限 {dictionary.additives.filter(entry => entry.research?.status === 'evidence-limited').length}，身分待確認 {dictionary.additives.filter(entry => entry.research?.status === 'identity-pending').length}。未研究不代表安全或有害；有紀錄也不等於安全認證，請查看每筆限制與來源。</p></div></div>}
      <section id="additive-index" className="additive-index" aria-label="搜尋食品添加物">
        <div className="additive-index-heading"><div><span className="section-kicker">LOOK UP AN INGREDIENT</span><h2>這個名字，是做什麼用的？</h2></div><span>中文、英文、別名都可以查</span></div>
        <div className="additive-search-toolbar"><div className="product-search"><Search size={19} /><input type="search" aria-label="搜尋添加物中文名、英文名或別名" placeholder="搜尋中文名、英文名或別名" value={query} onChange={event => { setQueryInput(event.target.value); setRequestedPage(1); setExpandedInput(''); }} />{query && <button className="search-clear" aria-label="清除添加物搜尋" onClick={() => { setQueryInput(''); setRequestedPage(1); setExpandedInput(''); }}><X size={17} /></button>}</div><div className="category-select"><select aria-label="依用途分類" value={category} onChange={event => { setCategoryInput(event.target.value); setRequestedPage(1); setExpandedInput(''); }}><option value="">所有用途分類</option>{dictionary?.categories.map(item => <option key={item.code} value={item.code}>{item.nameZh}</option>)}</select><ChevronRight size={15} /></div></div>
        {selectedCategory && <div className="additive-selected-category"><span>分類的一般用途</span><strong>{selectedCategory.nameZh}</strong><p>{selectedCategory.plainPurpose}</p></div>}
        {isLinkedView && dictionary && <p className={`additive-linked-notice${linkedEntry ? '' : ' missing'}`} role="status">{linkedEntry ? '已開啟連結指定的詞條，可直接閱讀下方用途與來源。' : '連結中的詞條目前未收錄，請用名稱搜尋，或查看所有收錄詞條。'}</p>}
        <div className="additive-results-summary" aria-live="polite"><span><strong>{dictionary ? formatNumber(results.length) : '—'}</strong> 個詞條{query || category ? '符合條件' : '可供查閱'}</span>{(query || category) && <button className="text-button" onClick={reset}>清除搜尋與分類</button>}</div>
        {loading && <div className="additive-loading" role="status"><LoaderCircle className="spin" size={25} /><p>正在載入官方附表詞條…</p></div>}
        {error && <div className="additive-empty" role="alert"><Info size={28} /><h3>資料暫時無法載入</h3><p>{error}</p><button className="primary-button" onClick={retry}>重新載入</button></div>}
        {dictionary && !results.length && <div className="additive-empty"><Search size={30} strokeWidth={1.4} /><h3>還沒找到這個名字</h3><p>試試其他寫法、英文名稱，或移除分類條件。<br />沒有查到，不代表該成分不是添加物。</p><button className="primary-button" onClick={reset}>查看所有收錄詞條</button></div>}
        {dictionary && results.length > 0 && <div className="additive-grid">{pagination.entries.map(entry => <AdditiveCard key={entry.id} entry={entry} expanded={expandedId === entry.id} focused={linkedTargetId === entry.id} onToggle={() => setExpandedInput(expandedId === entry.id ? '' : entry.id)} />)}</div>}
        {dictionary && results.length > 0 && <div className="pagination additive-pagination"><span>顯示 {pagination.start}–{pagination.end} 個，共 {formatNumber(results.length)} 個詞條</span><div><button aria-label="上一頁添加物" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}><ChevronLeft size={17} /></button><span>{pagination.page} <span>/</span> {pagination.pages}</span><button aria-label="下一頁添加物" disabled={pagination.page >= pagination.pages} onClick={() => changePage(pagination.page + 1)}><ChevronRight size={17} /></button></div></div>}
      </section>
      <section id="additive-data-notes" className="additive-data-notes"><div><span className="section-kicker">A NOTE ON THE SOURCE</span><h2>來源清楚，說明有界線。</h2><p>用途說明協助閱讀標示，不提供健康評分，也不判定特定商品是否合法使用某項添加物。</p></div><div><dl className="additive-source-facts"><div><dt>收錄依據</dt><dd>{metadata?.sourceName || '官方食品添加物使用範圍及限量附表'}</dd></div><div><dt>本次擷取日期</dt><dd>{formatDate(metadata?.retrievedAt)}</dd></div><div><dt>來源版本日期</dt><dd>{formatDate(metadata?.sourceUpdatedAt || undefined)}</dd></div><div><dt>收錄範圍</dt><dd>官方附表所列詞條，包含類群名稱</dd></div></dl><p>{metadata?.completenessNote || '香料等部分條目是類群名稱，不等於所有個別物質的完整名單；實際範圍以載入資料的收錄說明為準。'}</p><p className="additive-legal-note">{metadata?.legalEffectNote || '來源版本可能含分期施行的規定，請分別核對官方原文與施行日期。分類的一般用途不代表特定食品的准用範圍、限量或安全保證。'}</p>{dictionary?.sources && <AdditiveSources sources={dictionary.sources} />}<p className="additive-source-footnote">各詞條下方另附對應來源；產品頁與本頁共用同一份用途資料。過敏、特殊飲食或健康需求，請核對最新包裝標示並向業者確認。</p></div></section>
    </main>
    <footer className="site-footer additive-footer page-width"><div><span className="footer-brand"><Leaf size={17} />成分透鏡</span><span>把標示看清楚，把選擇留給你。</span></div><a href="/">回到首頁・探索商品<ArrowUpRight size={13} /></a></footer>
  </>;
}
