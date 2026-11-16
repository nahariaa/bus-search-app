import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { matchRoutes, buildSearchUrl, routeMatchLabel } from '../src/lib/route-matching';
import { routePages, routeManifest, validateRouteManifest } from '../src/lib/route-pages';
import { snapshotId } from '../src/lib/timetable';
import { operatorLabel } from '../src/lib/route-label';
import { routeInventory } from './route-inventory';
import { routeConflicts } from '../src/lib/timetable-evidence';

const report = JSON.parse(readFileSync('dist/generated-pages.json', 'utf8'));
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[char]!);

test('every static journey has exactly the shared matcher records and displayed facts', () => {
  assert.equal(report.snapshotId, snapshotId);
  assert.equal(report.journeys.length, routeManifest.length);
  for (const journey of routePages) {
    const matched = matchRoutes(journey.fromId, journey.toId);
    const output = report.journeys.find((item: { path: string }) => item.path === journey.path);
    assert.deepEqual(output.serviceIds, matched.map(service => service.id));
    const html = readFileSync(`dist${journey.path}.html`, 'utf8');
    assert.deepEqual([...html.matchAll(/data-service-id="([^"]+)"/g)].map(match => match[1]), matched.map(service => service.id));
    assert.ok(html.includes(escape(buildSearchUrl(journey.fromId, journey.toId))));
    const cards = html.split('data-service-id="').slice(1);
    matched.forEach((service, index) => {
      // React may insert comment boundaries between text nodes.
      const card = cards[index].replace(/<!--.*?-->/g, '');
      for (const fact of [service.id, service.departureTime, service.from, service.to, service.typeOfService || 'Service type not published',
        operatorLabel(service.operator), service.serviceDays.join(', ') || 'Days not published', service.sourceTimetable, service.operatingDepot || 'Not published',
        `PDF page ${service.pdfPage}`, ...service.sourceRefs, ...(service.matchedVia ? [routeMatchLabel(service)] : [])]) {
        assert.ok(card.includes(escape(fact)), `${journey.path}: missing ${fact} on ${service.id}`);
      }
      if (service.via) assert.ok(card.includes(escape(service.via)));
      const source = journey.sources.find(document => document.file === service.sourceTimetable)!;
      if (source.versionStatus === 'byte-match') assert.ok(card.includes(`${source.officialUrl}#page=${service.pdfPage}`));
      if (source.versionStatus === 'different-version') {
        assert.ok(card.includes('archived PDF page') && card.includes(`href="${source.officialUrl}"`));
        assert.ok(!card.includes(`${source.officialUrl}#page=`));
      }
    });
  }
});

test('selection fails clearly for unsupported journeys, invalid IDs and duplicate slugs or pairs', () => {
  const first = routeManifest[0];
  for (const selections of [
    [{ ...first, fromId: 'yamunanagar', toId: 'shahabad' }],
    [{ ...first, fromId: 'not-a-place' }],
    [{ ...first, fromId: 'singhu-border' }],
    [{ ...first, fromId: 'ISBTDelhi' }],
    [{ ...first, toId: first.fromId }],
    [{ ...first, toId: 'isbt-kashmiri-gate-delhi' }],
    [{ ...first, reason: '' }],
    [{ ...first, slug: '../escape' }],
    [first, first],
    [first, { ...first, slug: 'duplicate-pair' }],
  ]) assert.throws(() => validateRouteManifest(selections), /Invalid static journey|no supported departures/);
});

test('inventory keeps an explicit allowlist and records review status for other matcher pairs', () => {
  const inventory = routeInventory();
  assert.deepEqual(JSON.parse(readFileSync('.tools/generated/route-inventory.json', 'utf8')), inventory);
  const selected = inventory.candidates.filter(candidate => candidate.publication !== 'withheld');
  assert.equal(selected.filter(candidate => candidate.publication === 'existing').length, 11);
  assert.deepEqual(selected.filter(candidate => candidate.publication === 'selected-for-release').map(row => row.id), [
    'chandigarh:jind', 'gurugram:chandigarh', 'hisar:chandigarh', 'jind:chandigarh', 'jind:delhi',
    'rohtak:chandigarh', 'sirsa:chandigarh',
  ]);
  assert.ok(inventory.candidates.some(row => row.recordCount > 0 && row.publication === 'withheld'));
  assert.ok(inventory.candidates.some(row => row.recordCount === 0 && row.reviewStatus === 'withheld'));
  for (const row of selected) {
    assert.equal(row.recordCount, matchRoutes(row.fromId, row.toId).length);
    assert.equal(row.distinctDocumentCount, row.documents.length);
  }
});

test('Jind conflict retains source routing and Chandigarh reverse keeps actual terminals', () => {
  const conflict = routeConflicts.get('jind:chandigarh')!;
  assert.equal(conflict.status, 'unresolved');
  const outbound = routePages.find(row => row.slug === 'jind-to-chandigarh')!;
  const inbound = routePages.find(row => row.slug === 'chandigarh-to-jind')!;
  assert.deepEqual(outbound.services.filter(row => conflict.serviceIds.includes(row.id)).map(row => row.via),
    ['Kaithal', 'Kaithal', 'Kaithal']);
  assert.ok(outbound.services.some(row => operatorLabel(row.operator) === 'CTU'));
  assert.deepEqual([...new Set(inbound.services.map(row => row.fromId))].sort(),
    ['chandigarh', 'isbt-sector-17-chandigarh', 'isbt-sector-43-chandigarh']);
  assert.ok(inbound.services.some(row => row.from !== row.operatingDepot));
});

test('public PDF references identify the actual archive and distinguish the different Sirsa download', () => {
  const sources = new Map(routePages.flatMap(page => page.sources.map(source => [source.file, source] as const)));
  for (const [file, source] of sources) {
    const archive = readFileSync(`data/timetable/source-pdfs/${file}`);
    assert.equal(createHash('sha256').update(archive).digest('hex'), source.sha256);
    assert.equal(new URL(source.officialIndex).hostname, 'hartrans.gov.in');
    assert.equal(new URL(source.officialUrl).hostname, 'cdnbbsr.s3waas.gov.in');
  }
  assert.equal(sources.get('Jind.pdf')?.versionStatus, 'byte-match');
  assert.equal(sources.get('Sirsa Depot.pdf')?.versionStatus, 'different-version');
});

test('Delhi to Ludhiana static regression retains 00:40 at Kashmiri Gate towards Katra', () => {
  const route = routePages.find(journey => journey.slug === 'delhi-to-ludhiana')!;
  const katra = route.services.find(service => service.id === 'delhi_isbt_delhi_depot_bus_schedule:59')!;
  assert.equal(katra.departureTime, '00:40');
  assert.equal(katra.fromId, 'isbt-kashmiri-gate-delhi');
  assert.equal(katra.toId, 'katra');
  assert.equal(katra.matchedVia, 'Ludhiana');
});

test('hydration payloads are exactly the build matcher output and startup excludes search data', () => {
  for (const journey of routePages) {
    const html = readFileSync(`dist${journey.path}.html`, 'utf8');
    const payload = html.match(/<script id="page-journey" type="application\/json">(.*?)<\/script>/s)![1];
    assert.deepEqual(JSON.parse(payload), journey);
    assert.deepEqual(JSON.parse(readFileSync(`.tools/generated/routes/${journey.slug}.json`, 'utf8')), journey);
  }
  const main = readdirSync('dist/assets').find(name => /^index-.*\.js$/.test(name))!;
  const code = readFileSync(`dist/assets/${main}`, 'utf8');
  assert.ok(!code.includes('ambala_bus_schedule:1'), 'full snapshot leaked into startup');
  assert.ok(!code.includes('Invalid static journey selection'), 'build validation leaked into startup');
  assert.ok(!code.includes('editorial-review-pending'), 'candidate inventory leaked into startup');
  assert.ok(!code.includes('pdfLayoutRepairs'), 'audit leaked into startup');
  for (const file of ['index.html', 'about.html', 'privacy.html', 'routes.html', 'cities/jind.html', 'cities/chandigarh.html']) {
    assert.ok(!readFileSync(`dist/${file}`, 'utf8').includes('page-journey'));
  }
});
