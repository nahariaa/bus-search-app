# Project goals

1. Earn top-two Google organic positions for priority Haryana Roadways timetable, bus timing, and origin-to-destination queries. Track clicks, impressions, CTR, and average position in Google Search Console.
2. Build the best-designed Haryana bus search experience, with a fast, accessible mobile flow from route entry to departure times.
3. Start generating revenue as early as possible while keeping search and timetable results easy to use.

## SEO prioritization and evaluation

Use the reported 530,000+ timetable impressions and roughly position 8 as prioritization context. Evaluate homepage metadata changes in Google Search Console using comparable periods, filtered to the homepage and the same timetable query group. Compare clicks, impressions, CTR, and average position; these reported figures are context, not a verified measurement for a specific period.

## Timetable data and route matching

- Search, origin/destination suggestions, URLs, results and future static timetable pages must use the single versioned snapshot in `src/data/timetable.json`, through `src/lib/timetable.ts` and `src/lib/route-matching.ts`. Never create a second timetable or a separate page-specific matcher.
- Regenerate with `npm run timetable:import`. Read `data/timetable/REVIEW.md` before changing import rules. Preserve all raw fields, source references and original values alongside verified corrections. Account for all source records; never silently drop a row or merge services based only on similar route/time values.
- Keep source timetable, operating depot and published boarding point separate. Missing row depots fall back to the source PDF's depot title with `depotSource: filename`. Resolve compound depot cells from PDF evidence.
- Use stable place IDs and reviewed aliases. City-wide Delhi includes its verified terminals; Kashmiri Gate, Anand Vihar and Sarai Kale Khan remain distinct physical places. ISBT is an autocomplete search term, not a place to silently choose. Continue resolving mixed-case, whitespace and legacy URL values.
- From a published boarding point, match the final destination and every explicitly verified via place ID. Use exact IDs, never substring matching or unreviewed splitting of abbreviations. Destination suggestions must include these same intermediate destinations.
- An intermediate destination match must show the bus's true final destination and match reason, e.g. `Towards Katra · via Ludhiana`. The `00:40` Delhi → Katra departure must appear for Delhi → Ludhiana. That time is the departure at the published Delhi boarding point, not an intermediate arrival time.
- A via-only stop cannot become an origin or acquire an arrival/departure time without the source publishing that corresponding time. This rule applies to all routes and future static timetable pages.
- Run route/data regressions, `npm run build`, TypeScript checks and browser acceptance checks when updating the snapshot or matcher. Review `legacy-coverage.json` for disappearing routes and the per-file reconciliation/unresolved-row report.
