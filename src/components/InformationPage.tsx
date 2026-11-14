import type { ReactNode } from 'react';
import SEO from './SEO';

interface InformationPageProps {
  heading: string;
  title: string;
  description: string;
  path: string;
  revised: string;
  children: ReactNode;
}

const InformationPage = ({ heading, title, description, path, revised, children }: InformationPageProps) => (
  <article className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-12">
    <SEO title={title} description={description} path={path} />
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{heading}</h1>
    <p className="mt-2 text-sm text-slate-600">
      Last revised <time dateTime={revised}>
        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(revised))}
      </time>
    </p>
    <div className="mt-6 space-y-3 leading-relaxed text-slate-700 [&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900">
      {children}
    </div>
  </article>
);

export default InformationPage;
