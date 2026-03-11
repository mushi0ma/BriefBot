"use client";
import React, { useState, useEffect } from 'react';
import { Link2, Save, Loader2 } from 'lucide-react';

interface LogoInputProps {
  initialValue: string;
  onSave: (url: string) => void;
  disabled?: boolean;
}

export function LogoInput({ initialValue, onSave, disabled }: LogoInputProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tg-theme-hint-color,#98989e)]" />
          <input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            placeholder="https://example.com/logo.png"
            className="w-full bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] rounded-lg pl-9 pr-3 py-2.5 text-[14px] text-[var(--tg-theme-text-color,#fff)] placeholder:text-[var(--tg-theme-hint-color,#98989e)]/40 outline-none border border-[var(--tg-separator)] focus:border-[var(--tg-theme-button-color,#3e88f7)] transition-colors duration-200 disabled:opacity-50"
          />
        </div>
        <button
          onClick={() => onSave(value)}
          disabled={disabled || !value}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--tg-theme-button-color,#3e88f7)] text-[var(--tg-theme-button-text-color,#fff)] text-[14px] font-medium disabled:opacity-30 transition-all duration-200 hover:brightness-110"
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
