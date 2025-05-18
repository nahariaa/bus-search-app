'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { busRoutes } from '@/data/busRoutes';

const BusSVG = () => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2">
    <rect x="5" y="20" width="50" height="25" rx="6" fill="#e0f7f4" stroke="#1a2340" strokeWidth="2"/>
    <rect x="10" y="25" width="10" height="10" rx="2" fill="#b3e5fc"/>
    <rect x="25" y="25" width="10" height="10" rx="2" fill="#b3e5fc"/>
    <rect x="40" y="25" width="10" height="10" rx="2" fill="#b3e5fc"/>
    <circle cx="15" cy="48" r="4" fill="#1a2340"/>
    <circle cx="45" cy="48" r="4" fill="#1a2340"/>
  </svg>
);

const SwapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="transform rotate-90" stroke="#1a2340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
    <polyline points="8 7 3 12 8 17" />
    <line x1="3" y1="12" x2="15" y2="12" />
  </svg>
);

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);


export default function Home() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const router = useRouter();

  const handleFindBuses = (e: React.FormEvent) => {
    e.preventDefault();
    const fromSlug = from.trim().toLowerCase().replace(/\s+/g, '-');
    const toSlug = to.trim().toLowerCase().replace(/\s+/g, '-');
    if (!fromSlug || !toSlug) return;
    router.push(`/results/${fromSlug}-to-${toSlug}`);
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const filteredRoutes = busRoutes.filter(route => {
    const matchesFrom = from === '' || route.from.toLowerCase().includes(from.toLowerCase());
    const matchesTo = to === '' || route.via.toLowerCase().includes(to.toLowerCase());
    return matchesFrom && matchesTo;
  });

  return (
    <main className="min-h-screen bg-[#f3fcfa] flex flex-col items-center p-0">
      {/* Header */}
      <div className="w-full py-8 text-center bg-[#1a2340] text-white rounded-b-3xl shadow-lg">
        <h1 className="text-xl font-bold tracking-wide">WELCOME TO HARYANA ROADWAYS</h1>
        <p className="text-sm mt-1 text-[#b3e5fc]">Where you want go.</p>
      </div>

      {/* Search Card */}
      <form
        onSubmit={handleFindBuses}
        className="w-80 max-w-xs bg-white rounded-2xl shadow-lg px-6 pt-4 pb-6 mt-[-32px] mb-4 z-10 flex flex-col items-center border border-[#e0f7f4]"
      >
        <BusSVG />
        <div className="w-full relative flex flex-col items-center">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Boarding From"
              className="w-full mb-2 p-3 rounded-lg border border-[#e0f7f4] focus:outline-[#1a2340] text-base text-[#1a2340] bg-[#f3fcfa]"
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
            <input
              type="text"
              placeholder="Where are you going?"
              className="w-full mt-2 p-3 rounded-lg border border-[#e0f7f4] focus:outline-[#1a2340] text-base text-[#1a2340] bg-[#f3fcfa]"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
            {/* Swap Button */}
            <button
              type="button"
              aria-label="Swap from and to"
              onClick={handleSwap}
              className="absolute right-[-22px] top-1/2 -translate-y-1/2 bg-[#f3fcfa] border border-[#e0f7f4] rounded-full flex items-center justify-center shadow-sm"
              style={{ width: 36, height: 36 }}
            >
              <SwapIcon />
            </button>
          </div>
        </div>
        {/* <div className="flex w-full justify-between mb-4 mt-2">
          <button
            type="button"
            className={`flex-1 py-2 rounded-l-lg border border-[#e0f7f4] text-sm font-medium ${selectedDate === 'today' ? 'bg-[#1a2340] text-white' : 'bg-white text-[#1a2340]'}`}
            onClick={() => setSelectedDate('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`flex-1 py-2 border-t border-b border-[#e0f7f4] text-sm font-medium ${selectedDate === 'tomorrow' ? 'bg-[#1a2340] text-white' : 'bg-white text-[#1a2340]'}`}
            onClick={() => setSelectedDate('tomorrow')}
          >
            Tomorrow
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-r-lg border border-[#e0f7f4] text-sm font-medium ${selectedDate === 'other' ? 'bg-[#1a2340] text-white' : 'bg-white text-[#1a2340]'}`}
            onClick={() => setSelectedDate('other')}
          >
            Other
          </button>
        </div>
        {selectedDate === 'other' && (
          <input
            type="date"
            className="w-full mb-3 p-2 rounded-lg border border-[#e0f7f4] text-base text-[#1a2340] bg-[#f3fcfa]"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
          />
        )} */}
        <button
          type="submit"
          className="w-full bg-[#1a2340] hover:bg-[#22305a] text-white font-bold py-3 rounded-lg text-lg shadow mt-2"
        >
          Find Buses
        </button>
      </form>

      {/* AdSense Placeholder */}
      <div className="w-80 max-w-xs mb-4">
        <div className="bg-[#e0f7f4] border border-[#b3e5fc] rounded-lg p-3 text-center text-[#1a2340] text-sm">
          Advertisement Space
        </div>
      </div>

      {/* Results */}
      {filteredRoutes.length === 0 ? (
        <div className="w-full max-w-sm px-2 pb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center text-[#1a2340]">No buses found.</div>
        </div>
      ) : (
        <div className="w-full max-w-sm px-2 pb-8">
          <div className="space-y-4">
            {filteredRoutes.map((route, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow border border-[#e0f7f4]">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-[#1a2340] text-base">{route.operator}</span>
                  <span className="bg-[#e0f7f4] text-[#1a2340] text-xs px-2 py-1 rounded font-semibold border border-[#b3e5fc]">{route.typeOfService}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-lg font-semibold text-[#1a2340]">{route.departureTime}</span>
                  <span className="text-[#1a2340] text-sm">{route.from} → {route.via}</span>
                </div>
                <div className="mt-1 text-xs text-[#22305a]">
                  <p>Service Days: {route.serviceDays.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
