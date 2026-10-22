/** Shared encyclopedia contract. Matching identifies a reference entry, never the role in a specific product. */
export type AdditiveSource = { title: string; url: string };
export type RegulatoryStatus = 'official-listed' | 'amended-not-yet-effective' | 'mixed-effective-dates';
export type AdditivePurpose = { categoryCode: string; categoryZh: string; plainPurpose: string; scope: 'general-category' | 'official-item'; evidenceText?: string; evidenceSourceUrl?: string; regulatoryStatus?: RegulatoryStatus; regulatoryNote?: string; amendmentEffectiveDates?: string[] };
export type AdditiveResearch = { status: 'reviewed' | 'evidence-limited' | 'identity-pending' | 'research-pending'; reviewedAt: string; identity: string; processingUses: string; healthEffects: string; excessRisk: string; sensitiveGroups: string; evidenceLimitations: string; sources: (AdditiveSource & { supports: string })[] };
export type AdditiveEntry = { id: string; research?: AdditiveResearch; nameZh: string; nameEn: string; aliases: string[]; displayNames?: string[]; purposes: AdditivePurpose[]; sources: AdditiveSource[]; entryType?: 'substance' | 'group'; regulatoryStatus?: RegulatoryStatus; regulatoryNote?: string; tableReferences?: {categoryCode:string;number:string;page:number;sourceUrl:string}[] };
export type AdditiveCategory = { code: string; nameZh: string; plainPurpose: string };
export type AdditiveDictionary = {
  metadata: { retrievedAt?: string; sourceUpdatedAt?: string | null; completenessNote?: string; coverageIsComplete?: boolean; sourceName?: string; sourceUrl?: string; legalEffectNote?: string; coverageOfNamedTableRowsIsComplete?: boolean; counts?: Record<string, number>; [key: string]: unknown };
  sources?: AdditiveSource[];
  categories: AdditiveCategory[];
  additives: AdditiveEntry[];
};

export function normalizeAdditiveName(value: string): string {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('en').trim().replace(/\s+/g, ' ');
}
function names(entry: AdditiveEntry): string[] { return [entry.nameZh, entry.nameEn, ...(entry.aliases || [])].filter(Boolean).map(normalizeAdditiveName); }
/** Exact, conservative lookup: partial words must never imply a substance identity. */
export function matchAdditives(dictionary: AdditiveDictionary, name: string, aliases: string[] = []): AdditiveEntry[] {
  const candidates = new Set([name, ...aliases].map(normalizeAdditiveName).filter(Boolean));
  return dictionary.additives.filter(entry => names(entry).some(value => candidates.has(value)));
}
export function searchAdditives(dictionary: AdditiveDictionary, query: string, categoryCode = ''): AdditiveEntry[] {
  const q = normalizeAdditiveName(query);
  return dictionary.additives
    .filter(entry => !categoryCode || entry.purposes.some(purpose => purpose.categoryCode === categoryCode))
    .map(entry => {
      const terms = [...names(entry), ...(entry.displayNames || []).map(normalizeAdditiveName)];
      const rank = !q ? 3 : terms.some(name => name === q) ? 0 : terms.some(name => name.startsWith(q)) ? 1 : terms.some(name => name.includes(q)) ? 2 : 99;
      return { entry, rank };
    })
    .filter(item => item.rank < 99)
    .sort((a,b) => a.rank - b.rank || a.entry.nameZh.localeCompare(b.entry.nameZh, 'zh-Hant'))
    .map(item => item.entry);
}
/** Build-time content guard; source data never becomes executable markup. */
export function validateDictionary(dictionary: AdditiveDictionary): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const categoryCodes = new Set(dictionary.categories.map(category => category.code));
  for (const entry of dictionary.additives) {
    if (!entry.id || ids.has(entry.id)) errors.push(`Duplicate or missing entry id: ${entry.id}`);
    ids.add(entry.id);
    if (!entry.nameZh?.trim() || !Array.isArray(entry.aliases)) errors.push(`Invalid name or aliases: ${entry.id}`);
    if (!entry.sources?.length) errors.push(`Missing sources: ${entry.id}`);
    for (const source of entry.sources || []) {
      try { const url = new URL(source.url); if (url.protocol !== 'https:' || url.username || url.password || !source.title?.trim()) throw new Error(); }
      catch { errors.push(`Invalid source: ${entry.id}`); }
    }
    if (entry.research) {
      const research = entry.research;
      if (!['reviewed', 'evidence-limited', 'identity-pending', 'research-pending'].includes(research.status) || !/^\d{4}-\d{2}-\d{2}$/.test(research.reviewedAt)) errors.push(`Invalid research status or date: ${entry.id}`);
      for (const field of ['identity', 'processingUses', 'healthEffects', 'excessRisk', 'sensitiveGroups', 'evidenceLimitations'] as const) {
        if (typeof research[field] !== 'string' || !research[field].trim()) errors.push(`Missing research ${field}: ${entry.id}`);
      }
      if (!Array.isArray(research.sources) || !research.sources.length) errors.push(`Missing research sources: ${entry.id}`);
      for (const source of research.sources || []) {
        try { const url = new URL(source.url); if (url.protocol !== 'https:' || url.username || url.password || !source.title?.trim() || !source.supports?.trim()) throw new Error(); }
        catch { errors.push(`Invalid research source: ${entry.id}`); }
      }
    }
    for (const purpose of entry.purposes || []) {
      if (!['general-category','official-item'].includes(purpose.scope) || (purpose.scope === 'official-item' && !purpose.evidenceText?.trim()) || !purpose.plainPurpose?.trim() || !categoryCodes.has(purpose.categoryCode)) errors.push(`Unsupported or missing purpose: ${entry.id}`);
    }
  }
  return errors;
}
