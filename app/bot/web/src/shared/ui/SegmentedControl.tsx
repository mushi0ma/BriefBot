import React from 'react';

interface Segment {
  id: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  activeSegment: string;
  onChange: (segmentId: string) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  activeSegment,
  onChange,
  className = ""
}) => {
  return (
    <div className={`bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-xl flex w-full ${className}`}>
      {segments.map((segment) => {
        const isActive = segment.id === activeSegment;
        return (
          <button
            key={segment.id}
            onClick={() => onChange(segment.id)}
            className={`flex-1 text-center py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
};
