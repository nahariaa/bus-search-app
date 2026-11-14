import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '@/lib/site';

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}

const SEO = ({ title, description, path, noIndex }: SEOProps) => {
  const canonicalUrl = path && `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};

export default SEO;
