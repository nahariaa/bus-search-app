import React, { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PlaceInput from './PlaceInput';
import { Label } from '@/components/ui/label';
import { Bus, MapPin, ArrowLeftRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSearchData } from '@/hooks/use-search-data';

interface BusSearchFormProps {
  initialFrom?: string;
  initialTo?: string;
}

const BusSearchForm = ({ initialFrom = '', initialTo = '' }: BusSearchFormProps) => {
  const [fromCity, setFromCity] = useState(initialFrom);
  const [toCity, setToCity] = useState(initialTo);
  const navigate = useNavigate();
  const { data, loading, failed, start } = useSearchData();
  const statusId = useId();

  const origins = useMemo(() => data?.boardingPoints() ?? [], [data]);
  const destinations = useMemo(() => data?.destinationsFrom(fromCity) ?? [], [data, fromCity]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const engine = data ?? await start();
    if (!engine) return;
    const from = engine.canonicalPlaceName(fromCity);
    const to = engine.canonicalPlaceName(toCity);
    setFromCity(from);
    setToCity(to);

    if (!from || !to) {
      toast({
        title: "Missing Information",
        description: "Enter a boarding point and destination.",
        variant: "destructive"
      });
      return;
    }

    if (engine.locationKey(from) === engine.locationKey(to)) {
      toast({
        title: "Invalid Route",
        description: "Choose a different boarding point or destination.",
        variant: "destructive"
      });
      return;
    }

    navigate(engine.buildSearchUrl(from, to));
  };

  const swapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} onFocusCapture={() => { if (!data && !loading && !failed) void start(); }} className="space-y-6">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end md:gap-3">
          <div className="space-y-2">
            <Label htmlFor="from-city" className="text-sm font-medium text-gray-700">
              Boarding From
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <PlaceInput id="from-city" value={fromCity} onChange={setFromCity}
                available={origins} suggest={data?.placeSuggestions} statusId={statusId} placeholder="Enter departure city or terminal" />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={swapCities}
            className="h-11 w-11 justify-self-center rounded-full text-blue-700 md:mb-0.5"
            aria-label="Swap boarding point and destination"
          >
            <ArrowLeftRight aria-hidden="true" />
          </Button>

          <div className="space-y-2">
            <Label htmlFor="to-city" className="text-sm font-medium text-gray-700">
              Where are you going?
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <PlaceInput id="to-city" value={toCity} onChange={setToCity}
                available={destinations} suggest={data?.placeSuggestions} statusId={statusId} placeholder="Enter destination city or stop" />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
        >
          <Bus className="mr-3 h-5 w-5" />
          Find Buses
        </Button>
      </form>
      <div id={statusId} aria-live="polite" aria-atomic="true" className="text-sm text-slate-700">
        {loading && <p role="status">Loading search timetables. You can keep typing.</p>}
        {failed && <p role="alert">Could not load search timetables. <button type="button" className="min-h-11 underline" onClick={() => void start()}>Try again</button> or <a href="/routes" className="underline">browse published routes</a>.</p>}
      </div>
    </div>
  );
};

export default BusSearchForm;
