import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { matchRoutes, buildSearchUrl, routeMatchLabel } from '../src/lib/route-matching';
import { routePages, routeManifest, validateRouteManifest } from '../src/lib/route-pages';
import { snapshotId } from '../src/lib/timetable';

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
      for (const fact of [service.id, service.departureTime, service.from, service.to, service.typeOfService || 'Not published',
        service.serviceDays.join(', ') || 'Not published', service.sourceTimetable, service.operatingDepot || 'Not published',
        `PDF page ${service.pdfPage}`, ...service.sourceRefs, ...(service.matchedVia ? [routeMatchLabel(service)] : [])]) {
        assert.ok(card.includes(escape(fact)), `${journey.path}: missing ${fact} on ${service.id}`);
      }
    });
  }
});

test('selection fails clearly for unsupported journeys, invalid IDs and duplicate slugs or pairs', () => {
  const first = routeManifest[0];
  for (const selections of [
    [{ ...first, fromId: 'yamunanagar', toId: 'shahabad' }],
    [{ ...first, fromId: 'not-a-place' }],
    [{ ...first, toId: first.fromId }],
    [{ ...first, slug: '../escape' }],
    [first, first],
    [first, { ...first, slug: 'duplicate-pair' }],
  ]) assert.throws(() => validateRouteManifest(selections), /Invalid static journey|no supported departures/);
});

test('Delhi to Ludhiana static regression retains 00:40 at Kashmiri Gate towards Katra', () => {
  const route = routePages.find(journey => journey.slug === 'delhi-to-ludhiana')!;
  const katra = route.services.find(service => service.id === 'delhi_isbt_delhi_depot_bus_schedule:59')!;
  assert.equal(katra.departureTime, '00:40');
  assert.equal(katra.fromId, 'isbt-kashmiri-gate-delhi');
  assert.equal(katra.toId, 'katra');
  assert.equal(katra.matchedVia, 'Ludhiana');
});
