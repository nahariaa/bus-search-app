import { test } from 'node:test';
import assert from 'node:assert/strict';
import { busRoutes, type BusRoute } from './bus-routes';
import { boardingPoints, cleanLocation, destinationsFrom, locationKey, matchRoutes } from './route-matching';

test('published Delhi to Ludhiana departures survive case and whitespace variants', () => {
  const routes = matchRoutes('ISBT Delhi', 'Ludhiana');
  assert.ok(routes.length > 0);
  assert.ok(routes.some(route => route.departureTime === '00:30'));
  assert.deepEqual(matchRoutes('  isbt \t DELHI  ', '  LUDHIANA  '), routes);
  assert.deepEqual(matchRoutes('ISBTDelhi', 'Ludhiana'), routes);
  assert.equal(cleanLocation('  ISBT \n Delhi '), 'ISBT Delhi');
});

test('Gurgaon alias finds published Gurugram journeys in the right direction', () => {
  const route = busRoutes.find(route => route.to === 'Gurugram' && route.departureTime);
  assert.ok(route);
  assert.deepEqual(matchRoutes(route.from, 'Gurgaon'), matchRoutes(route.from, 'Gurugram'));
  assert.ok(matchRoutes(route.from, 'Gurgaon').length > 0);
  assert.equal(matchRoutes('Gurgaon', route.from).length, 0);
});

test('terminals stay separate and uncertain labels are not guessed', () => {
  assert.notEqual(locationKey('ISBT Delhi'), locationKey('SKK Delhi'));
  assert.notEqual(locationKey('Delhi'), locationKey('ISBT Delhi'));
  assert.notEqual(locationKey('Faridabad'), locationKey('Faridabad(NIT)'));
  assert.notEqual(locationKey('ISBT DelhiAm'), locationKey('ISBT Delhi'));
  assert.equal(locationKey('ISBTKashmiriGate'), locationKey('ISBTKashmiri Gate'));
});

test('every suggestion is backed by a published directional departure', () => {
  const origins = boardingPoints();
  assert.ok(origins.length > 0);
  assert.ok(!origins.includes('Ambala')); // Via/destination only in the current records.
  assert.ok(!origins.includes('Gurgaon'));
  assert.deepEqual(destinationsFrom(''), []);
  assert.deepEqual(destinationsFrom('Ambala'), []);
  for (const from of origins) {
    for (const to of destinationsFrom(from)) assert.ok(matchRoutes(from, to).length > 0);
  }
  assert.ok(!destinationsFrom('ISBT Delhi').includes('ISBT Delhi'));
  // A published destination elsewhere is not automatically served from Delhi.
  assert.ok(matchRoutes('Charkhi Dadri', 'Badwana').length > 0);
  assert.ok(!destinationsFrom('ISBT Delhi').includes('Badwana'));
  assert.equal(matchRoutes('ISBT Delhi', 'Badwana').length, 0);
  assert.equal(matchRoutes('ISBT Delhi', 'unsupported destination').length, 0);
  assert.equal(matchRoutes('Ludhiana', 'ISBT Delhi').length, 0);
  assert.equal(matchRoutes('Ambala', 'Ludhiana').length, 0);
});

test('incomplete records cannot become suggestions or matching departures', () => {
  const base: BusRoute = { from: 'Origin', to: 'Destination', via: 'Via only', departureTime: '10:00', typeOfService: 'Ordinary', operator: 'HR', serviceDays: ['All Day'] };
  const records = [base, { ...base, from: 'No time', departureTime: ' ' }, { ...base, from: 'No destination', to: '' }];
  assert.deepEqual(boardingPoints(records), ['Origin']);
  assert.deepEqual(destinationsFrom('Origin', records), ['Destination']);
  assert.deepEqual(matchRoutes('No time', 'Destination', records), []);
  assert.deepEqual(matchRoutes('Via only', 'Destination', records), []);
  assert.deepEqual(matchRoutes('', 'Destination', records), []);
  assert.deepEqual(matchRoutes('Origin', '', records), []);
});
