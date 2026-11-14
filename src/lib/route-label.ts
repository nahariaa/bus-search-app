import type { BusRoute } from './timetable';

export const routeMatchLabel = (route: BusRoute): string =>
  route.matchedVia ? `Towards ${route.to} · via ${route.matchedVia}` : `To ${route.to}`;
