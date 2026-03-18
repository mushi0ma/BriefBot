"use client";
import React from 'react';

import { useRouter } from 'next/navigation';

export function NotFoundState() {

  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleBack = () => {
    router.back();
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-[var(--tg-theme-bg-color,#fff)] dark:border-[var(--tg-theme-bg-color,#17212b)] bg-tg-bg text-tg-text font-sans">

      {/* Header / Status Bar Area */}
      <div className="flex items-center justify-between p-4 bg-tg-bg">
        <button
          onClick={handleBack}
          className="flex items-center justify-center p-2 rounded-full hover:bg-[var(--tg-theme-secondary-bg-color,#efeff3)] dark:hover:bg-[var(--tg-theme-secondary-bg-color,#232e3c)] transition-colors"
        >
          <span className="material-symbols-outlined text-[var(--tg-theme-button-color,#3e88f7)]">arrow_back</span>
        </button>
        <div className="flex-1 px-4">
          <h1 className="text-base font-semibold text-center text-tg-text">Error</h1>
        </div>
        <div className="w-10"></div> {/* Spacer for symmetry */}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">

        {/* Illustration Container */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-4 bg-[var(--tg-theme-button-color,#3e88f7)]/10 dark:bg-[var(--tg-theme-button-color,#3e88f7)]/5 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-[var(--tg-theme-secondary-bg-color,#efeff3)] dark:bg-[var(--tg-theme-secondary-bg-color,#232e3c)] shadow-inner">
            <span className="material-symbols-outlined text-tg-hint !text-6xl">search_off</span>
            <div className="absolute -bottom-2 -right-2 bg-tg-button p-2 rounded-xl shadow-lg border-4 border-tg-bg">
              <span className="material-symbols-outlined text-tg-button-text !text-2xl">error</span>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-3 mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-tg-text">Page Not Found</h2>
          <p className="text-sm leading-relaxed text-tg-hint max-w-[280px] mx-auto">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleBackToHome}
          className="flex w-full min-w-[200px] max-w-xs cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-tg-button hover:bg-tg-button/90 text-tg-button-text text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-[var(--tg-theme-button-color,#3e88f7)]/25"
        >
          <span className="material-symbols-outlined mr-2 !text-xl">home</span>
          <span className="truncate">Back to Home</span>
        </button>
      </div>

      {/* Bottom Navigation Bar is omitted here, let layout handle it if needed or leave empty if 404 should be standalone. The mockup includes bottom nav.
          Since `app/page.tsx` handles BottomNavBar for dashboard, we'll let this state handle its own rendering if it's the catch-all.
          Actually, we will use the global layout or just standard 404. Let's make it clean without a bottom nav to be globally useful. */}

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(var(--tg-theme-button-color,#3e88f7)_1px,transparent_1px)] [background-size:20px_20px] dark:opacity-20"></div>
      </div>
    </div>
  );
}
