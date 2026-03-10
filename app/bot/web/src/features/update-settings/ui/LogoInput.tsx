"use client";
import React, { useState, useEffect } from 'react';

interface LogoInputProps {
  initialValue: string;
  onSave: (url: string) => void;
  disabled?: boolean;
}

export function LogoInput({ initialValue, onSave, disabled }: LogoInputProps) {
  const [value, setValue] = useState(initialValue);

  // Sync state if initial value changes from external source (e.g. initial API fetch)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="https://example.com/logo.png"
          className="flex-1 bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] rounded-lg px-3 py-2.5 text-[15px] text-[var(--tg-theme-text-color,#fff)] placeholder:text-[var(--tg-theme-hint-color,#98989e)]/40 outline-none border border-[var(--tg-separator)] focus:border-[var(--tg-theme-button-color,#3e88f7)] disabled:opacity-50"
        />
        <button
          onClick={() => onSave(value)}
          disabled={disabled || !value}
          className="px-4 py-2.5 rounded-lg bg-[var(--tg-theme-button-color,#3e88f7)] text-[var(--tg-theme-button-text-color,#fff)] text-[15px] font-medium disabled:opacity-30 transition-opacity"
        >
          {disabled ? "..." : "OK"}
        </button>
      </div>
    </div>
  );
}
