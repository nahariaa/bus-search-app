# Timetable discovery and advertising release

This release preserves the eleven existing journey URLs and adds seven journeys and two departure-city hubs. The main timetable appears before search and source controls on each journey page. Compact rows show the actual boarding point, published departure time, final destination, operator, type and days. Native source disclosures give the depot, route wording and PDF reference. The homepage keeps its existing title and description, with the city directory and passenger help below search. No homepage metadata experiment is scheduled for this release.

## New pages

| Added journey | Source records | Source documents |
| --- | ---: | --- |
| `/routes/jind-to-chandigarh` | 23 | Jind |
| `/routes/chandigarh-to-jind` | 50 | Ambala and Chandigarh |
| `/routes/jind-to-delhi` | 8 | Jind |
| `/routes/hisar-to-chandigarh` | 105 | Hisar |
| `/routes/rohtak-to-chandigarh` | 114 | Rohtak |
| `/routes/gurugram-to-chandigarh` | 32 | Gurugram |
| `/routes/sirsa-to-chandigarh` | 23 | Sirsa archive |

The table counts matching rows in snapshot `f0ecda50ed42`. Records can overlap across publications and have different operating days. The counts describe source coverage.

`/cities/jind` links to both published Jind departures and to the Chandigarh return. `/cities/chandigarh` includes the published Sector 17 and Sector 43 boarding points alongside entries that state only Chandigarh. `/routes` groups every selected journey by origin and gives direct links. All seven named release candidates passed the publication review.

Yamunanagar → Shahabad, Faridabad → Yamunanagar, Karnal → Gurugram and Anand Vihar → Haridwar have no matching departure in this snapshot. All other supported pairs outside the allowlist await editorial review. Intake priorities are provisional until a dated Search Console export is available.

The source review found an unresolved report that 06:40, 07:20 and 07:50 Jind → Chandigarh use 152D. Both official publications list Kaithal. The route page keeps Kaithal and recommends confirming those departures with the bus stand. A dated operational confirmation remains open. The Sirsa archive and current official PDF have different hashes. The 23 extracted page texts match in order, with archive references and the current official download identified separately. [Jind depot timetable, page 8](https://cdnbbsr.s3waas.gov.in/s314ea0d5b0cf49525d1866cb1e95ada5d/uploads/2024/12/20250128956775283.pdf#page=8) · [Separate official Jind schedule, page 5](https://cdnbbsr.s3waas.gov.in/s314ea0d5b0cf49525d1866cb1e95ada5d/uploads/2024/12/20241209209126286.pdf#page=5) · [Official depot index, page 2](https://hartrans.gov.in/bus-time-table-depot-wise/page/2/)

## Search Console measurement

Use the verified Search Console property for the www origin and record the release SHA, deployment date, sitemap submission date, and document and operational review status separately. Export a 28-day Web Search baseline ending before deployment. After the release is available and indexing has had time to settle, compare a complete 28-day period with the same search type, country, device, query and page filters. Record exact period dates and separate mobile from all-device results. Keep exports in private storage outside Git and the build. There is no verified baseline export for this release.

Track clicks, impressions, CTR, and average position for each query group and its intended canonical. Include spelling variants and phrases such as “bus timing” and “time table” in the same journey group. Map Delhi city and terminal-specific queries to their relevant page when supported. Group broad Haryana Roadways timetable queries under `/`, and departure-city queries under the relevant city hub. Review indexing and Google's selected canonical in URL Inspection for each new page. Compare total query-group visibility across pages as well as per-page results so that a query shifting from the homepage to a journey does not read as newly created demand. [Sitemap submission guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

Keep Search Console impressions, any future site sessions, AdSense page views and ad impressions in separate columns. After activation, record AdSense page views, page RPM and actual revenue by comparable period. The site has no analytics service or event transmission in this release. Evaluate field LCP, INP and CLS at the 75th percentile when field data is available. Good thresholds are 2.5 s, 200 ms and 0.1 respectively. [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) · [AdSense page RPM](https://support.google.com/adsense/answer/112030)

## Advertising review and activation

The build serves without ads by default. One manually placed unit can become eligible after the timetable and related links on journeys with ten or more published records. The placement reserves space after consent, loads the script near the viewport and retains the reserved space when a request fails or returns no fill. The script loads once per document and each eligible journey can initialize once per client navigation session. The small city hubs and all search, error and utility pages are outside the initial placement.

1. In the actual publisher account, add the site, complete ownership verification using an account-provided method, and request Google review. Keep Auto ads disabled for this placement. Use the account's independently verified `ads.txt` seller line if supplied and verify that the canonical host serves it at `/ads.txt`. [Site review](https://support.google.com/adsense/answer/12176698) · [Ad placement](https://support.google.com/adsense/answer/1282097) · [Ads.txt](https://support.google.com/adsense/answer/12171612)
2. Integrate a Google-certified TCF CMP selected for the site's actual audiences. Bootstrap its real `__tcfapi` v2 stub before the app mounts, include Google Advertising Products and configure the applicable consent regimes and a way to reopen preferences. The placement expects an affirmative TCF signal for the configured CMP ID, Google vendor 755 and purposes 1, 3 and 4. If the selected CMP supplies no such signal in a region, ads stay dormant there. Verify the real CMP, consent withdrawal, disclosures, and placement in an authorized environment before activation. Adapt the consent and Privacy copy to the deployed provider and any other enabled processing. [Google-certified CMP requirements](https://support.google.com/adsense/answer/13554116)
3. Supply the real `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_ROUTE_SLOT`, and `VITE_ADSENSE_CMP_ID` via build configuration. Set `VITE_ADSENSE_ENABLED=true` only for the approved setup, then rebuild. Missing config fails closed. Verify the unit dimensions at mobile and desktop widths against the account-provided display-ad code. [Responsive ad units](https://support.google.com/adsense/answer/9183363)

For automated success, blocked-script and no-fill checks, use a local-only build with `VITE_ADSENSE_ENABLED=true`, `VITE_ADSENSE_CLIENT=ca-pub-0000000000000000`, `VITE_ADSENSE_ROUTE_SLOT=0000000000` and `VITE_ADSENSE_CMP_ID=42`. Run `python scripts/verify-ads-browser.py --enabled` only against that local build. The browser harness intercepts every third-party request and supplies the mock consent and script. Unset all four variables and rebuild the default release output afterward. Real account and seller values have not been supplied.
