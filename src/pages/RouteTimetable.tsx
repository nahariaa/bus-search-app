import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import PublishedDepartures from '@/components/PublishedDepartures';
import SEO from '@/components/SEO';
import { DocumentLink } from '@/components/TimetableSource';
import { cityHubs, routeSummaries, publicSnapshotId, usePublicJourney } from '@/lib/public-timetables';
import { BUS_STAND_ENQUIRIES_URL, CONTACT_EMAIL_LINK, OFFICIAL_TIMETABLE_DIRECTORY_URL, SITE_URL } from '@/lib/site';
import Advertisement from '@/components/Advertisement';

export default function RouteTimetable({ summary }: { summary: typeof routeSummaries[number] }) {
  const { from, to, fromId, toId, path, hasHaryanaRoadways } = summary;
  const { journey, failed, retry } = usePublicJourney(summary.slug);
  const reverse = routeSummaries.find(route => route.fromId === toId && route.toId === fromId);
  const hub = cityHubs.find(city => city.id === fromId);
  const related = routeSummaries.filter(route => route.path !== path && route.path !== reverse?.path
    && (route.fromId === fromId || route.toId === toId)).slice(0, 4);
  const label = `${from} to ${to}`;
  const searchUrl = `/search?${new URLSearchParams({ from: fromId, to: toId })}`;
  const issueSubject = encodeURIComponent(`Timetable issue: ${label}`);
  const issueBody = encodeURIComponent([
    `Page: ${SITE_URL}${path}`,
    `Timetable sources: ${journey?.sources.map(source => source.file).join(', ') ?? ''}`,
    '', 'Boarding point and listed departure:', 'PDF page or row reference:', 'Correction and supporting evidence:',
  ].join('\r\n'));
  return <article className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
    <SEO title={`${label} Bus Timetable | ${hasHaryanaRoadways ? 'Haryana Roadways' : 'HaryanaBus'}`}
      description={`Find published ${label} bus departures with boarding points, operators, service days, and original depot timetable references.`}
      path={path} />
    <Breadcrumbs trail={[{ path: '/routes', name: 'Routes' },
      ...(hub ? [{ path: hub.path, name: hub.name }] : []), { path, name: label }]} />
    <header className="space-y-2">
      <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{label} bus timetable</h1>
      <p className="max-w-2xl text-sm text-slate-700 sm:text-base">
        Times are departures from the listed boarding point. Check the service day and confirm with the bus stand before travel.
      </p>
    </header>
    {journey ? <PublishedDepartures journey={journey} />
      : failed ? <p role="alert">Could not load this timetable. <button className="min-h-11 underline" onClick={retry}>Try again</button> or <a className="underline" href={path}>open the complete page</a>.</p>
      : <p role="status">Loading timetable…</p>}
    <section aria-labelledby="travel-help" className="space-y-2 text-sm text-slate-700">
      <h2 id="travel-help" className="text-lg font-semibold text-slate-950">Boarding and timetable sources</h2>
      {journey?.routeNotice && <p>{journey.routeNotice}</p>}
      {journey?.services.some(service => service.fromId === fromId)
        && journey.services.some(service => service.fromId !== fromId) &&
        <p>Confirm the terminal for entries marked simply {from}. Other entries name the boarding terminal in the timetable.</p>}
      <p>Check the boarding point on each row. A bus may continue beyond {to}, and publications may list the same service more than once.</p>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-blue-700 [&_a]:inline-block [&_a]:py-1.5 [&_a]:underline [&_a]:underline-offset-4">
        <li><a href={BUS_STAND_ENQUIRIES_URL}>Official bus stand enquiries</a></li>
        {journey && <li><a href={`${CONTACT_EMAIL_LINK}?subject=${issueSubject}&body=${issueBody}`}>Report a timetable issue</a></li>}
        <li><Link to={searchUrl}>Search {label}</Link></li>
      </ul>
      <details className="rounded-lg border bg-white px-3">
        <summary className="cursor-pointer py-2 font-medium text-slate-950">Schedule and source notes</summary>
        <div className="space-y-2 pb-3">
          <p>These records describe published schedules. Times at intermediate stops and current operation require separate confirmation.</p>
          <p><a href={OFFICIAL_TIMETABLE_DIRECTORY_URL} className="text-blue-700 underline underline-offset-4">Haryana Roadways depot timetable directory</a></p>
          {journey && <ul className="space-y-3">
            {journey.sources.map(source => <li key={source.sha256} className="border-t pt-2">
              <p className="font-medium">{source.file}</p>
              <p><DocumentLink source={source} /></p>
              <p>Document checked {source.documentCheckedOn
                ? <time dateTime={source.documentCheckedOn}>{source.documentCheckedOn}</time> : 'on an unrecorded date'}. {source.publicationDate
                  ? `Publication date ${source.publicationDate}.` : 'Publication date unavailable.'}
                {source.effectiveDate && ` Effective date ${source.effectiveDate}.`}</p>
              <p className="break-all text-xs">Archive SHA-256 <code>{source.sha256}</code></p>
            </li>)}
          </ul>}
          <p>Timetable snapshot <code>{publicSnapshotId.slice(0, 12)}</code></p>
        </div>
      </details>
    </section>
    {(reverse || related.length > 0) && <nav aria-labelledby="related-routes" className="space-y-2 border-t pt-4">
      <h2 id="related-routes" className="text-lg font-semibold">More timetables</h2>
      {reverse && <p className="text-sm">Return journey <Link to={reverse.path} className="text-blue-700 underline underline-offset-4">{reverse.from} to {reverse.to}</Link></p>}
      {related.length > 0 && <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {related.map(route => <li key={route.path}>
          <Link to={route.path} className="inline-block py-1.5 text-blue-700 underline underline-offset-4">{route.from} to {route.to}</Link>
        </li>)}
      </ul>}
    </nav>}
    {journey && journey.services.length >= 10 && <Advertisement key={path} placement={path} />}
  </article>;
}
