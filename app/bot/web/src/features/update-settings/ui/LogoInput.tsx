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
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            placeholder="https://example.com/logo.png"
            className="w-full bg-white rounded-md pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors duration-200 disabled:opacity-50 shadow-sm"
          />
        </div>
        <button
          onClick={() => onSave(value)}
          disabled={disabled || !value}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-zinc-900 text-white disabled:opacity-50 transition-all duration-200 hover:bg-zinc-800 shadow-sm shrink-0"
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
