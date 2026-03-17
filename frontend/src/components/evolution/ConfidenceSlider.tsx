import React from 'react';

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function ConfidenceSlider({
  value,
  onChange,
  min = 0.6,
  max = 1.0,
  step = 0.05
}: ConfidenceSliderProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    onChange(newValue);
  };

  return (
    <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
      <label htmlFor="confidence-slider" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        置信度筛选: {value.toFixed(2)}
      </label>
      <input
        id="confidence-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-600 transition-colors"
        aria-label={`置信度筛选，当前值 ${value.toFixed(2)}`}
      />
    </div>
  );
}
