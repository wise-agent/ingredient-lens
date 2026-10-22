export type Filter = { type: 'ingredient' | 'category'; id: string; name: string; mode: 'include' | 'exclude' };
export type Suggestion = { type: 'ingredient' | 'category'; id: string; name: string; aliases: string[]; count: number };

export function setTermFilter(filters: Filter[], term: Filter): Filter[] {
  return [...filters.filter(item => !(item.type === term.type && item.id === term.id)), term];
}

export function safeHttpsUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}

export function rankSuggestions(items: Suggestion[], query: string, limit = 10): Suggestion[] {
  const normalized = query.normalize('NFKC').trim().toLocaleLowerCase();
  const rank = (item: Suggestion) => {
    const name = item.name.normalize('NFKC').toLocaleLowerCase();
    if (!normalized) return 1;
    if (name === normalized) return 5;
    if (name.startsWith(normalized)) return 4;
    if (name.includes(normalized)) return 3;
    if (item.aliases.some(alias => alias.normalize('NFKC').toLocaleLowerCase().includes(normalized))) return 2;
    return 0;
  };
  return items.filter(item => rank(item) > 0).sort((a, b) => rank(b) - rank(a) || b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant')).slice(0, limit);
}
