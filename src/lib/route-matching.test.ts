import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { busRoutes, type BusRoute } from './bus-routes';
import { boardingPoints, buildSearchUrl, destinationsFrom, locationKey, matchRoutes, placeSuggestions, routeMatchLabel, timetablePairs } from './route-matching';
import { canonicalPlaceName, places, snapshotId } from './timetable';

test('Delhi to Ludhiana includes terminating services and the 00:40 Katra service', () => {
  const routes = matchRoutes('Delhi', 'Ludhiana');
  assert.ok(routes.some(route => route.to === 'Ludhiana' && route.departureTime === '00:30'));
  const katra = routes.find(route => route.to === 'Katra' && route.departureTime === '00:40');
  assert.ok(katra);
  assert.equal(katra.from, 'ISBT Kashmiri Gate, Delhi');
  assert.equal(katra.pdfPage, 6);
  assert.equal(routeMatchLabel(katra), 'Towards Katra · via Ludhiana');
  assert.ok(destinationsFrom('Delhi').includes('Ludhiana'));
});

test('Bhiwani imports verified Delhi departures and offers Rohtak via services', () => {
  const delhi = matchRoutes('Bhiwani', 'Delhi');
  assert.ok(delhi.some(route => route.departureTime === '05:00' && route.sourceTimetable === 'bhiwani.pdf'));
  assert.ok(delhi.every(route => route.operatingDepot));
  assert.ok(matchRoutes('Bhiwani', 'Rohtak').some(route => route.to === 'Delhi' && route.matchedVia === 'Rohtak'));
  assert.ok(destinationsFrom('Bhiwani').includes('Rohtak'));
});

test('mixed-case, whitespace, spelling variants and stable ID URLs resolve identically', () => {
  assert.deepEqual(matchRoutes('  dElHi  ', ' LUDHIYANA '), matchRoutes('delhi', 'ludhiana'));
  assert.deepEqual(matchRoutes('ISBTDelhi', 'Ludhiana'), matchRoutes('ISBT Kashmiri Gate', 'Ludhiana'));
  assert.deepEqual(matchRoutes('Gurgaon', 'Delhi'), matchRoutes('Gurugram', 'Delhi'));
  assert.equal(canonicalPlaceName('DELHI'), 'Delhi');
  assert.equal(buildSearchUrl('ISBTDelhi', 'Ludhiyana'), '/search?from=isbt-kashmiri-gate-delhi&to=ludhiana');
});

test('ISBT suggestions show each terminal once, keeping the three Delhi terminals distinct', () => {
  const suggestions = placeSuggestions('isbt', boardingPoints());
  const delhi = suggestions.filter(name => name.endsWith(', Delhi'));
  assert.deepEqual(delhi.sort(), ['ISBT Anand Vihar, Delhi', 'ISBT Kashmiri Gate, Delhi', 'ISBT Sarai Kale Khan, Delhi']);
  assert.equal(suggestions.length, new Set(suggestions).size);
  assert.notEqual(locationKey('Delhi'), locationKey('ISBT Delhi'));
  assert.notEqual(locationKey('SKK Delhi'), locationKey('ISBT Delhi'));
  assert.notEqual(locationKey('ISBT Anand Vihar'), locationKey('ISBT Delhi'));
  assert.deepEqual(matchRoutes('ISBT DelhiAm', 'Ludhiana'), matchRoutes('ISBT Delhi', 'Ludhiana'));
  assert.equal(matchRoutes('ISBT Delhi Unknown', 'Ludhiana').length, 0);
  assert.equal(matchRoutes('Delhi', 'Ludh').length, 0);
});

test('via stops cannot become origins or imply arrival times without a published departure', () => {
  const katra = busRoutes.find(route => route.to === 'Katra' && route.departureTime === '00:40');
  assert.ok(katra);
  assert.equal(matchRoutes('Ludhiana', 'Katra', [katra]).length, 0);
  assert.ok(!boardingPoints([katra]).includes('Ludhiana'));
  assert.ok(!('arrivalTime' in katra));
  const origins = new Set(boardingPoints());
  const viaOnly = places.find(place => busRoutes.some(route => route.viaIds.includes(place.id)) && !origins.has(place.name));
  assert.ok(viaOnly);
  assert.equal(matchRoutes(viaOnly.name).length, 0);
  const broken: BusRoute = { ...katra, departureTime: '25:99' };
  assert.deepEqual(boardingPoints([broken]), []);
  assert.deepEqual(matchRoutes('', 'Ludhiana'), []);
  assert.deepEqual(matchRoutes('Delhi', ''), []);
});

test('road labels and ambiguous abbreviations do not become places, and hyphenated places stay whole', () => {
  assert.ok(!destinationsFrom('Charkhi Dadri').includes('152D'));
  assert.equal(matchRoutes('Charkhi Dadri', 'M/G').length, 0);
  assert.ok(busRoutes.some(route => route.viaIds.includes('kala-amb')));
  assert.ok(busRoutes.some(route => route.viaIds.includes('kheri-chopta')));
  assert.ok(!boardingPoints().some(name => ['Private Bus', 'Electric Bus', 'Hr', 'Local'].includes(name)));
});

test('every dropdown destination and future timetable pair is backed by the shared matcher', () => {
  const pairs = timetablePairs();
  assert.ok(pairs.length > 1000);
  for (const pair of pairs) assert.ok(matchRoutes(pair.from, pair.to).length, JSON.stringify(pair));
  assert.deepEqual(destinationsFrom('unsupported origin'), []);
});

test('all 20,195 source records are accounted for and searchable services retain provenance', () => {
  const report = JSON.parse(readFileSync('data/timetable/reconciliation.json', 'utf8'));
  const audit = JSON.parse(readFileSync('data/timetable/audit.json', 'utf8'));
  assert.equal(report.snapshotId, snapshotId);
  assert.equal(audit.length, 20195);
  assert.equal(new Set(audit.map(row => row.id)).size, 20195);
  assert.equal(report.files.reduce((sum, file) => sum + file.input, 0), 20195);
  assert.equal(report.files.reduce((sum, file) => sum + (file.imported ?? 0) + (file.review ?? 0) + file.confirmedDuplicates, 0), 20195);
  const refs = new Map<string, { status: string }>(audit.map(row => [row.id, row]));
  for (const route of busRoutes) {
    assert.ok(route.operatingDepot && route.sourceTimetable && route.pdfPage);
    assert.match(route.departureTime, /^([01]\d|2[0-3]):[0-5]\d$/);
    for (const ref of route.sourceRefs) assert.equal(refs.get(ref)?.status, 'imported');
  }
  assert.ok(busRoutes.some(route => route.sourceTimetable === 'Gurugram.pdf' && route.depotSource === 'filename' && route.operatingDepot === 'Gurugram'));
  assert.ok(busRoutes.some(route => route.sourceTimetable === 'bhiwani.pdf' && route.depotSource === 'filename' && route.operatingDepot === 'Bhiwani'));
  assert.ok(audit.every(row => row.raw && row.rawValues && (row.status !== 'review' || row.issues.length)));
});
