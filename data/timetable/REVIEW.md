# Reviewed timetable snapshot

The downloaded local PDFs are the source evidence. They are preserved in `source-pdfs/`, and all 25 CSVs are preserved byte-for-byte in `source/`. No live timetable API is involved. The snapshot describes these publications, rather than a claim that every listed bus still operates today.

## Repeat the import

From the repository root:

```powershell
npm run timetable:import
```

To read the user's original CSV directory instead:

```powershell
npm run timetable:import -- --csv-dir "C:\Users\Tushar\Desktop\buses\csv"
```

The npm command uses the committed inputs and extracted PDF evidence. The underlying importer also accepts an external directory:

```powershell
python scripts/import-timetables.py --csv-dir "C:\Users\Tushar\Desktop\buses\csv"
npx tsx scripts/report-timetables.ts
```

To regenerate the geometric PDF extraction, first install `scripts/requirements-timetables.txt`, then run:

```powershell
python -m pip install -r scripts/requirements-timetables.txt
python scripts/extract-timetable-pdfs.py --pdf-dir "C:\Users\Tushar\Desktop\buses"
npm run timetable:import
```

For changed originals, replace the corresponding committed PDF as well: the importer checks each PDF's SHA-256 against its extraction and refuses stale evidence. The expected input total of 20,195 is a deliberate guard; source updates require reviewing that accounting assertion.

## Artifacts and provenance

- `audit.json`: every input row, raw ordered values, all raw fields (including undisplayed fields), CSV filename/record, source PDF, printed serial when present, verified PDF page/table/row, original PDF fields, layout repairs, corrections and review reasons. A CSV record number starts at 1 after the header; it is not a physical text line number.
- `pdf-extracts/`: all 732 PDF pages, original extracted text, table cells and geometric cell bounds. PDF page references are 1-based file page numbers.
- `reconciliation.json` and `RECONCILIATION.md`: per-file totals, withheld rows, via parsing review, repeated descriptions, recovery counts and source hashes.
- `legacy-coverage.json`: comparisons against the previous 1,563 app records. All four disappearing labels are explained: two marked temporarily closed and two old To/Via column errors. The old row with a blank destination was never a valid searchable route and is excluded from that route-label comparison.
- `review/place-rules.json`: reviewed aliases, city membership, via overrides and unresolved tokens. `review/alias-evidence.json` supplies local source references for occurrences of the reviewed spellings. Canonical IDs are stable slugs; preserve an existing ID and its aliases when evolving a place's display name.
- `src/data/timetable.json`: one versioned runtime snapshot, using column tuples to keep repeated labels out of the browser payload. `src/lib/timetable.ts` decodes it. The full audit and extraction are excluded from the browser bundle.

## Source conventions reviewed

CSV columns are mapped by normalized header meaning, never position. The importer accepts singular/plural service days, stand-name variants and serial-number variants; missing service/operator/day values stay blank. All raw headers/values survive independently of the displayed fields. `file_name` supplies provenance. Ambala's absent provenance column is explicitly mapped to `ambala.pdf`.

The source publication, operating depot and published boarding point are different fields. Explicit row depots are retained and abbreviations such as GGM/CHD/YNR are resolved. Missing row depots use the downloaded PDF's depot title, recorded as `depotSource: filename`; Bhiwani and genuinely blank Gurugram entries follow this rule. Bhiwani's Bhiwani/Tosham/Loharu stands remain separate boarding towns. In the Panipat and Fatehabad stand timetables, the stand identifies the published departure point even when From describes the route's starting city. Panchkula's `Private Bus`/`Electric Bus` cells are service labels, so its printed From supplies the boarding town.

PDFs with continuing tables retain their established printed column headers. Specific reviewed layout repairs are implemented explicitly, with original cells preserved:

