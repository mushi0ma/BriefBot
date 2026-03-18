import { ArrowLeft, User, ShieldAlert } from 'lucide-react';
import React from 'react';

interface TopAppBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function TopAppBar({ title, showBack, onBack, rightAction }: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-tg-bg/95 backdrop-blur-md border-b border-tg-hint/10">
      <div className="h-14 px-4 flex items-center justify-between">

        <div className="flex-1 flex items-center justify-start">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-[var(--tg-theme-button-color,#3e88f7)] hover:bg-[var(--tg-theme-button-color,#3e88f7)]/10 rounded-full transition-colors active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        <div className="flex-[2] flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-sm">
              Admin
            </span>
          </div>
          <h1 className="text-[17px] font-semibold text-tg-text tracking-tight mt-0.5">
            {title}
          </h1>
        </div>

        <div className="flex-1 flex items-center justify-end">
          {rightAction || (
            <button
              className="w-8 h-8 rounded-full bg-tg-secondary-bg flex items-center justify-center text-[var(--tg-theme-button-color,#3e88f7)] transition-transform active:scale-95"
              aria-label="Profile"
            >
              <User className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
