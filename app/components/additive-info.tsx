'use client';

import { useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, ExternalLink, Info, LoaderCircle, X } from 'lucide-react';
import { normalizeAdditiveName, type AdditiveDictionary, type AdditiveEntry, type AdditiveSource } from '@/lib/additive-lookup';
import type { Ingredient, ClassificationResearch } from '@/app/components/catalog-types';
import { IngredientEncyclopediaLink } from './ingredient-encyclopedia-link';
import { safeHttpsUrl } from '@/app/components/filter-utils';
import { createIngredientEncyclopediaIndex } from '@/lib/encyclopedia-navigation';
import { additiveInfoReducer, initialAdditiveInfoState } from '@/app/components/additive-interaction.mjs';

let cachedDictionary: AdditiveDictionary | null = null;
let dictionaryRequest: Promise<AdditiveDictionary> | null = null;

function loadDictionary(): Promise<AdditiveDictionary> {
  if (cachedDictionary) return Promise.resolve(cachedDictionary);
  if (!dictionaryRequest) {
    dictionaryRequest = fetch('/api/additives').then(async response => {
      if (!response.ok) throw new Error('添加物資料暫時無法載入');
      const dictionary = await response.json() as AdditiveDictionary;
      if (!Array.isArray(dictionary.additives) || !Array.isArray(dictionary.categories) || !dictionary.metadata) throw new Error('添加物資料格式無法辨識');
      cachedDictionary = dictionary;
      return dictionary;
    }).catch(error => { dictionaryRequest = null; throw error; });
  }
  return dictionaryRequest;
}

/** The homepage never requests the dictionary until a product detail is opened. */
export function useAdditiveDictionary() {
  const [dictionary, setDictionary] = useState<AdditiveDictionary | null>(cachedDictionary);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadDictionary().then(value => { if (active) { setDictionary(value); setError(''); } }).catch(() => { if (active) setError('添加物說明暫時無法載入，請稍後重試。'); });
    return () => { active = false; };
  }, [attempt]);
  return { dictionary, error, loading: !dictionary && !error, retry: () => { setError(''); setAttempt(value => value + 1); } };
}

function safeSource(source: AdditiveSource) {
  const href = safeHttpsUrl(source.url);
  if (!href) return null;
  const url = new URL(href);
  return url.username || url.password ? null : href;
}

export function AdditiveSources({ sources }: { sources: AdditiveSource[] }) {
  return <ul className="additive-sources">{sources.map((source, index) => {
    const href = safeSource(source);
    return href ? <li key={`${href}-${index}`}><a href={href} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={12} /></a></li> : null;
  })}</ul>;
}

export function AdditiveEntryBadges({ entry }: { entry: AdditiveEntry }) {
  return <div className="additive-entry-badges">
    {entry.entryType === 'group' && <span>類群條目</span>}
    {entry.regulatoryStatus === 'amended-not-yet-effective' && <span className="additive-date-warning">含尚未施行的修正</span>}
    {entry.regulatoryStatus === 'mixed-effective-dates' && <span className="additive-date-warning">部分規定尚未施行</span>}
  </div>;
}

export function AdditiveResearchDetails({ entry }: { entry: AdditiveEntry }) {
  const research = entry.research;
  if (!research) return <section className="additive-research"><h5>人體影響與風險條件</h5><p>尚待逐項研究。未補充健康資料不代表安全或有害；目前只能參考下方官方用途資料。</p></section>;
  const status = { reviewed: '已整理逐項資料', 'evidence-limited': '已查核・證據有限', 'identity-pending': '身分或類群仍待確認', 'research-pending': '初步資料・尚待專屬查證' }[research.status];
  const sections = [['它是什麼', research.identity], ['加工用途與添加理由', research.processingUses], ['人體影響', research.healthEffects], ['高攝取量與風險條件', research.excessRisk], ['需留意的族群', research.sensitiveGroups], ['證據與適用界線', research.evidenceLimitations]];
  return <section className="additive-research"><div className="additive-source-heading">用途與人體影響研究</div><p className="additive-research-status">{status} · 查核 {research.reviewedAt}</p>{research.status === 'research-pending' && <p className="additive-purpose-caution">目前主要為一般背景、用途或初步來源，尚未完成此具體形態的專屬查證；不表示科學界已確定缺乏資料。下列內容保留作初步參考，不作完整安全評估。</p>}<dl>{sections.map(([label, content]) => <div key={label}><dt>{label}</dt><dd>{content}</dd></div>)}</dl><p className="additive-purpose-caution">這是成分層級的教育資料，不代表特定商品的含量或個人攝取風險。有添加不等於有害，無添加不等於更健康。每日容許攝取量不是中毒界線。</p><div className="additive-source-heading">研究來源與支持範圍</div><ul className="additive-sources">{research.sources.map((source,index) => { const href=safeSource(source); return href ? <li key={`${href}-${index}`}><div><a href={href} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={12}/></a><small>{source.supports}</small></div></li> : null; })}</ul></section>;
}

