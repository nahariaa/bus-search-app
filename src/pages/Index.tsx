import BusSearchForm from '@/components/BusSearchForm';
import PopularRoutes from '@/components/PopularRoutes';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => (
  <>
    <SEO
      title="Haryana Roadways Bus Timetable & Route Timings | HaryanaBus"
      description="Search published Haryana Roadways bus timetables by boarding point and destination. See departure times, route stops and service days on HaryanaBus."
      path="/"
    />
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-12">
      <div className="mb-5 sm:mb-7 sm:text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Haryana Roadways bus timings
        </h1>
        <p className="mt-2 text-slate-600">
          Search published timetables by boarding point and destination.
        </p>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-7">
          <BusSearchForm />
        </CardContent>
      </Card>
      <PopularRoutes />
    </div>
  </>
);

export default Index;
