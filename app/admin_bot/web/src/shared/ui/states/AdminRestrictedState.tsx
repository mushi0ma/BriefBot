import React from 'react';

export function AdminRestrictedState() {
  const handleReturn = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    }
  };

  const handleSupport = () => {
    // Assuming support URL might be standard, or just open bot
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'BriefKzBot';
    const supportUrl = `https://t.me/${botUsername}`;

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      (window.Telegram.WebApp as unknown as { openTelegramLink: (url: string) => void }).openTelegramLink(supportUrl);
    } else if (typeof window !== 'undefined') {
        window.open(supportUrl, '_blank');
    }
  };

  return (
    <div className="bg-tg-bg font-sans text-tg-text min-h-screen flex flex-col p-6 animate-in fade-in duration-300 relative overflow-hidden">

      {/* Top Bar Area */}
      <div className="flex items-center justify-between mb-8 w-full max-w-md mx-auto relative z-20">
        <button
          onClick={handleReturn}
          className="p-2 -ml-2 text-tg-button hover:bg-tg-button/10 rounded-full transition-colors active:scale-95 flex items-center justify-center"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-[28px]">
            arrow_back
          </span>
        </button>
        <h1 className="text-[17px] font-semibold tracking-tight absolute left-1/2 -translate-x-1/2">
          Access Denied
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="max-w-md w-full flex-1 flex flex-col items-center justify-center mx-auto pb-20 relative z-20">

        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[350px] h-[350px] bg-tg-button/5 rounded-full blur-[60px] pointer-events-none" />

        {/* Icon Container */}
        <div className="relative mb-12 z-10">
          <div className="w-[160px] h-[160px] rounded-full border-[1px] border-tg-hint/10 flex items-center justify-center relative overflow-hidden bg-tg-secondary-bg/20">
             <span
              className="material-symbols-outlined text-tg-button text-[80px] select-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_lock
            </span>
          </div>
          <div className="absolute bottom-2 right-2 w-[52px] h-[52px] bg-tg-button rounded-full border-[4px] border-tg-bg flex items-center justify-center shadow-lg">
            <span
              className="material-symbols-outlined text-white text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[24px] font-bold text-tg-text tracking-tight mb-4 z-10 relative text-center">
          Admin Access Required
        </h2>

        {/* Description */}
        <p className="text-[15px] text-tg-hint leading-relaxed max-w-[280px] text-center mb-12 z-10 relative">
          This section is reserved for administrators only. If you believe this is an error, contact support.
        </p>

        {/* Actions */}
        <div className="w-full space-y-3 z-10 relative mt-auto">
          <button
            onClick={handleReturn}
            className="w-full bg-tg-button hover:opacity-90 text-tg-button-text font-semibold py-[14px] rounded-xl text-[16px] transition-all active:scale-[0.98]"
          >
            Return to App
          </button>

          <button
            onClick={handleSupport}
            className="w-full bg-tg-secondary-bg hover:bg-tg-hint/20 text-tg-button font-semibold py-[14px] rounded-xl text-[16px] transition-all active:scale-[0.98]"
          >
            Contact Support
          </button>
        </div>

      </div>
    </div>
  );
}