- **Delhi (ISBT Delhi) Depot.pdf p.1** identifies Kashmiri Gate in its title. Its ISBT Delhi labels resolve to that terminal. **delhi.pdf p.1–3** identifies Kashmiri Gate, Sarai Kale Khan and Anand Vihar separately. SKK stays distinct from Kashmiri Gate. The old `ISBT DelhiAm` origin was text spilling from the adjacent Ambala via cell (ISBT PDF p.22); its exact legacy URL alias now resolves to Kashmiri Gate.
- **ISBT PDF p.6, serial 59**: Delhi → Katra, 00:40, explicitly via Ambala–Ludhiana–Jalandhar–Pathankot. Ludhiana is an intermediate destination; 00:40 remains the Delhi departure. No Ludhiana boarding/arrival time is inferred.
- **ISBT PDF p.30–35**: on the affected Jaipur rows, destination/time/depot move to the last three printed columns and service/operator/day cells are empty. The importer uses that verified layout and leaves those unavailable fields blank. P.49–51 have overprinted via text crossing into the destination: the separately printed route-name cell establishes the actual endpoint.
- **Gurugram.pdf p.4–6**: the depot ruling merges multiple depot strings; later depot labels sit outside the main table. The printed departure line establishes the individual depot. Blank lines fall back to Gurugram; the accumulated compound CSV depot is not assigned as a depot name.
- **ambala.pdf p.22 and p.76**: visually confirmed merged origin and Kalpi destination cells are repaired per printed row. **Fatehabad .pdf p.12, p.14, p.20**, serials 353/354/392/580, have several fields merged into a single geometric cell; their separate printed row values are restored.
- **Jind.pdf** has merged header labels; its eight printed columns retain Depot/From/To/Via/Time/Service/Operator/Days meaning. P.27–28 contain adjacent-cell text overprint. **Sirsa Depot.pdf** has Dabwali depot text crossing the origin cell; the printed sub-depot and Dabwali origin are retained separately.
- **KAITHAL.pdf** uses hyphens in time cells, and **bhiwani.pdf** uses percent separators in the Loharu time column. **Sonipat Depot.pdf** has `07%20`. These are normalized only after linking the time to the PDF's departure column. Midnight `24:00:00` becomes `00:00`, with the original retained. Bhiwani p.7's `09:l5` becomes `09:15`. The genuinely malformed `14L:40`, `19.Okt` and unpublished `-` remain withheld.
- **Charkhi Dadri.pdf p.8–9** prints To before Via: Narnaul via M/G and Chandigarh via road 152D were swapped by the previous app's positional conversion. 152D/KMP/KMPE are road labels, not intermediate places. M/G remains an unresolved abbreviation. `LOCAL`, `HR`, absent endpoints, unexpanded DK Delhi, conditional destinations and temporarily closed services are retained for review instead of becoming place suggestions.

## Place and via rules

Display names, URL IDs, autocomplete and result labels share the registry. Case and whitespace normalize consistently; reviewed spellings such as Ludhiyana/Ludiyana/Ludiana/Ludihana map to Ludhiana. Terminal IDs remain separate. A city-wide Delhi query includes verified Delhi terminals while each service displays its actual published boarding point.

Comma-separated and reviewed hyphen-separated via chains become exact place IDs. Multiword names stay intact; no substring or space-based splitting is used. Known single hyphenated places such as Kala-Amb, Raipur-Rani and Kheri-Chopta are handled as single places, and Sector-43 is protected during parsing. Ambiguous slash expressions/abbreviations are retained in the review queue. Only separately reviewed clear segments are exposed from ambiguous strings. Via stops never create origins or arrival times without a corresponding source departure record.

Matching route/time/operator descriptions do not establish duplicate services. Repeated descriptions remain separately traceable; no duplicates have been confirmed or merged. No extra PDF service rows were recovered after the complete CSV/PDF reconciliation. Future recoveries and duplicate confirmations must preserve every source reference and appear separately from CSV-input accounting.

## Verification

```powershell
npm test
npm run build
npx tsc --noEmit -p tsconfig.app.json
npm run dev
python scripts/verify-timetable-browser.py
python scripts/verify-timetable-browser.py --base-url "https://<vercel-preview>" --output data/timetable/verification-preview.json
```

Browser verification requires Python Playwright and installed Chrome. It checks the mobile flow, aliases and ISBT terminal suggestions, all required routes, direct/legacy visits, refresh, canonical URLs and rejection of a via-only origin. Generated verification files record the URL tested. The Vercel Preview link and final status are recorded in the PR.