export function AdditiveEntryDetails({ entry }: { entry: AdditiveEntry }) {
  return <div className="additive-entry-details">
    <div className="additive-reference-heading"><h4>{entry.nameZh}</h4>{entry.nameEn && <p lang="en">{entry.nameEn}</p>}</div>
    <AdditiveEntryBadges entry={entry} />
    <div className="additive-purpose-label">用途參考</div>
    {entry.purposes.length ? <ul className="additive-purpose-list">{entry.purposes.map((purpose, index) => <li key={`${purpose.categoryCode}-${index}`}><div className="additive-purpose-meta"><strong>{purpose.categoryZh}</strong><span>{purpose.scope === 'official-item' ? '官方原表用途' : '分類的一般用途'}</span></div><p>{purpose.plainPurpose}</p>{purpose.scope === 'official-item' && purpose.evidenceSourceUrl && <AdditiveSources sources={[{ title: '查看原表用途', url: purpose.evidenceSourceUrl }]} />}{purpose.regulatoryNote && purpose.regulatoryNote !== entry.regulatoryNote && <small className="additive-purpose-note">{purpose.regulatoryNote}</small>}</li>)}</ul> : <p>尚無可顯示的分類用途說明。</p>}
    <p className="additive-purpose-caution">用途依各項標示區分為分類的一般說明或官方原表用途，不代表它在這項商品中的實際用途，也不判定可否使用、用量或安全性。</p>
    <AdditiveResearchDetails entry={entry} />
    {entry.aliases.length > 0 && <p className="additive-aliases"><strong>別名／其他寫法</strong>{entry.aliases.join('、')}</p>}
    {!!entry.displayNames?.length && <p className="additive-aliases"><strong>原表補充名稱（可能為泛稱）</strong>{entry.displayNames.join('、')}</p>}
    {entry.entryType === 'group' && <p className="additive-regulatory-note">這是類群條目，並非單一物質；不能視為此類所有個別成分的完整名單。</p>}
    {entry.regulatoryNote && <p className="additive-regulatory-note">{entry.regulatoryNote}</p>}
    <div className="additive-source-heading">查閱原始來源</div><AdditiveSources sources={entry.sources} />
  </div>;
}

export function ClassificationResearchDetails({ research }: { research: ClassificationResearch }) {
  return <div className="additive-entry-details classification-research">
    <div className="additive-source-heading">{research.status === 'pending' ? '待確認原因' : '分類核對依據'}</div>
    {research.categoryNames.length > 0 && <p><strong>{research.categoryNames.join('、')}</strong></p>}
    <p>{research.reason}</p>
    {!!research.referenceGroups?.length && <div className="additive-source-heading">參考類群詞條（不等於單一物質對應）{research.referenceGroups.map(group => <a key={group.id} className="additive-full-link" href={`/additives?entry=${encodeURIComponent(group.id)}#additive-index`}>{group.name}<ArrowUpRight size={14} /></a>)}</div>}
    <AdditiveSources sources={research.sources} />
    <p className="additive-purpose-caution">保留來源原標示；食品類型、來源材料或百科參考用途，不表示完整配方、廠商實際用途或合法使用的證明。</p>
  </div>;
}

export function ProductIngredientInfo({ ingredients }: { ingredients: Ingredient[] }) {
  const dictionaryState = useAdditiveDictionary();
  return <ProductIngredientInfoContent ingredients={ingredients} {...dictionaryState} />;
}

