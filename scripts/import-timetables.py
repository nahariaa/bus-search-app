"""Deterministic, lossless CSV/PDF reconciliation. Uses only the Python standard library.

PDF extraction is a separate, reproducible step. Never infer a boarding time at a via stop.
"""
import argparse
import collections
import csv
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/timetable'


def clean(value):
    return re.sub(r'\s+', ' ', value or '').strip()


def key(value):
    return clean(value).lower()


def compact(value):
    return re.sub(r'[^a-z0-9]', '', key(value))


HEADERS = {
    'depot': 'depot', 'depotname': 'depot', 'nameofdepot': 'depot',
    'from': 'from', 'to': 'to', 'via': 'via', 'departuretime': 'time', 'departure': 'time', 'departtime': 'time', 'time': 'time',
    'typeofservice': 'service', 'typeof': 'service', 'service': 'service', 'operator': 'operator', 'operater': 'operator', 'oprator': 'operator',
    'serviceday': 'days', 'servicedays': 'days', 'busstand': 'stand', 'busstandname': 'stand',
    'srno': 'serial', 'sno': 'serial', 'routename': 'routeName', 'filename': 'pdf',
}


def header(value):
    v = compact(value)
    # Bhiwani prints the stand's name in the header itself.
    return 'stand' if v.startswith('busstandbhiwani') else HEADERS.get(v, '')


def fields(raw):
    result = {}
    for name, value in raw.items():
        field = header(name)
        if field:
            if field in result:
                raise ValueError(f'Conflicting normalized headers: {name}')
            result[field] = clean(value)
    return result


def normalized_time(value):
    # Separators are accepted only after linking the value to its PDF row.
    match = re.fullmatch(r'(\d{1,2})[:.;%\-](\d{2})(?::00)?(?:\s*\([^)]*\))?', clean(value).lstrip('`'))
    if not match:
        return ''
    h, m = map(int, match.groups())
    if h == 24 and m == 0:
        return '00:00'
    return f'{h:02}:{m:02}' if h < 24 and m < 60 else ''


def source_depot_valid(value):
    return bool(value) and len(value.split()) <= 4 and not re.search(r'\b(?:GGM|Jind|Jhajjar|Rohtak)\s+(?:GGM|Jind|Jhajjar|Rohtak)\b', value, re.I)


def write_json(path, value, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2 if pretty else None,
                               separators=None if pretty else (',', ':')) + '\n', encoding='utf-8')


