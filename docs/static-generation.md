# Static public timetables

`npm ci && npm run build` creates `dist/` from the committed, reviewed timetable snapshot. The build needs no timetable downloads, account settings, browser, or Search Console export.

`scripts/prepare-public-timetables.ts` runs the shared matcher against the reviewed snapshot for each allowed link in `src/lib/route-pages.ts`. It derives a route and city registry, per-journey data and a private candidate inventory under `.tools/generated/`. There is one directional page for every distinct pair of the 24 depot areas in the official timetable index, plus separately selected journeys outside that set. The two Delhi PDF entries share a city-wide departure area. [Official timetable index](https://hartrans.gov.in/bus-time-table-depot-wise/) · [Index page 2](https://hartrans.gov.in/bus-time-table-depot-wise/page/2/)

`/routes` groups all connections by departure depot. Each `/cities/` hub also links to every other depot area. Ambala covers Ambala City and Ambala Cantt. Faridabad covers Ballabgarh and Faridabad (NIT), with Ballabgarh published as the boarding point in `faridabad.pdf`. These are explicit boarding-area groupings in the place registry. Each record keeps its actual stand, route and operating depot. [Official bus stand list](https://hartrans.gov.in/passenger-enquiry-telephone-numbers-at-bus-stands/)

Vite builds the browser assets and a temporary Node SSR bundle. `scripts/build.mjs` renders the shared App with React, React Router and Helmet. Each timetable ships all departure rows in its initial HTML. An escaped JSON script contains that journey's data for hydration. Client navigation loads the corresponding generated journey chunk, with an in-memory cache and a full-page recovery link. The interactive search data and matcher stay in the import triggered by search. Source review, selection and inventory code stay on the build side.

The build writes the canonical XML sitemap from its indexable outputs. Depot connection pages without a published through departure show the coverage gap, the reverse connection and official enquiry links. They serve HTTP 200 with noindex, carry no journey payload and stay out of the sitemap. `/search` preserves query aliases and returns noindex in its HTML and HTTP headers. Search results offer direct links to matching connection pages. The 404 shell also has noindex and is served with HTTP 404.

## Add or review a journey

Run `npm run timetable:inventory` and read `.tools/generated/route-inventory.json`. The inventory lists supported place-ID pairs, candidate canonical URLs, source-record counts, distinct document hashes, version-check outcomes, publication decisions and reasons. It includes a small explicit set of previously reviewed empty candidates. The report lives outside `dist/`. See the [release review and measurement plan](discovery-release.md) for the selected journeys and withheld examples.

Select other journeys only when they provide specific evidence and passenger value. Use canonical place IDs and one stable URL per pair. Document the selection reason in the allowlist. The build checks slug and pair uniqueness, endpoint identity and membership, and source page bounds. Empty connection pages are limited to the explicit depot matrix. Keep existing paths if spelling or common search wording changes. When updating the data, follow the [timetable review workflow](../data/timetable/REVIEW.md).

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

The static tests compare ordered service IDs, facts and serialized hydration data with the matcher. They check reciprocal links for the complete depot matrix, along with each canonical, the sitemap, breadcrumb markup and link targets. The browser suite checks raw HTTP for all generated pages and representative routes and hubs at 360/390/1280 widths, including closed directory disclosures, JavaScript disabled, hydration, 200% text zoom, keyboard navigation and search. The loading suite covers failure and retry with the full snapshot deferred.

Vercel clean URLs serve generated HTML at extensionless paths. The slashless policy uses a permanent redirect for the trailing slash, and the 404 shell needs no catch-all rewrite. Use `--base-url` for preauthorized preview verification. Protected previews can pass a temporary share URL to the static browser checker with `--access-url` and keep it outside commits and reports. Repeat checks for HTTPS, the www origin, search noindex and the sitemap on the actual release after an authorized deployment.
