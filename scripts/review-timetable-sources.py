"""Check approved official index entries and stage changed PDFs outside the reviewed inputs."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


DATA = Path('data/timetable')
OUTPUT = Path('.tools/source-review')
MAX_BYTES = 25 * 1024 * 1024


def approved(url):
    link = urlsplit(url)
    return (link.scheme == 'https' and link.username is None and link.netloc in {
        'hartrans.gov.in', 'cdnbbsr.s3waas.gov.in'
    })


class ApprovedRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not approved(newurl):
            raise ValueError(f'Unapproved redirect: {newurl}')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url):
    if not approved(url):
        raise ValueError(f'Unapproved official URL: {url}')
    request = Request(url, headers={'User-Agent': 'HaryanaBus timetable source review'})
    with build_opener(ApprovedRedirects()).open(request, timeout=20) as response:
        payload = response.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise ValueError(f'Official download exceeds {MAX_BYTES} bytes')
    return payload


class OfficialIndex(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.links = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        label = attrs.get('aria-label', '')
        href = attrs.get('href', '')
        if tag == 'a' and label.startswith('View, ') and ' PDF ' in label and href.endswith('.pdf'):
            title = label.removeprefix('View, ').split(' PDF ', 1)[0]
            self.links.setdefault(title, set()).add(href)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', action='store_true', help='Save changed PDFs in .tools/source-review for reconciliation')
    args = parser.parse_args()
    inventory = json.loads(Path('.tools/generated/route-inventory.json').read_text(encoding='utf-8'))
    reconciliation = json.loads((DATA / 'reconciliation.json').read_text(encoding='utf-8'))
    versions = json.loads((DATA / 'review/documents.json').read_text(encoding='utf-8'))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    indexes, errors = {}, {}
    for url in sorted({versions[pdf['sha256']]['officialIndex'] for pdf in reconciliation['pdfs']}):
        try:
            indexes[url] = OfficialIndex(download(url).decode('utf-8')).links
        except (OSError, ValueError) as error:
            errors[url] = str(error)

    def check(pdf):
        archive_hash = pdf['sha256']
        version = versions[archive_hash]
        index = version['officialIndex']
        affected = [candidate for candidate in inventory['candidates']
                    if any(doc['sha256'] == archive_hash for doc in candidate['documents'])]
        result = {'file': version['file'], 'archiveSha256': archive_hash, 'officialIndex': index,
                  'previousOfficialUrl': version['officialUrl'], 'previousOfficialSha256': version['officialSha256'],
                  'affectedCandidateIds': [candidate['id'] for candidate in affected],
                  'affectedPublicJourneys': [candidate['path'] for candidate in affected
                                             if candidate['publication'] != 'withheld']}
        try:
            if index in errors:
                raise ValueError(errors[index])
            links = indexes[index].get(version['indexTitle'], set())
            if len(links) != 1:
                raise ValueError(f'Expected one link for {version["indexTitle"]}, found {len(links)}')
            url = next(iter(links))
            payload = download(url)
            if not payload.startswith(b'%PDF-'):
                raise ValueError('Official URL did not return a PDF')
            digest = hashlib.sha256(payload).hexdigest()
            changed = url != version['officialUrl'] or digest != version['officialSha256']
            result.update(officialUrl=url, officialSha256=digest, archiveMatches=digest == archive_hash,
                          status='review-required' if changed else 'unchanged-since-check')
            if args.stage and digest != archive_hash:
                staged = OUTPUT / f'{Path(version["file"]).stem}-{digest[:12]}.pdf'
                staged.write_bytes(payload)
                result['stagedFile'] = str(staged)
        except (OSError, ValueError) as error:
            result.update(status='check-failed', error=str(error))
        return result

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, reconciliation['pdfs']))
    report = {'checkedAtUtc': datetime.now(timezone.utc).isoformat(), 'snapshotId': inventory['snapshotId'],
              'checkMethod': 'Official index link and downloaded PDF SHA-256', 'documents': results}
    path = OUTPUT / 'report.json'
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    for result in results:
        if result['status'] != 'unchanged-since-check' or not result.get('archiveMatches'):
            print(f'{result["file"]}: {result["status"]}; {len(result["affectedPublicJourneys"])} affected public journeys')
    failures = sum(result['status'] == 'check-failed' for result in results)
    print(f'Checked {len(results)} documents, with {failures} failed checks. Report: {path}')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
