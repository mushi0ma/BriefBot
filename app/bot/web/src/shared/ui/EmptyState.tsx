"use client";
import React from 'react';
import { motion } from 'framer-motion';

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 overflow-y-auto w-full h-full text-tg-text">
      <motion.div
        className="flex flex-col items-center gap-8 w-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Illustration */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--tg-theme-button-color,#3e88f7)]/10 dark:bg-[var(--tg-theme-button-color,#3e88f7)]/5 rounded-full blur-2xl"></div>
          <div className="relative flex items-center justify-center w-32 h-32 rounded-3xl bg-[var(--tg-theme-secondary-bg-color,#efeff3)] dark:bg-[var(--tg-theme-secondary-bg-color,#232e3c)] border border-[var(--tg-theme-bg-color,#fff)] dark:border-[var(--tg-theme-bg-color,#17212b)] shadow-xl">
            <span className="material-symbols-outlined text-[var(--tg-theme-button-color,#3e88f7)] text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-tg-button flex items-center justify-center text-tg-button-text shadow-lg border-4 border-tg-bg">
              <span className="material-symbols-outlined text-lg font-bold">add</span>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xl font-bold leading-tight tracking-tight">Your history is clear</p>
          <p className="text-tg-hint text-sm font-normal leading-relaxed max-w-[280px]">
            Start by generating a professional brief. Your history and templates will appear here.
          </p>
        </div>

        {/* Action Button - In Telegram, generating brief is usually done via Bot input. This button could redirect or open bot chat. */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
              window.Telegram.WebApp.close(); // Return to chat to generate a brief
            }
          }}
          className="flex min-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-tg-button text-tg-button-text text-base font-bold leading-normal tracking-wide shadow-lg shadow-[var(--tg-theme-button-color,#3e88f7)]/25 active:scale-95 transition-transform"
        >
          <span className="truncate">Create New Brief</span>
        </button>
      </motion.div>
    </div>
  );
}
