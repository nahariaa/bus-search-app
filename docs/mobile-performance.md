# Mobile loading review

Baseline: production `71af0f3c94f9542e91b94dd77ebc00b497cbb533`, measured 15 November 2026 from this Windows host. The public production deployment was verified against the Git SHA before testing. All results below are laboratory measurements, not real-user Core Web Vitals.

## What was in the main script

The actual minified asset is **3,828,489 bytes**, not 3.83 MB over the network. Chrome received **333,737 encoded body bytes** for that asset in the baseline CDP test. Vercel compression and its response encoding matter; Vite's gzip estimate is approximately 383,000 bytes.

| Contribution | Minified bytes | Share |
|---|---:|---:|
| Snapshot declarations: places, packed services, ID and snapshot object | 3,473,034 | 90.7% |
| Third-party dependencies | 318,940 | 8.3% |
| `route-pages.ts` validation and selection | 2,020 | 0.05% |
| Other application code, shared matcher, wrappers and punctuation | 34,495 | 0.9% |

Snapshot bytes were counted from the emitted JavaScript AST's four data declarators (80,019 + 3,392,914 + 69 + 32). Dependency and route-selection attribution uses minified source-map segments; shared punctuation is in the remainder. Vite's JSON transform supplies no detailed source map, so attributing its whole generated range to the preceding mapped module would incorrectly blame `ui/card.tsx` for approximately 3.47 MB. Dependency examples are React DOM (~129.6 KB), Sonner (~33.0 KB), tailwind-merge (~20.0 KB), Helmet (~11.8 KB), plus Router, Radix, React Query and supporting packages. Installed dependencies that tree shaking excludes are not counted.

The route-selection module is small but importing it ran `validateRouteManifest()` and matched all 11 public journeys in every browser, including About and Privacy. `timetable.ts` also expanded the complete packed snapshot and the matcher built its origin index at startup. Public-page presentation imports pulled in those runtime dependencies even when no search was used.

## Test conditions and baseline

Three cold-cache runs per URL, no concurrent browser or build workloads. Chrome **157.0.8103.79**, Windows, plugged-in host; emulation is not a physical low-end handset. No extensions or service worker, fresh contexts/processes, headless Chrome. Native network conditions and CDN cache/TTFB may vary between runs. Use medians and keep the separate measurement methods distinct.

- **CDP:** 390 × 844 CSS pixels, touch/mobile context, DPR 1, disabled browser cache, 150 ms added latency, 1.6 Mbit/s download, 0.75 Mbit/s upload, 4× CPU slowdown. `Network.loadingFinished.encodedDataLength` counts observed compressed network bytes including HTTP overhead; `Performance.ScriptDuration` and `TaskDuration` are recorded after network idle. The latter includes rendering and browser tasks, not just JavaScript.
- **Lighthouse 13.0.1:** default simulated mobile profile, 412 × 823, DPR 1.75, 150 ms RTT, 1,638.4 Kbit/s throughput, 4× CPU slowdown. Three independent Chrome processes per URL; performance/accessibility/SEO categories. Lighthouse bootup/main-thread timings come from its trace and must not be equated with the separately throttled CDP timings. Node 20.16.0 ran the pinned tooling successfully despite Lighthouse's >=22.19 engine warning; use that same runtime for this comparison.

| Baseline page | CDP transferred bytes, median | CDP JS execution, median | Lighthouse performance | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 356,197 | 180.7 ms | 93 | 2.582 s | 34.5 ms | 0 |
| `/routes` | 355,299 | 158.0 ms | 99 | 0.930 s | 115 ms | 0 |
| `/routes/delhi-to-ludhiana` | 352,846 | 202.5 ms | 93 | 2.578 s | 53 ms | 0 |

The raw per-run summaries are retained in ignored local tooling; the PR records the final before/after production comparison and preview verification. Baseline About/Privacy transferred medians were 355,476 / 355,628 bytes and script execution 188.6 / 182.9 ms. Baseline Lighthouse accessibility and SEO were 100 on all three pages. Static HTML already made public timetable content available without waiting for JavaScript, so this change should primarily reduce transfer, initialization and hydration cost; it cannot promise equivalent LCP gains on every URL.

No verified CrUX or Search Console Core Web Vitals report was available in this task, and the app has no RUM/Speed Insights script. The repository's reported Search Console impressions/position are prioritization context, not field performance measurements. No field improvement is claimed; evaluate field LCP/INP/CLS over a suitable post-release period separately.

## Change and tradeoffs

`prepare-public-timetables.ts` derives route summaries and per-route hydration data from the existing snapshot and validated shared matcher before the browser build. Build-only route selection is absent from startup. Complete public HTML, service source disclosures, IDs, URLs, metadata and sitemap still come from the shared React rendering. Only the current journey's data is embedded as escaped non-executing JSON; hydration uses the identical records. Other journey chunks load on client navigation, are cached in memory, and have loading/retry/full-page recovery states. They are generated artifacts, never a second editable timetable source.

Interactive data loads once on form focus or submission, and immediately on direct `/search` entry. Fields remain editable during loading, latest input feeds autocomplete when the data arrives, and failure states announce recovery with retry or published routes. Keyboard/alias autocomplete and city/terminal/via matching still use `route-matching.ts`. Empty search results are not shown while data is loading. Unused React Query, tooltip and Sonner providers were removed; search validation retains its existing Radix toast system. No dependency versions or homepage wording changed.

Startup JavaScript is approximately **264 KB uncompressed / 85 KB gzip**, down about 93% / 78%. The remaining **3.475 MB search chunk (~269 KB gzip)** is deferred, not eliminated. A first cold search therefore waits for the snapshot, while typing remains possible; warm searches reuse it. Public timetables carry some duplicate representation in HTML and their own JSON so they can hydrate without an extra request; Delhi–Ludhiana adds roughly 40 KB of uncompressed inline JSON. Full timetable markup and card rendering remain intentionally intact. Further splitting the matcher/data or changing rendering should be justified by later measurements.

## Reproduction and regression coverage

Run `npm ci`, `npm run build`, both `npx tsc --noEmit -p tsconfig.*.json` checks individually, `npm test`, and `npm run test:static`. `npm run dev` prepares generated data automatically; after changing the snapshot or route selections during development, rerun the preparation script or restart dev. From a clean checkout, build before TypeScript checks because the generated manifest is an input.

With `python scripts/serve-static.py` serving the production output, run `scripts/verify-static-browser.py`, `scripts/verify-timetable-browser.py`, and `scripts/verify-loading-browser.py`. The static suite covers all 15 indexable pages without/with JavaScript at 360/390/1280, metadata, raw HTML, exact service IDs, hydration node retention, source details, real 404/redirects, zoom and history. New checks cover payload/matcher equality, exclusion from startup, delayed import with live typing, deduplication, failure/retry, route navigation isolation and direct search loading. The 00:40 Kashmiri Gate departure **towards Katra via Ludhiana** remains in all 86 Delhi–Ludhiana matches.

The existing Git integration builds the feature branch as a preview; verify the intended `bus-search-app` Vite project and preview before merging to `main`, then verify its production deployment and repeat the same mobile measurements. The eight duplicate Vercel projects already failed on the baseline commit; the inspected duplicate uses an erroneous Next.js configuration. They are outside this performance change.
