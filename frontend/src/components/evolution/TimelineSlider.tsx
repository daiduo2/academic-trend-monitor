import React from 'react';

interface TimelineSliderProps {
  periods: string[];
  currentPeriod: string;
  onSelectPeriod: (period: string) => void;
}

export function TimelineSlider({ periods, currentPeriod, onSelectPeriod }: TimelineSliderProps) {
  const currentIndex = periods.indexOf(currentPeriod);
  const progress = periods.length > 0 ? ((currentIndex + 1) / periods.length) * 100 : 0;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-4 rounded-xl border border-gray-200 shadow-lg">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        {periods.map(p => (
          <span key={p} className={p === currentPeriod ? 'text-blue-600 font-semibold' : ''}>
            {p}
          </span>
        ))}
      </div>
      <div className="w-[400px] h-1 bg-gray-200 rounded-full relative">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between">
          {periods.map(p => (
            <button
              key={p}
              className={`w-3 h-3 rounded-full border-2 transition-all ${
                p === currentPeriod
                  ? 'bg-blue-500 border-blue-500 scale-125'
                  : 'bg-white border-gray-300 hover:border-blue-400'
              }`}
              onClick={() => onSelectPeriod(p)}
              aria-label={`Select period ${p}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
