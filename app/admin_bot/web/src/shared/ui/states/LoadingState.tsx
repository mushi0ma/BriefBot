import React from 'react';

export function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] px-8 text-center bg-tg-bg text-tg-text">
      {/* Simplified Telegram-native Spinner */}
      <div className="mb-6">
        <div className="w-8 h-8 rounded-full border-2 border-tg-button/20 border-t-tg-button animate-spin" />
      </div>

      {/* Loading Content */}
      <div className="flex flex-col gap-4 w-full max-w-[240px]">
        <h1 className="text-xl font-semibold">Загрузка данных</h1>

        {/* Minimal Progress Bar */}
        <div className="w-full">
          <div className="rounded-full bg-tg-secondary-bg overflow-hidden h-1">
            <div
              className="h-full rounded-full bg-tg-button transition-all duration-300 w-1/2 animate-pulse"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
