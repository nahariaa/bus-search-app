import { Link } from 'react-router-dom';
import { SITE_URL } from '@/lib/site';

interface Crumb { path: string; name: string }

export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const items = [{ path: '/', name: 'Home' }, ...trail];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ path, name }, index) => ({
      '@type': 'ListItem', position: index + 1, name, item: SITE_URL + path,
    })),
  };
  return <>
    <nav aria-label="Breadcrumb" className="text-sm text-slate-700">
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {items.map(({ path, name }, index) => (
          <li key={path} className="flex gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === items.length - 1
              ? <span aria-current="page">{name}</span>
              : <Link to={path} className="text-blue-700 underline underline-offset-4">{name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
    <script type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </>;
}