export function ProductIngredientInfoContent({ ingredients, dictionary, error, loading, retry }: { ingredients: Ingredient[]; dictionary: AdditiveDictionary | null; error: string; loading: boolean; retry: () => void }) {
  const [state, dispatch] = useReducer(additiveInfoReducer, initialAdditiveInfoState);
  const container = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const regionId = useId();
  const choices = useMemo(() => resolveIngredientExplanations(dictionary, ingredients), [dictionary, ingredients]);
  const selected = choices.find(item => item.ingredient.id === state.activeId);
  const selectedId = state.activeId;
  const informative = choices.filter(item => item.entries.length || item.category || item.ingredient.classificationResearch).length;

  useEffect(() => {
    if (!selectedId) return;
    const dismiss = (returnFocus: boolean) => {
      dispatch({ type: 'dismiss' });
      if (returnFocus) triggers.current.get(selectedId)?.focus();
    };
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) dismiss(false);
    };
    // Capture consumes Escape before the containing product modal's document handler.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      dismiss(true);
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true); };
  }, [selectedId]);

  const close = () => { dispatch({ type: 'dismiss' }); if (selectedId) triggers.current.get(selectedId)?.focus(); };
  return <div className="ingredient-info" ref={container}
    onMouseLeave={() => { if (!state.activeId || !container.current?.contains(document.activeElement)) dispatch({ type: 'leave' }); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) dispatch({ type: 'reset' }); }}>
    <div className="ingredient-info-heading"><span className="small-label">已辨識成分與用途標示</span><a href="/additives">食品添加物百科<ArrowUpRight size={13} /></a></div>
    <div className="ingredient-info-chips">{choices.map(({ ingredient, entries, category }) => {
      const referenceIngredient = dictionary ? { ...ingredient, encyclopedia: { entryIds: entries.map(entry => entry.id), categoryCode: category?.code } } : ingredient;
      return <span key={ingredient.id} className={`ingredient-info-chip${state.activeId === ingredient.id ? ' active' : ''}`}>
        <IngredientEncyclopediaLink ingredient={referenceIngredient} />
        {!!(entries.length || category || ingredient.classificationResearch) && <button
          ref={element => { if (element) triggers.current.set(ingredient.id, element); else triggers.current.delete(ingredient.id); }}
          className="ingredient-info-trigger"
          aria-label={`查看${ingredient.name}的用途說明`} aria-controls={regionId} aria-expanded={state.activeId === ingredient.id}
          onMouseEnter={() => dispatch({ type: 'preview', id: ingredient.id })}
          onFocus={() => dispatch({ type: 'preview', id: ingredient.id })}
          onClick={() => dispatch({ type: 'toggle', id: ingredient.id })}><Info size={15} /></button>}
      </span>;
    })}</div>
    {loading && <p className="ingredient-help-status"><LoaderCircle className="spin" size={13} />正在載入添加物說明…</p>}
    {error && <p className="ingredient-help-status">{error}<button onClick={retry}>重試</button></p>}
    {dictionary && <p className="ingredient-help-hint">{informative ? '點選成分名稱可前往百科。ⓘ 可懸停、鍵盤聚焦或點選查看用途參考、分類來源與待確認原因；點選後可固定說明。「搜尋百科」表示尚未唯一對應詞條，不代表不是添加物。' : '點選「搜尋百科」可查找原始成分名稱。目前沒有可精確對應的添加物說明；未對應不代表不含添加物。'}</p>}
    <div id={regionId} className="ingredient-help-panel" role="region" aria-label={selected ? `${selected.ingredient.name}的用途說明` : '添加物用途說明'} hidden={!selected}>
      {selected && <>
        <div className="ingredient-help-topline"><span><BookOpen size={15} />{selected.entries.length > 1 ? '名稱可能對應多個詞條' : selected.category && !selected.entries.length ? '分類名稱說明' : selected.ingredient.classificationResearch && !selected.entries.length ? '分類核對說明' : '添加物用途說明'}</span><button onClick={close} aria-label="關閉用途說明"><X size={16} /><span>關閉</span></button></div>
        {selected.entries.length > 1 && <p className="additive-ambiguity">此名稱／別名有 {selected.entries.length} 個精確對應詞條，無法單憑標示判定是哪一個。請核對包裝或向業者確認。</p>}
        {selected.entries.length > 0 ? selected.entries.map(entry => <div className="ingredient-reference-entry" key={entry.id}><AdditiveEntryDetails entry={entry} /><a className="additive-full-link" href={`/additives?entry=${encodeURIComponent(entry.id)}#additive-index`}>在百科查看此詞條<ArrowUpRight size={14} /></a></div>) : selected.category && <div className="additive-category-explanation"><h4>{selected.category.nameZh}</h4><span className="additive-purpose-label">分類的一般用途</span><p>{selected.category.plainPurpose}</p><p className="additive-purpose-caution">這個標示是用途分類，並未指出具體物質。分類的一般用途不代表這項商品的實際用途、用量或安全性。</p><a className="additive-full-link" href={`/additives?category=${encodeURIComponent(selected.category.code)}#additive-index`}>查看這一類的詞條與來源<ArrowUpRight size={14} /></a></div>}
        {selected.ingredient.classificationResearch && <ClassificationResearchDetails research={selected.ingredient.classificationResearch} />}
        {dictionary?.metadata.retrievedAt && <p className="ingredient-retrieval-date">百科資料擷取：{dictionary.metadata.retrievedAt}</p>}
      </>}
    </div>
  </div>;
}

export function resolveIngredientExplanations(dictionary: AdditiveDictionary | null, ingredients: Ingredient[]) {
  const reference = dictionary ? createIngredientEncyclopediaIndex(dictionary) : null;
  const byId = new Map(dictionary?.additives.map(entry => [entry.id, entry]));
  return ingredients.map(ingredient => {
    const category = dictionary?.categories.find(item => normalizeAdditiveName(item.nameZh) === normalizeAdditiveName(ingredient.name));
    const entries = reference ? reference(ingredient).entryIds.map(id => byId.get(id)!).filter(Boolean) : [];
    return { ingredient, entries, category };
  });
}
