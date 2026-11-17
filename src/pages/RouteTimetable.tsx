import { Link, useParams } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import PublishedDepartures from '@/components/PublishedDepartures';
import SEO from '@/components/SEO';
import { DocumentLink } from '@/components/TimetableSource';
import { cityHubs, connectionFrom, routeSummaries, routesBySlug, publicSnapshotId, usePublicJourney, type RouteSummary } from '@/lib/public-timetables';
import { BUS_STAND_ENQUIRIES_URL, CONTACT_EMAIL_LINK, OFFICIAL_TIMETABLE_DIRECTORY_URL, SITE_URL } from '@/lib/site';
import Advertisement from '@/components/Advertisement';
import { ANDROID_TIMETABLE_APP_URL, ANDROID_TIMETABLE_NAME } from '@/lib/android-source';
import NotFound from './NotFound';

export default function RouteTimetable() {
  const { slug } = useParams();
  const summary = slug && routesBySlug.get(slug);
  return summary ? <JourneyPage key={summary.slug} summary={summary} /> : <NotFound />;
}

function JourneyPage({ summary }: { summary: RouteSummary }) {
  const { from, to, fromId, toId, path, hasHaryanaRoadways, hasPublishedDepartures } = summary;
  const { journey, failed, retry } = usePublicJourney(summary.slug, hasPublishedDepartures);
  const reverse = connectionFrom(toId, fromId);
  const hub = cityHubs.find(city => city.id === fromId);
  const destinationHub = cityHubs.find(city => city.id === toId);
  const related = routeSummaries.filter(route => route.hasPublishedDepartures && route.path !== path && route.path !== reverse?.path
    && (route.fromId === fromId || route.toId === toId)).slice(0, 4);
  const label = `${from} to ${to}`;
  const pageType = hasPublishedDepartures ? 'bus timetable' : 'bus connection';
  const searchUrl = `/search?${new URLSearchParams({ from: fromId, to: toId })}`;
  const android = journey?.services.find(service => service.android)?.android;
  const issueSubject = encodeURIComponent(`Timetable issue: ${label}`);
  const issueBody = encodeURIComponent([
    `Page: ${SITE_URL}${path}`,
    `Timetable sources: ${[...(journey?.sources.map(source => source.file) ?? []), ...(android ? [ANDROID_TIMETABLE_NAME] : [])].join(', ')}`,
    '', 'Boarding point and listed departure:', 'PDF page or app trip reference:', 'Correction and supporting evidence:',
  ].join('\r\n'));
  return <article className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
    <SEO title={`${label} ${hasPublishedDepartures ? 'Bus Timetable' : 'Bus Connection'} | ${hasHaryanaRoadways ? 'Haryana Roadways' : 'HaryanaBus'}`}
      description={hasPublishedDepartures
        ? `Find ${label} bus departures with boarding points, operators, service days, and timetable sources.`
        : `Check published bus coverage for ${label}, the reverse connection, and official bus stand enquiries.`}
      path={path} noIndex={!hasPublishedDepartures} />
    <Breadcrumbs trail={[{ path: '/routes', name: 'Routes' },
      ...(hub ? [{ path: hub.path, name: hub.name }] : []), { path, name: label }]} />
    <header className="space-y-2">
      <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{label} {pageType}</h1>
      {hasPublishedDepartures && <p className="max-w-2xl text-sm text-slate-700 sm:text-base">
        Times are departures from the listed boarding point. Check the service day and confirm with the bus stand before travel.
      </p>}
    </header>
    {!hasPublishedDepartures ? <section aria-labelledby="departure-coverage" className="space-y-2 rounded-lg border bg-white p-4">
      <h2 id="departure-coverage" className="text-lg font-semibold">No published through departure</h2>
      <p className="text-slate-700">The reviewed timetables contain no through departure from {from} to {to}. Ask the bus stand about current service or connections.</p>
    </section> : journey ? <PublishedDepartures journey={journey} />
      : failed ? <p role="alert">Could not load this timetable. <button className="min-h-11 underline" onClick={retry}>Try again</button> or <a className="underline" href={path}>open the complete page</a>.</p>
      : <p role="status">Loading timetable…</p>}
    <section aria-labelledby="travel-help" className="space-y-2 text-sm text-slate-700">
      <h2 id="travel-help" className="text-lg font-semibold text-slate-950">Boarding and timetable sources</h2>
      {journey?.routeNotice && <p>{journey.routeNotice}</p>}
      {journey?.services.some(service => service.fromId === fromId)
        && journey.services.some(service => service.fromId !== fromId) &&
        <p>Check the boarding point for entries marked only {from}. Other entries give a more specific boarding location.</p>}
      {hasPublishedDepartures && <p>Check the boarding point on each row. A bus may continue beyond {to}, and publications may list the same service more than once.</p>}
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-blue-700 [&_a]:inline-block [&_a]:py-1.5 [&_a]:underline [&_a]:underline-offset-4">
        <li><a href={BUS_STAND_ENQUIRIES_URL}>Official bus stand enquiries</a></li>
        {journey && <li><a href={`${CONTACT_EMAIL_LINK}?subject=${issueSubject}&body=${issueBody}`}>Report a timetable issue</a></li>}
        <li><Link to={searchUrl}>Search {label}</Link></li>
      </ul>
      <details className="rounded-lg border bg-white px-3">
        <summary className="cursor-pointer py-2 font-medium text-slate-950">Schedule and source notes</summary>
        <div className="space-y-2 pb-3">
          <p>{hasPublishedDepartures
            ? 'These records describe published schedules. Open a departure’s source to see any listed stop times. Confirm current operation with the bus stand.'
            : 'The depot directory is one source of schedule information. Check with the bus stand for service beyond this collection.'}</p>
          <p><a href={OFFICIAL_TIMETABLE_DIRECTORY_URL} className="text-blue-700 underline underline-offset-4">Haryana Roadways depot timetable directory</a></p>
          {android && <p><a href={ANDROID_TIMETABLE_APP_URL} className="text-blue-700 underline underline-offset-4">{ANDROID_TIMETABLE_NAME}</a>
            {' · Android timetable version '}{android.version}</p>}
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
      <h2 id="related-routes" className="text-lg font-semibold">Other connections</h2>
      {reverse && <p className="text-sm">Reverse connection <Link to={reverse.path} className="text-blue-700 underline underline-offset-4">{reverse.from} to {reverse.to}</Link>
        {!reverse.hasPublishedDepartures && <span className="ml-2 text-slate-600">No departure listed</span>}
      </p>}
      {destinationHub && <p className="text-sm"><Link to={destinationHub.path} className="text-blue-700 underline underline-offset-4">All connections from {to}</Link></p>}
      {related.length > 0 && <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {related.map(route => <li key={route.path}>
          <Link to={route.path} className="inline-block py-1.5 text-blue-700 underline underline-offset-4">{route.from} to {route.to}</Link>
        </li>)}
      </ul>}
    </nav>}
    {journey && journey.services.length >= 10 && <Advertisement key={path} placement={path} />}
  </article>;
}
