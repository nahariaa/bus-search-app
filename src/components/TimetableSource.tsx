import type { BusRoute } from '@/lib/timetable';
import type { DocumentSource } from '@/lib/document-source';
import { operatorLabel } from '@/lib/route-label';
import { ANDROID_TIMETABLE_APP_URL, ANDROID_TIMETABLE_NAME } from '@/lib/android-source';

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
  const android = route.android;
  return <details className={className}>
    <summary className="cursor-pointer select-none rounded-sm py-1 text-blue-700 underline underline-offset-4">Timetable source</summary>
    <div className="space-y-1 break-words pb-2">
      {route.pdfPage && <p>{route.sourceTimetable} · {source?.versionStatus === 'different-version' && 'archived '}PDF page {route.pdfPage}</p>}
      {source && <p><DocumentLink source={source} page={route.pdfPage} /></p>}
      <dl className="space-y-1 [&_dd]:inline [&_dt]:mr-1 [&_dt]:inline [&_dt]:font-medium">
        <div><dt>Operating depot</dt><dd>{route.operatingDepot || 'Not published'}{route.depotSource === 'filename' && ' (from timetable title)'}</dd></div>
        <div><dt>Operator in source</dt><dd>{route.operator || operatorLabel(route.operator)}</dd></div>
        {route.viaSource && <div><dt>Route wording in source</dt><dd>{route.viaSource}</dd></div>}
        <div><dt>Source references</dt><dd>{route.sourceRefs.join(', ') || 'Not published'}</dd></div>
      </dl>
      {android && <div className="space-y-1 pt-1">
        <p>
          <a href={ANDROID_TIMETABLE_APP_URL} className="text-blue-700 underline underline-offset-4">{ANDROID_TIMETABLE_NAME}</a>
          {' · Timetable '}{android.version}{' · Trip '}{android.tripNumber}
        </p>
        <p className="font-medium">Full stop list</p>
        <ol className="space-y-1" aria-label="Stops in travel order">
          {android.stops.map((stop, index) => <li key={index} className="flex items-baseline justify-between gap-2">
            <span>{stop.name}</span>
            {stop.time ? <time className="shrink-0 tabular-nums" dateTime={stop.time}>{stop.time}</time> : <span aria-label="Time unavailable">—</span>}
          </li>)}
        </ol>
      </div>}
    </div>
  </details>;
}
