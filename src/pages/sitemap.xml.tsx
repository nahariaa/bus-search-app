import { generateSitemap } from '@/lib/sitemap-generator';

export const getServerSideProps = async ({ res }) => {
  const sitemap = generateSitemap();
  
  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

// This is just a placeholder component since we're using getServerSideProps
const Sitemap = () => null;
export default Sitemap; 