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
    <>
      <div className="flex flex-wrap gap-3 justify-center">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            disabled={disabled}
            aria-label={`Select color ${c}`}
            className={`relative w-11 h-11 rounded-full transition-all duration-200 disabled:opacity-50 ${
              value === c
                ? 'ring-2 ring-offset-2 ring-offset-[var(--tg-theme-bg-color,#000)] ring-[var(--tg-theme-button-color,#3e88f7)] scale-110'
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
          >
            {value === c && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Check className="w-5 h-5 text-white drop-shadow-md" strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] text-center mt-3">
          Выбран: <span className="font-mono text-[var(--tg-theme-text-color,#fff)]">{value}</span>
        </p>
      )}
    </>
  );
}
