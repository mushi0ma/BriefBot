import React from 'react';
import { Lock, AlertOctagon } from 'lucide-react';

export function AdminRestrictedState() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#1C1C1E] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">

      {/* Red Pulse Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Center Icon Group */}
      <div className="relative mb-8 z-10">
        <div className="w-24 h-24 rounded-full bg-[#2C2C2E] border-4 border-[#3A3A3C] shadow-2xl flex items-center justify-center relative overflow-hidden">
          <AlertOctagon className="w-12 h-12 text-[#FF453A]" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FF453A] rounded-full border-4 border-[#1C1C1E] flex items-center justify-center shadow-lg transform rotate-12">
          <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <h1 className="text-[28px] font-bold text-white tracking-tight mb-3 z-10 relative">
        Доступ Запрещен
      </h1>

      <p className="text-[16px] text-[#8E8E93] leading-relaxed max-w-[280px] font-medium mb-10 z-10 relative">
        Этот раздел предназначен исключительно для администраторов системы.
        <br/><br/>
        Пожалуйста, закройте это окно и вернитесь к основному боту.
      </p>

      {/* Telegram Main Button Simulator */}
      <button
        onClick={() => {
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            window.Telegram.WebApp.close();
          }
        }}
        className="w-full max-w-[320px] bg-[#FF453A] hover:bg-[#FF3B30] text-white font-bold py-4 rounded-xl text-[17px] shadow-[0_4px_14px_0_rgba(255,69,58,0.39)] transition-all active:scale-[0.98] z-10 relative"
      >
        Вернуться назад
      </button>

      <div className="absolute bottom-10 flex items-center gap-1.5 opacity-40">
        <ShieldLogo />
        <span className="text-[12px] font-semibold text-white tracking-widest uppercase">Admin Security</span>
      </div>

    </div>
  );
}

function ShieldLogo() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 0L0 3.11111V7.77778C0 11.8533 2.99444 15.6578 7 16C11.0056 15.6578 14 11.8533 14 7.77778V3.11111L7 0ZM7 3.55556L11.6667 5.62667V7.77778C11.6667 10.7022 9.53556 13.4156 7 14.2867C4.46444 13.4156 2.33333 10.7022 2.33333 7.77778V5.62667L7 3.55556ZM5.44444 8.55556L4.03667 7.14778L3.21222 7.97222L5.44444 10.2044L10.1111 5.53778L9.28667 4.71333L5.44444 8.55556Z" fill="white"/>
    </svg>
  );
}
