# Static public timetables

`npm ci && npm run build` creates the deployable `dist/` directory. No new dependencies, live API, network timetable fetch, or browser installation are needed for a build.

Vite builds the browser assets and a temporary Node SSR bundle in ignored `.tools/ssr/`. `scripts/build.mjs` renders the shared `App` with React `renderToString`, React Router `StaticRouter`, and a fresh Helmet context per page. The browser uses `BrowserRouter` and `hydrateRoot` for pre-rendered roots. Browser-only effects run after loading. The query-dependent `/search` uses a small client-rendered shell with initial noindex metadata, an HTTP `X-Robots-Tag: noindex` header, and a no-JavaScript directory link. Search queries, aliases and matching are unchanged.

`src/routes.tsx` supplies the indexable paths to both React Router and the build. `src/lib/route-pages.ts` contains only stable place IDs, slugs and selection rationale. Its validation calls the existing `matchRoutes` against `src/data/timetable.json` through `timetable.ts`; it rejects unknown IDs, duplicate slugs/pairs, invalid slugs, identical endpoints and empty journeys. Route details reuse `BusSearchResults`, including missing-information states, actual boarding points, final destinations, via match labels, operating days and source references. No service data is copied into the manifest.

HTML and the XML sitemap are generated from the same validated page output. `generated-pages.json` records the snapshot ID, paths and service IDs for regression evidence. No lastmod, update date, or claim of recently checking a timetable is invented. The snapshot hash identifies the data revision; original source names, PDF pages and row references remain on each service. Published days vary and source records can overlap, so pages avoid daily service counts and first/last-bus claims.

## Selected journeys

The Search Console candidates are leads, not proof of demand or availability. Counts below are matching **source records in snapshot `9952d2be0e6e`**, not distinct or daily operating buses. All pages use the canonical origin `https://www.haryanabus.in`.

| Path | Records | Selection rationale |
| --- | ---: | --- |
| `/routes/delhi-to-chandigarh` | 226 | Search Console candidate; verified city-wide Delhi includes published terminal departures. |
| `/routes/gurugram-to-haridwar` | 2 | Search Console candidate with published inter-state coverage. |
| `/routes/delhi-to-yamunanagar` | 53 | Search Console candidate with verified timetable coverage. |
| `/routes/fatehabad-to-delhi` | 51 | Search Console candidate connecting western Haryana to Delhi. |
| `/routes/rohtak-to-gurugram` | 39 | Search Console candidate with regional departures. |
| `/routes/sirsa-to-delhi` | 38 | Search Console candidate with long-distance coverage. |
| `/routes/gurugram-to-hisar` | 15 | Existing homepage shortcut and Search Console candidate. |
| `/routes/delhi-to-ludhiana` | 86 | Existing shortcut; 37 via matches include the 00:40 Kashmiri Gate departure towards Katra. |
| `/routes/chandigarh-to-delhi` | 244 | Existing shortcut and independently verified reverse journey. |
| `/routes/bhiwani-to-delhi` | 37 | Existing shortcut with reviewed Delhi coverage. |
| `/routes/sarai-kale-khan-delhi-to-jaipur` | 71 | Distinct physical terminal; includes final-destination and verified via matches. |

Yamunanagar to Shahabad, Faridabad to Yamunanagar, and Karnal to Gurugram returned no matches and were excluded. Anand Vihar to Haridwar was also checked and unsupported. No inference of service absence outside this collection is intended. No unverified reverse pages are generated.

## Updating timetables or selections

Follow `data/timetable/REVIEW.md` and run `npm run timetable:import` for a reviewed source update. Commit the regenerated snapshot and reconciliation artifacts. Every normal build regenerates all public pages and the sitemap from that snapshot. If a selected journey loses supported services, the build fails with its slug; review the data or explicitly remove the selection. Add or change a journey only in `routeManifest`, preserving existing URLs where possible. Aliases remain in the reviewed place data, never in per-page matching rules.

## Routing and release

Vercel's existing Git integration builds feature branches as previews and `main` as production. `cleanUrls: true` serves generated `.html` files at extensionless URLs; `trailingSlash: false` redirects trailing slashes with 308. Search is a real generated `search.html` shell, so no SPA rewrite is required. There is no catch-all homepage fallback. Unknown paths use `404.html` with HTTP 404. `/search` remains noindex with all query strings. Assets, robots and sitemap are served as files. All internal links and canonicals follow the slashless policy except `/`.

The former `sitemap-generator.ts` had only the obsolete Next-style sitemap page as a caller; both were removed. The new build writes `dist/sitemap.xml`; robots points to the `.in` www origin.

## Verification

```sh
npm test
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
npm run test:static
python scripts/serve-static.py
# In another terminal, with the existing Playwright/Chrome tooling:
python scripts/verify-static-browser.py
npm run test:browser
```

The static regressions compare every service ID and displayed timetable fact with the shared matcher, exercise invalid selections, parse every page's initial metadata and the XML sitemap, and verify internal links. Browser acceptance checks raw HTTP, direct visits, redirects, genuine 404s, search noindex, assets, all 15 public pages with JavaScript off and on at 360/390/1280 widths, retained heading nodes during hydration, source disclosures, 200% text zoom, navigation focus, search prefill, and back/forward metadata. The original browser suite covers autocomplete, keyboard selection, mixed-case/whitespace/legacy URLs, refreshes, unsupported origins and Delhi to Ludhiana.

Pass `--base-url URL --output .tools/preview-static.json` (or production) to the static browser checker. Protected previews can use `--access-url` with a temporary share URL kept only in ignored local tooling; reports exclude that URL. The local static server models clean URLs but does not substitute for checks against actual Vercel responses.

Baseline at main `11c9c7b`: existing 3 Python and 8 matcher tests and both TypeScript checks pass. Repository-wide lint has three pre-existing errors in `ui/command.tsx`, `ui/textarea.tsx`, and `tailwind.config.ts`, plus eight warnings. Removing the obsolete sitemap page removes one warning; changed TypeScript files pass lint. The existing full snapshot still produces a large browser bundle; static HTML removes its load/execute time from access to public timetable content. Source revision dates and some service details are missing in the dataset and are explicitly described as unavailable.
