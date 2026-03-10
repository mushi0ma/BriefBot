"use client";
import React from 'react';
import { PRESET_COLORS } from '../model/constants';

interface BrandColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function BrandColorPicker({ value, onChange, disabled }: BrandColorPickerProps) {
  return (
    <>
      <div className="flex flex-wrap gap-3 justify-center">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            disabled={disabled}
            aria-label={`Select color ${c}`}
            className="relative w-11 h-11 rounded-full transition-transform disabled:opacity-50"
            style={{ backgroundColor: c }}
          >
            {value === c && (
              <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">✓</span>
            )}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] text-center mt-3">
          Выбран: <span className="font-mono">{value}</span>
        </p>
      )}
    </>
  );
}
