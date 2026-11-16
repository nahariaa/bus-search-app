import type { BusRoute } from './timetable';

export const routeMatchLabel = (route: BusRoute): string =>
  route.matchedVia ? `Towards ${route.to} · via ${route.matchedVia}` : `To ${route.to}`;

const operatorCode = (operator: string) => operator.replace(/[.\s]/g, '').toUpperCase();

export const hasHaryanaRoadwaysOperator = (operator: string) => ['HR', 'HARYANAROADWAYS'].includes(operatorCode(operator));

export function operatorLabel(operator: string): string {
  if (!operator) return 'Not published';
  if (hasHaryanaRoadwaysOperator(operator)) return 'Haryana Roadways';
  const code = operatorCode(operator);
  if (code === 'CTU') return 'CTU';
  if (code === 'PVT') return 'Private (PVT)';
  return operator;
}
