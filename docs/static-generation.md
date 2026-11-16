# Static public timetables

`npm ci && npm run build` creates `dist/` from the committed, reviewed timetable snapshot. The build needs no timetable downloads, account settings, browser, or Search Console export.

`scripts/prepare-public-timetables.ts` runs the shared matcher against the reviewed snapshot for each explicit entry in `src/lib/route-pages.ts`. It derives a small route and city registry, per-journey data and a private candidate inventory under `.tools/generated/`. The application and build use the same public route registry. City hubs have at least two selected journeys and are grouped by actual boarding city. The allowed city queries include named terminals when the place registry defines membership.

Vite builds the browser assets and a temporary Node SSR bundle. `scripts/build.mjs` renders the shared App with React, React Router and Helmet. Each timetable ships all departure rows in its initial HTML. An escaped JSON script contains that journey's data for hydration. Client navigation loads the corresponding generated journey chunk, with an in-memory cache and a full-page recovery link. The interactive search data and matcher stay in the import triggered by search. Source review, selection and inventory code stay on the build side.

The build writes the canonical XML sitemap from its indexable outputs. Homepage, About, Privacy, routes, hubs and journeys are indexable. `/search` preserves query aliases and returns noindex in its HTML and HTTP headers. Robots rules allow crawlers to read that directive. Search results offer direct links to matching public timetables. The 404 shell also has noindex and is served with HTTP 404. The sitemap omits search, error pages and speculative `lastmod` dates.

## Add or review a journey

Run `npm run timetable:inventory` and read `.tools/generated/route-inventory.json`. The inventory lists supported place-ID pairs, candidate canonical URLs, source-record counts, distinct document hashes, version-check outcomes, publication decisions and reasons. It includes a small explicit set of previously reviewed empty candidates. The report lives outside `dist/`. See the [release review and measurement plan](discovery-release.md) for the selected journeys and withheld examples.

Select only a passenger-useful journey supported by specific source evidence. Use canonical place IDs and one stable URL per pair. Document the selection reason in the allowlist. The build checks slug and pair uniqueness, endpoint identity and membership, nonempty matched departures and source page bounds. Mark newly selected routes with `newPage: true` until their production publication has been confirmed. Keep existing paths if spelling or common search wording changes. To add a hub, select a reviewed boarding city with multiple substantive published journeys. When updating the data, follow the [timetable review workflow](../data/timetable/REVIEW.md).

## Verify and review release routing

```sh
npm test
npm run build
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run test:static
python scripts/serve-static.py
```

With the static server running, execute these in separate commands.

```sh
python scripts/verify-static-browser.py
npm run test:browser
python scripts/verify-loading-browser.py
python scripts/verify-ads-browser.py
```

The static tests compare ordered service IDs, facts and serialized hydration data with the matcher. They also check each canonical, the sitemap, breadcrumb markup, link targets, and the link distance from Home. Browser checks cover clean URL responses, actual 404s, 360/390/1280 widths, JavaScript disabled, hydration, 200% text zoom, keyboard navigation, aliases and direct/search/client navigation. The loading suite covers failure and retry with the full snapshot deferred.

Vercel clean URLs serve generated HTML at extensionless paths. The slashless policy uses a permanent redirect for the trailing slash, and the 404 shell needs no catch-all rewrite. Use `--base-url` for preauthorized preview verification. Protected previews can pass a temporary share URL to the static browser checker with `--access-url` and keep it outside commits and reports. Repeat checks for HTTPS, the www origin, search noindex and the sitemap on the actual release after an authorized deployment.
