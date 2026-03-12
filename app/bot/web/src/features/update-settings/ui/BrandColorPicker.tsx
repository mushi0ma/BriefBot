"use client";
import React from 'react';
import { Check } from 'lucide-react';
import { PRESET_COLORS } from '../model/constants';

interface BrandColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function BrandColorPicker({ value, onChange, disabled }: BrandColorPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 justify-center">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            disabled={disabled}
            aria-label={`Select color ${c}`}
            className={`relative w-8 h-8 rounded-full transition-all duration-200 disabled:opacity-50 ${
              value === c
                ? 'ring-2 ring-offset-2 ring-zinc-900 scale-110'
                : 'hover:scale-105 border border-zinc-200'
            }`}
            style={{ backgroundColor: c }}
          >
            {value === c && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-zinc-500 text-center mt-1">
          Выбран: <span className="font-mono text-zinc-900">{value}</span>
        </p>
      )}
    </div>
  );
}
