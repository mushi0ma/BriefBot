"use client";
import React from 'react';
import { useTelegram } from '@/src/shared/lib/telegram';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Loading Error",
  message = "We encountered an error while fetching your data. Please try again later.",
  onRetry
}: ErrorStateProps) {
  const { webApp } = useTelegram();

  const handleContactSupport = () => {
    const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL || 'tg://resolve?domain=BriefKzBot';
    if (webApp && (webApp as unknown as { openTelegramLink?: (url: string) => void }).openTelegramLink) {
      (webApp as unknown as { openTelegramLink: (url: string) => void }).openTelegramLink(supportUrl);
    } else {
      window.open(supportUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-tg-text">
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        {/* Illustration */}
        <div className="relative flex items-center justify-center w-48 h-48 rounded-full bg-[var(--tg-theme-button-color,#3e88f7)]/10 dark:bg-[var(--tg-theme-button-color,#3e88f7)]/5">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--tg-theme-button-color,#3e88f7)]/20 to-transparent rounded-full blur-xl"></div>
          <div className="relative flex flex-col items-center">
            <span className="material-symbols-outlined text-[var(--tg-theme-button-color,#3e88f7)] text-8xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>cloud_off</span>
            <div className="absolute -bottom-2 -right-2 bg-tg-bg p-1 rounded-full">
              <span className="material-symbols-outlined text-red-500 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-tg-hint text-base leading-relaxed max-w-[320px]">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-tg-button hover:bg-tg-button/90 text-tg-button-text text-base font-semibold leading-normal tracking-wide transition-all active:scale-[0.98]"
            >
              <span className="truncate">Retry Connection</span>
            </button>
          )}
          <button
            onClick={handleContactSupport}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-transparent text-tg-button text-sm font-medium hover:bg-tg-button/10 transition-colors"
          >
            <span className="truncate">Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