def read_pdf_rows(extract):
    """Map geometric PDF columns by their printed headers, carrying continuation headers.

    Gurugram's depot ruling disappears after page 4; the remaining seven columns
    are explicitly From/To/Via/Time/Service/Operator/Days, never shifted depot data.
    """
    schemas = {}
    result, unparsed = [], []
    for page in extract['pages']:
        for ti, table in enumerate(page['tables'], 1):
            for ri, cells in enumerate(table['rows'], 1):
                mapped = [header(c) for c in cells]
                if 'from' in mapped and 'to' in mapped and 'time' in mapped:
                    schemas[len(cells)] = mapped
                    continue
                schema = schemas.get(len(cells))
                if extract['file'] == 'Jind.pdf' and len(cells) == 8:
                    schema = ['depot', 'from', 'to', 'via', 'time', 'service', 'operator', 'days']
                if extract['file'] == 'Gurugram.pdf' and len(cells) == 7:
                    schema = ['from', 'to', 'via', 'time', 'service', 'operator', 'days']
                # On these printed rows the destination/time/depot occupy the last
                # three columns; the service/operator/day columns are empty.
                if (extract['file'] == 'Delhi (ISBT Delhi) Depot.pdf' and len(cells) == 11
                        and normalized_time(cells[9]) and not normalized_time(cells[6])):
                    schema = ['serial', 'stand', 'routeName', 'from', 'via', '', '', '', 'to', 'time', 'depot']
                ref = {'pdf': extract['file'], 'page': page['page'], 'table': ti, 'row': ri}
                if not schema:
                    if any(normalized_time(c) for c in cells):
                        unparsed.append({**ref, 'cells': cells, 'reason': 'PDF column header not established'})
                    continue
                f = {h: clean(v) for h, v in zip(schema, cells) if h}
                original_fields = dict(f)
                # Reviewed source layout repairs; originals remain in the extract.
                if extract['file'] == 'ambala.pdf':
                    if page['page'] == 22 and ri in [17, 18]:
                        f['from'] = 'AMBALA CANTT'
                    if page['page'] == 76 and 4 <= ri <= 10:
                        f['to'] = 'KALPI'
                if extract['file'] == 'bhiwani.pdf' and page['page'] == 7 and ri == 36:
                    f['time'] = '09:15'  # printed 09:l5 in the source time column
                if extract['file'] == 'Delhi (ISBT Delhi) Depot.pdf':
                    if f.get('to') == 'tChandigarh':
                        f['to'] = 'Chandigarh'
                    if 49 <= page['page'] <= 51 and f.get('routeName'):
                        f['to'] = f['routeName']
                if extract['file'] == 'Gurugram.pdf' and f.get('from') == 'aGdurugram':
                    f['from'] = 'Gurugram'
                if extract['file'] == 'Jind.pdf':
                    f['via'] = {'Bmadli': 'Badli', 'Jmhajjar': 'Jhajjar', 'rRgoahtak': 'Rohtak',
                                'aPATIALA': 'PATIALA', 'akaithal': 'Kaithal'}.get(f.get('via'), f.get('via', ''))
                if extract['file'] == 'Fatehabad .pdf' and f.get('serial') in ['353', '354', '392', '580']:
                    replacements = {
                        '353': {'stand': 'Fatehabad', 'routeName': 'Delhi to Firozpur', 'from': 'Delhi', 'to': 'Firojpur', 'via': 'Sirsa', 'time': '08:45'},
                        '354': {'stand': 'Fatehabad', 'routeName': 'Delhi to Zalalabad', 'from': 'Delhi', 'to': 'Zalalabad', 'via': 'Sirsa', 'time': '08:55'},
                        '392': {'stand': 'Fatehabad', 'routeName': 'Hanumangarh to Delhi', 'from': 'Hanumangarh', 'to': 'Delhi', 'via': 'Fatehabad', 'time': '14:45'},
                        '580': {'stand': 'Tohana', 'routeName': 'Tohana to Hisar', 'from': 'Tohana', 'to': 'Hisar', 'via': 'Barwala', 'time': '08:26'},
                    }
                    f.update(replacements[f['serial']])
                if extract['file'] == 'karnal.pdf':
                    f['time'] = re.sub(r'^Time\s+', '', f.get('time', ''))
                    f['service'] = re.sub(r'^Service\s+', '', f.get('service', ''))
                # The Dabwali depot text overprints the next cell. The page image
                # and the printed sub-depot heading establish both names.
                if extract['file'] == 'Sirsa Depot.pdf' and f.get('depot', '').startswith('Sub Depot Dab'):
                    f['depot'] = 'Sub Depot Dabwali'
                    if compact(f.get('from', '')) in ['wdaabwali', 'wdabwali', 'dabwali']:
                        f['from'] = 'Dabwali'
                if not f.get('from') and not f.get('to') and not f.get('time'):
                    continue
                if key(f.get('from', '')).startswith('route') or compact(f.get('time', '')) == 'departuretime':
                    continue
                if (not f.get('time') and not (f.get('from') and f.get('to'))) or (not normalized_time(f.get('time', '')) and not f.get('from')):
                    continue
                # Printed Gurugram depot values occupy a vertically merged cell.
                # Read the depot text on the same printed line as the departure.
                if extract['file'] == 'Gurugram.pdf':
                    lines = [line for line in page['text'].splitlines()
                             if compact(f.get('time', '')) in compact(line)
                             and compact(f.get('to', '')) in compact(line)
                             and 'gurugram' in key(line)]
                    candidates = []
                    for line in lines:
                        m = re.match(r'^\s*(.*?)\s*Gurugram\s+', line, re.I)
                        if m:
                            candidates.append(clean(m.group(1)))
                    if len(set(candidates)) == 1:
                        f['depot'] = candidates[0]
                    else:
                        f['depot'] = ''
                result.append({'ref': ref, 'fields': f, 'originalFields': original_fields, 'cells': cells})
    return result, unparsed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv-dir', type=Path, default=DATA / 'source')
    args = parser.parse_args()
    rules = json.loads((DATA / 'review/place-rules.json').read_text(encoding='utf-8'))
    aliases = {key(k): v for k, v in rules['aliases'].items()}
    registry = {}

    def place(value):
        value = clean(value)
        if not value:
            return ''
        display = aliases.get(key(value), value.title())
        # Canonical spellings remain stable regardless of input row order/case.
        display = aliases.get(key(display), display)
        pid = re.sub(r'[^a-z0-9]+', '-', key(display)).strip('-')
        if pid not in registry:
            registry[pid] = {'id': pid, 'name': display, 'aliases': [], 'members': []}
        if value not in registry[pid]['aliases']:
            registry[pid]['aliases'].append(value)
        return pid

    for alias, display in aliases.items():
        place(alias)
        place(display)
    for city, members in rules['cityMembers'].items():
        city_id = place(city)
        registry[city_id]['members'] = [place(member) for member in members]

    def via_places(value):
        value = clean(value)
        if key(value) in {key(v) for v in rules['nonStopVia']}:
            return [], ''
        if key(value) in {key(v) for v in rules['unresolvedVia']} or '/' in value:
            partial = next((v for k, v in rules.get('viaPartial', {}).items() if key(k) == key(value)), [])
            if not partial and ',' in value:
                partial = [s for s in value.split(',') if '/' not in s and key(s) not in {key(v) for v in rules['unresolvedVia']}]
            return [place(s) for s in partial], 'Ambiguous via abbreviation or alternate path: ' + value
        override = next((v for k, v in rules['viaOverrides'].items() if key(k) == key(value)), None)
        if key(value) in aliases:
            return [place(value)], ''
        protected = re.sub(r'((?:sec|sector))-\s*(\d+)', r'\1~\2', value, flags=re.I)
        stops = override or [s.replace('~', '-') for s in re.split(r'\s*[,;-]\s*', re.sub(r'^via\s+', '', protected, flags=re.I)) if s]
        stops = [s for s in stops if key(s) not in {key(v) for v in rules['nonStopVia']}]
        ambiguous = [s for s in stops if key(s) in {key(v) for v in rules['unresolvedVia']}]
        if ambiguous:
            return [place(s) for s in stops if s not in ambiguous], 'Ambiguous via abbreviation or alternate path: ' + ', '.join(ambiguous)
        if any(not s or len(compact(s)) < 3 for s in stops):
            return [], 'Unresolved short via token: ' + value
        return list(dict.fromkeys(place(s) for s in stops)), ''

    extracts = {}
    pdf_index = {}
    pdf_unparsed = []
    manifest = []
    for path in sorted((DATA / 'pdf-extracts').glob('*.json'), key=lambda p: p.name.casefold()):
        extract = json.loads(path.read_text(encoding='utf-8'))
        pdf_path = DATA / 'source-pdfs' / extract['file']
        assert hashlib.sha256(pdf_path.read_bytes()).hexdigest() == extract['sha256'], f'Stale PDF extraction: {pdf_path}'
        rows, unparsed = read_pdf_rows(extract)
        extracts[extract['file']] = extract
        pdf_index[extract['file']] = rows
        pdf_unparsed.extend(unparsed)
        manifest.append({'pdf': extract['file'], 'sha256': extract['sha256'], 'pages': len(extract['pages']), 'parsedRows': len(rows)})
    assert len(extracts) == 25, 'Extract every original PDF first'

    audits, services, unresolved, recoveries, file_counts = [], [], [], [], []
    linked_pdf = set()
    lookup = {}
    for name, rows in pdf_index.items():
        for i, row in enumerate(rows):
            f = row['fields']
            lookup.setdefault((name, normalized_time(f.get('time', '')) or compact(f.get('time', ''))), []).append(i)

    def make_service(f, audit, pdf_row):
        issues = []
        corrections = []
        verified = dict(f)
        if pdf_row:
            pf = pdf_row['fields']
            audit['pdfFields'] = pdf_row['originalFields']
            audit['pdfLayoutRepairs'] = {k: v for k, v in pf.items() if v != pdf_row['originalFields'].get(k)}
            # Preserve CSV values; replace a nonempty value only when its PDF meaning is verified.
            for field in ['from', 'to', 'via', 'time', 'stand', 'depot']:
                if field == 'depot' and not pf.get(field) and source_depot_valid(f.get(field, '')):
                    continue
                if field in pf and compact(pf[field]) != compact(f.get(field, '')):
                    corrections.append({'field': field, 'original': f.get(field, ''), 'verified': pf[field], 'evidence': pdf_row['ref']})
                    verified[field] = pf[field]
        else:
            issues.append('CSV record could not be uniquely reconciled to a PDF table row')
        source_pdf = audit['sourcePdf']
        source_title = source_pdf[:-4].strip()
        if source_title == 'Delhi (ISBT Delhi) Depot':
            depot_title = 'Delhi'
        else:
            depot_title = re.sub(r'\s+Depot$', '', source_title, flags=re.I).title()
        depot_raw = verified.get('depot', '')
        if depot_raw and not source_depot_valid(depot_raw):
            issues.append('Compound depot cell requires PDF review')
            depot_raw = ''
        depot = registry[place(depot_raw or depot_title)]['name']
        stand = verified.get('stand', '')
        if key(stand) in ['private bus', 'electric bus']:
            stand = ''
        origin = stand or verified.get('from', '')
        # Bhiwani's stand header contains a label; the place itself is the named stand town.
        origin = re.sub(r'^bus\s*stand\s*,?\s*', '', origin, flags=re.I)
        origin = re.sub(r'\s+bus\s*stand$', '', origin, flags=re.I)
        destination = verified.get('to', '')
        inline_via = []
        for field, value in [('origin', origin), ('destination', destination)]:
            parts = re.split(r'\s+via\s+', value, maxsplit=1, flags=re.I)
            if len(parts) == 2:
                if field == 'origin':
                    origin = parts[0]
                else:
                    destination = parts[0]
                inline_via.append(parts[1])
                corrections.append({'field': field, 'original': value, 'verified': parts[0], 'explicitVia': parts[1], 'evidence': audit.get('pdfRef')})
        origin_id = place(origin)
        destination_id = place(destination)
        for original, pid in [(verified.get('to', ''), destination_id), (stand or verified.get('from', ''), origin_id)]:
            if pid and re.search(r'\s+via\s+', original, re.I):
                registry[pid]['aliases'].append(original)
        via_ids, via_issue = via_places(','.join([verified.get('via', ''), *inline_via]).strip(','))
        if via_issue:
            issues.append(via_issue)
        via_ids = [v for v in via_ids if v not in [origin_id, destination_id]]
        time = normalized_time(verified.get('time', '')) if pdf_row else ''
        if not origin_id or not destination_id:
            issues.append('Missing published endpoint in original PDF')
        if not time:
            issues.append('No valid published departure time in original PDF')
        for field in ['from', 'to']:
            if re.search(r't\.\s*closed', verified.get(field, ''), re.I):
                issues.append('Source marks service temporarily closed: ' + verified[field])
            if key(verified.get(field, '')) in {key(v) for v in rules['unresolvedEndpoints']}:
                issues.append('Conditional or ambiguous endpoint: ' + verified[field])
        audit.update({'verified': verified, 'corrections': corrections, 'issues': issues})
        fatal = [i for i in issues if not i.startswith(('Ambiguous via', 'Unresolved short via'))]
        if fatal:
            audit['status'] = 'review'
            unresolved.append({'id': audit['id'], 'sourcePdf': source_pdf, 'pdfRef': audit.get('pdfRef'), 'reasons': issues})
            return None
        audit['status'] = 'imported'
        return {
            'id': audit['id'], 'fromId': origin_id, 'toId': destination_id, 'viaIds': via_ids,
            'from': registry[origin_id]['name'], 'to': registry[destination_id]['name'],
            'via': ' · '.join(registry[v]['name'] for v in via_ids), 'departureTime': time,
            'typeOfService': verified.get('service', ''), 'operator': verified.get('operator', ''),
            'serviceDays': [verified['days']] if verified.get('days') else [],
            'sourceTimetable': source_pdf, 'operatingDepot': depot,
            'depotSource': 'row' if depot_raw else 'filename', 'boardingPoint': registry[origin_id]['name'],
            'sourceRefs': [audit['id']], 'pdfPage': audit['pdfRef']['page'],
        }

    for path in sorted(args.csv_dir.glob('*.csv')):
        if args.csv_dir.resolve() != (DATA / 'source').resolve():
            shutil.copyfile(path, DATA / 'source' / path.name)
        count = collections.Counter()
        with path.open(encoding='utf-8-sig', newline='') as stream:
            reader = csv.reader(stream)
            headers = next(reader)
            assert len(set(headers)) == len(headers), f'Duplicate raw headers in {path}'
            for record, values in enumerate(reader, 1):
                assert len(values) == len(headers), f'CSV width mismatch: {path}:{record}'
                raw = dict(zip(headers, values))
                f = fields(raw)
                pdf = f.get('pdf') or ('ambala.pdf' if path.name == 'ambala_bus_schedule.csv' else '')
                assert pdf in pdf_index, f'Unknown source PDF in {path}:{record}: {pdf}'
                audit = {'id': f'{path.stem}:{record}', 'csv': path.name, 'record': record,
                         'sourcePdf': pdf, 'raw': raw, 'rawValues': values, 'printedSerial': None}
                candidates = lookup.get((pdf, normalized_time(f.get('time', '')) or compact(f.get('time', ''))), [])
                scored = []
                for idx in candidates:
                    pf = pdf_index[pdf][idx]['fields']
                    # A shared time alone cannot establish a row's identity.
                    endpoint_matches = sum(compact(pf.get(k, '')) == compact(f.get(k, '')) for k in ['from', 'to'])
                    serial_match = bool(f.get('serial')) and f['serial'] == pf.get('serial')
                    if endpoint_matches < 2 and not serial_match:
                        continue
                    if not serial_match and compact(pf.get('via', '')) != compact(f.get('via', '')):
                        continue
                    score = sum(weight for field, weight in [('from', 6), ('to', 6), ('via', 4), ('operator', 2), ('serial', 8),
                                                             ('routeName', 3), ('stand', 2), ('depot', 1), ('service', 1), ('days', 1)]
                                if f.get(field) and compact(pf.get(field, '')) == compact(f.get(field, '')))
                    scored.append((score, idx))
                scored.sort(reverse=True)
                row = None
                if scored and scored[0][0] >= 12:
                    best = [idx for score, idx in scored if score == scored[0][0]]
                    unused = [idx for idx in best if (pdf, idx) not in linked_pdf]
                    # Identical repeated PDF rows can be linked in printed order, but never merged as services.
                    core = lambda i: {k: compact(v) for k, v in pdf_index[pdf][i]['fields'].items() if k != 'serial'}
                    if len(best) == 1 or all(core(i) == core(best[0]) for i in best):
                        idx = min(unused or best)
                        row = pdf_index[pdf][idx]
                        linked_pdf.add((pdf, idx))
                        audit['pdfRef'] = row['ref']
                        audit['printedSerial'] = row['fields'].get('serial') or None
                service = make_service(f, audit, row)
                if service:
                    services.append(service)
                audits.append(audit)
                count[audit['status']] += 1
                count['input'] += 1
        file_counts.append({'csv': path.name, **count, 'confirmedDuplicates': 0, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

    # Recovered PDF rows are separate from the 20,195 input-row accounting.
    for pdf, rows in pdf_index.items():
        for idx, row in enumerate(rows):
            if (pdf, idx) in linked_pdf:
                continue
            f = row['fields']
            audit = {'id': f"pdf:{pdf}:{row['ref']['page']}:{row['ref']['table']}:{row['ref']['row']}",
                     'csv': None, 'record': None, 'sourcePdf': pdf, 'raw': dict(f), 'rawPdfCells': row['cells'],
                     'printedSerial': f.get('serial') or None, 'pdfRef': row['ref']}
            # A missing link may be a changed extraction; quarantine until reviewed, rather than publish a duplicate.
            audit.update({'status': 'review', 'issues': ['PDF row not linked to a CSV record; recovery review required']})
            recoveries.append(audit)

    assert sum(c['input'] for c in file_counts) == 20195, 'Unexpected input count: reconcile source changes explicitly'
    repeats = collections.defaultdict(list)
    for service in services:
        signature = json.dumps([service[k] for k in ['fromId', 'toId', 'viaIds', 'departureTime', 'typeOfService', 'operator', 'serviceDays', 'operatingDepot']], sort_keys=True)
        repeats[signature].append(service['id'])
    duplicate_candidates = [ids for ids in repeats.values() if len(ids) > 1]
    write_json(DATA / 'review/repeated-service-candidates.json', duplicate_candidates, True)
    for entry in registry.values():
        entry['aliases'] = sorted(set(entry['aliases']), key=lambda a: (key(a), a))
    evidence_index = collections.defaultdict(list)
    for audit in audits:
        if audit.get('pdfRef'):
            for value in {*audit['raw'].values(), *audit['verified'].values()}:
                if len(evidence_index[key(value)]) < 12:
                    evidence_index[key(value)].append(audit['pdfRef'])
    alias_evidence = [{'alias': alias, 'canonical': canonical, 'sourceRows': evidence_index[alias]}
                      for alias, canonical in aliases.items()]
    write_json(DATA / 'review/alias-evidence.json', alias_evidence, True)
    columns = ['id', 'fromId', 'toId', 'viaIds', 'departureTime', 'typeOfService', 'operator', 'serviceDays',
               'sourceTimetable', 'operatingDepot', 'depotSource', 'pdfPage', 'sourceRefs']
    snapshot = {'version': 1, 'places': sorted(registry.values(), key=lambda p: p['id']),
                'columns': columns, 'services': [[s[c] for c in columns] for s in services]}
    snapshot_hash = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()
    snapshot['id'] = snapshot_hash
    # Keep the large audit trail outside the browser bundle.
    write_json(ROOT / 'src/data/timetable.json', snapshot)
    write_json(DATA / 'audit.json', audits)
    write_json(DATA / 'reconciliation.json', {'snapshotId': snapshot_hash, 'inputRows': len(audits), 'files': file_counts,
               'pdfs': manifest, 'searchableServices': len(services), 'unresolvedRows': unresolved,
               'pdfRecoveryCandidates': recoveries, 'recoveredServices': 0, 'unparsedPdfRows': pdf_unparsed,
               'repeatedServiceGroups': len(duplicate_candidates), 'confirmedDuplicateServices': 0,
               'viaReview': [{'id': a['id'], 'pdfRef': a.get('pdfRef'), 'reasons': [i for i in a['issues'] if 'via' in i.lower()]} for a in audits if any('via' in i.lower() for i in a['issues'])]}, True)
    print(json.dumps({'inputRows': len(audits), 'searchable': len(services), 'review': len(unresolved),
                      'pdfRecoveryCandidates': len(recoveries), 'unparsedPdfRows': len(pdf_unparsed)}, indent=2))


if __name__ == '__main__':
    main()
