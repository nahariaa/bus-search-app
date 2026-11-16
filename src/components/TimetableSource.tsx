import type { BusRoute } from '@/lib/timetable';
import type { DocumentSource } from '@/lib/document-source';
import { operatorLabel } from '@/lib/route-label';

export function DocumentLink({ source, page }: { source: DocumentSource; page?: number }) {
  if (source.versionStatus === 'unchecked') {
    return <a href={source.officialIndex} className="text-blue-700 underline underline-offset-4">Official depot index</a>;
  }
  const exactPage = page && source.versionStatus === 'byte-match';
  const href = exactPage ? `${source.officialUrl}#page=${page}` : source.officialUrl;
  return <a href={href} className="text-blue-700 underline underline-offset-4">
    {exactPage ? `Official PDF, page ${page}` : 'Official PDF download'}
    {source.versionStatus === 'different-version' && ' (different file version)'}
  </a>;
}

export default function TimetableSource({ route, source, className }: {
  route: BusRoute; source?: DocumentSource; className?: string;
}) {
  return <details className={className}>
    <summary className="cursor-pointer select-none rounded-sm py-1 text-blue-700 underline underline-offset-4">Timetable source</summary>
    <div className="space-y-1 break-words pb-2">
      <p>{route.sourceTimetable} · {source?.versionStatus === 'different-version' && 'archived '}PDF page {route.pdfPage}</p>
      {source && <p><DocumentLink source={source} page={route.pdfPage} /></p>}
      <dl className="space-y-1 [&_dd]:inline [&_dt]:mr-1 [&_dt]:inline [&_dt]:font-medium">
        <div><dt>Operating depot</dt><dd>{route.operatingDepot || 'Not published'}{route.depotSource === 'filename' && ' (from timetable title)'}</dd></div>
        <div><dt>Operator in source</dt><dd>{route.operator || operatorLabel(route.operator)}</dd></div>
        {route.viaSource && <div><dt>Route wording in source</dt><dd>{route.viaSource}</dd></div>}
        <div><dt>Source references</dt><dd>{route.sourceRefs.join(', ') || 'Not published'}</dd></div>
      </dl>
    </div>
  </details>;
}
