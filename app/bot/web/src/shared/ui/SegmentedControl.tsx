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
    <div className={`bg-[var(--tg-theme-secondary-bg-color,#efeff3)] dark:bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] p-1 rounded-xl flex w-full ${className}`}>
      {segments.map((segment) => {
        const isActive = segment.id === activeSegment;
        return (
          <button
            key={segment.id}
            onClick={() => onChange(segment.id)}
            className={`flex-1 text-center py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              isActive
                ? 'bg-[var(--tg-theme-button-color,#3e88f7)] text-[var(--tg-theme-button-text-color,#fff)] shadow-sm'
                : 'text-[var(--tg-theme-hint-color,#98989e)] hover:bg-[var(--tg-theme-bg-color,#fff)]/50 dark:hover:bg-[var(--tg-theme-bg-color,#1c1c1e)]/50'
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
};
