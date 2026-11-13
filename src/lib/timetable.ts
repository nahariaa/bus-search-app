import snapshot from '../data/timetable.json';

export interface Place {
  id: string;
  name: string;
  aliases: string[];
  members: string[];
}

export interface BusRoute {
  id: string;
  fromId: string;
  toId: string;
  viaIds: string[];
  from: string;
  to: string;
  via: string;
  departureTime: string;
  typeOfService: string;
  operator: string;
  serviceDays: string[];
  sourceTimetable: string;
  operatingDepot: string;
  depotSource: string;
  pdfPage: number;
  sourceRefs: string[];
  matchedVia?: string;
}

export const snapshotId = snapshot.id;
export const places: Place[] = snapshot.places;
export const placesById = new Map(places.map(place => [place.id, place]));
export const cleanLocation = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalized = (value: string) => cleanLocation(value).toLowerCase();
const placeLookup = new Map<string, Place>();
for (const place of places) {
  for (const alias of [place.id, place.name, ...place.aliases]) placeLookup.set(normalized(alias), place);
}

export const resolvePlace = (value: string): Place | undefined => placeLookup.get(normalized(value));
export const locationKey = (value: string): string => resolvePlace(value)?.id ?? normalized(value);
export const canonicalPlaceName = (value: string) => resolvePlace(value)?.name ?? cleanLocation(value);
export const placeName = (id: string) => placesById.get(id)?.name ?? id;
export const placeIncludes = (queryId: string, actualId: string) =>
  queryId === actualId || !!placesById.get(queryId)?.members.includes(actualId);

type PackedService = [string, string, string, string[], string, string, string, string[], string, string, string, number, string[]];

// A single versioned snapshot supplies the app and future static page generation.
// Column tuples avoid shipping the same field names and display names 20,000 times.
export const busRoutes: BusRoute[] = (snapshot.services as PackedService[]).map(row => {
  const [id, fromId, toId, viaIds, departureTime, typeOfService, operator, serviceDays,
    sourceTimetable, operatingDepot, depotSource, pdfPage, sourceRefs] = row;
  return { id, fromId, toId, viaIds, from: placeName(fromId), to: placeName(toId),
    via: viaIds.map(placeName).join(' · '), departureTime, typeOfService, operator, serviceDays,
    sourceTimetable, operatingDepot, depotSource, pdfPage, sourceRefs };
});
