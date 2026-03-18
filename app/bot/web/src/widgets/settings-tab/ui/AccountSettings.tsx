"use client";

import React, { useState, useEffect } from 'react';
import { type UserSettings } from '@/src/entities/user';
import { LogOut, CheckCircle2 } from 'lucide-react';

interface AccountSettingsProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string | boolean | number) => void;
  saving: boolean;
}

export function AccountSettings({ settings, onUpdate, saving }: AccountSettingsProps) {
  const [language, setLanguage] = useState(settings.language ?? 'English');

  useEffect(() => {
    setLanguage(settings.language ?? 'English');
  }, [settings]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLanguage(val);
    onUpdate('language', val);
  };

  const LANGUAGES = [
    { id: 'English', label: 'English' },
    { id: 'Russian', label: 'Russian' },
    { id: 'Spanish', label: 'Spanish' },
  ];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Profile Header (Mocked) */}
      <section className="flex flex-col items-center justify-center pt-4 pb-2">
        <div className="relative">
          <img
            src="https://api.dicebear.com/7.x/notionists/svg?seed=John&backgroundColor=f3f4f6"
            alt="Profile Avatar"
            className="w-[88px] h-[88px] rounded-full object-cover border-2 border-tg-bg shadow-sm"
          />
          <div className="absolute bottom-0 right-0 bg-[var(--tg-theme-button-color,#3e88f7)] rounded-full p-1 border-2 border-tg-bg shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <h2 className="text-[22px] font-bold text-tg-text tracking-tight">John Doe</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--tg-theme-button-color,#3e88f7)] bg-[var(--tg-theme-button-color,#3e88f7)]/10 px-2 py-0.5 rounded-full">
            Premium
          </span>
        </div>
        <p className="text-[14px] text-tg-hint font-medium mt-1">@johndoe</p>
      </section>

      {/* Account Options List */}
      <section className="bg-tg-bg rounded-2xl mx-4">
        <div className="divide-y divide-tg-hint/10 bg-tg-secondary-bg/30 rounded-2xl border border-tg-hint/10 shadow-sm overflow-hidden">

          {/* Subscription Plan (Mocked) */}
          <div className="flex items-center justify-between p-4 bg-transparent active:bg-tg-hint/5 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--tg-theme-button-color,#3e88f7)] text-2xl w-6 text-center">
                workspace_premium
              </span>
              <p className="text-[16px] font-semibold text-tg-text">Subscription Plan</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-medium text-[var(--tg-theme-button-color,#3e88f7)]">Pro</span>
              <span className="material-symbols-outlined text-[20px] text-[var(--tg-theme-button-color,#3e88f7)]">
                chevron_right
              </span>
            </div>
          </div>

          {/* Language (Real) */}
          <div className="flex items-center justify-between p-4 bg-transparent active:bg-tg-hint/5 relative cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--tg-theme-button-color,#3e88f7)] text-2xl w-6 text-center">
                language
              </span>
              <p className="text-[16px] font-semibold text-tg-text">Language</p>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={language}
                onChange={handleLanguageChange}
                disabled={saving}
                className="appearance-none bg-transparent text-[var(--tg-theme-button-color,#3e88f7)] text-[15px] font-medium outline-none text-right pr-6 relative z-10 cursor-pointer"
                dir="rtl"
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[20px] text-[var(--tg-theme-button-color,#3e88f7)] absolute right-4 pointer-events-none">
                chevron_right
              </span>
            </div>
          </div>

          {/* Connected Bot (Mocked) */}
          <div className="flex items-center justify-between p-4 bg-transparent active:bg-tg-hint/5 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--tg-theme-button-color,#3e88f7)] text-2xl w-6 text-center">
                smart_toy
              </span>
              <p className="text-[16px] font-semibold text-tg-text">Connected Bot</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-medium text-[var(--tg-theme-button-color,#3e88f7)] opacity-80 truncate max-w-[120px]">
                @adm1n_Brief_Bot
              </span>
              <span className="material-symbols-outlined text-[20px] text-[var(--tg-theme-button-color,#3e88f7)]">
                chevron_right
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Log Out Button */}
      <section className="mx-4 mt-8">
        <button
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] font-semibold text-[16px] transition-colors active:bg-[#FF3B30]/20"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </section>

    </div>
  );
}
