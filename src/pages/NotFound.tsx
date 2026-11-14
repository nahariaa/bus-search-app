import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

const NotFound = () => (
  <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <SEO
      title="Page not found | HaryanaBus"
      description="Find published Haryana Roadways bus timetables on HaryanaBus."
      noIndex
    />
    <h1 className="mb-4 text-3xl font-bold">Page not found</h1>
    <Link to="/" className="text-blue-700 underline underline-offset-4">
      Return to timetable search
    </Link>
  </div>
);

export default NotFound;
