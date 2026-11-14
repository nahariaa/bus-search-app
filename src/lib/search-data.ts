export type SearchData = typeof import('./search-engine');
let pending: Promise<SearchData> | undefined;
let ready: SearchData | undefined;
export const getSearchData = () => ready;
// One in-flight import and one copy of the existing snapshot/matcher for all search UI.
export function loadSearchData() {
  return pending ??= import('./search-engine').then(engine => { ready = engine; return engine; })
    .catch(error => { pending = undefined; throw error; });
}
