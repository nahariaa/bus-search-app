// Build only. Browser payloads receive the public source projection, without review notes or raw audit material.
import reconciliation from '../../data/timetable/reconciliation.json';
import versions from '../../data/timetable/review/documents.json';
import conflicts from '../../data/timetable/review/route-conflicts.json';
import type { DocumentSource } from './document-source';
import { snapshotId, type BusRoute } from './timetable';

export const routeConflicts = new Map(Object.entries(conflicts));

if (reconciliation.snapshotId !== snapshotId) {
  throw new Error('Timetable and reconciliation report are from different imports.');
}

const documents = new Map(reconciliation.pdfs.map(pdf => {
  const version = versions[pdf.sha256 as keyof typeof versions];
  if (!version || version.file !== pdf.pdf) {
    throw new Error(`Document metadata missing for ${pdf.pdf} (${pdf.sha256}). Review this version before building.`);
  }
  const { file, officialIndex, officialUrl, officialSha256, documentCheckedOn, publicationDate, effectiveDate } = version;
  const source: DocumentSource = {
    file, sha256: pdf.sha256, officialIndex, officialUrl, documentCheckedOn, publicationDate, effectiveDate,
    versionStatus: officialSha256 === pdf.sha256 ? 'byte-match' : officialSha256 ? 'different-version' : 'unchecked',
  };
  return [file, { source, pageCount: pdf.pages }];
}));

export function documentSources(services: BusRoute[]): DocumentSource[] {
  const sources = new Map<string, DocumentSource>();
  for (const service of services) {
    const document = documents.get(service.sourceTimetable);
    if (!document || !Number.isInteger(service.pdfPage) || service.pdfPage < 1 || service.pdfPage > document.pageCount) {
      throw new Error(`Invalid document reference for service ${service.id}`);
    }
    sources.set(document.source.file, document.source);
  }
  return Array.from(sources.values()).sort((a, b) => a.file.localeCompare(b.file));
}
