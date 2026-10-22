/** @typedef {{ activeId: string | null, pinned: boolean, suppressedId: string | null }} AdditiveInfoState */
/** @typedef {{type: 'preview' | 'toggle', id: string} | {type: 'leave' | 'dismiss' | 'reset'}} AdditiveInfoAction */
/** @type {AdditiveInfoState} */
export const initialAdditiveInfoState = { activeId: null, pinned: false, suppressedId: null };
/** @param {AdditiveInfoState} state @param {AdditiveInfoAction} action @returns {AdditiveInfoState} */
export function additiveInfoReducer(state, action) {
  if (action.type === 'reset') return initialAdditiveInfoState;
  if (action.type === 'dismiss') return { activeId: null, pinned: false, suppressedId: state.activeId };
  if (action.type === 'leave') return state.pinned ? state : initialAdditiveInfoState;
  if (action.type === 'preview') {
    if (state.pinned || state.suppressedId === action.id) return state;
    return { activeId: action.id, pinned: false, suppressedId: null };
  }
  if (action.type === 'toggle') {
    if (state.pinned && state.activeId === action.id) return { activeId: null, pinned: false, suppressedId: action.id };
    return { activeId: action.id, pinned: true, suppressedId: null };
  }
  return state;
}
/** @template T @param {T[]} items @param {number} requestedPage @param {number} pageSize */
export function paginateAdditives(items, requestedPage, pageSize = 24) {
  const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 24;
  const pages = Math.ceil(items.length / size);
  const requested = Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1;
  const page = Math.max(1, Math.min(requested, pages || 1));
  const offset = (page - 1) * size;
  return { entries: items.slice(offset, offset + size), page, pages, start: items.length ? offset + 1 : 0, end: Math.min(offset + size, items.length) };
}
