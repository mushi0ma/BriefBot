"use client";

import React, { useState, useEffect } from 'react';
import { type UserSettings } from '@/src/entities/user';
import { FileDown, Settings as SettingsIcon } from 'lucide-react';

interface OutputSettingsProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string | boolean | number) => void;
  saving: boolean;
}

export function OutputSettings({ settings, onUpdate, saving }: OutputSettingsProps) {
  const [toggles, setToggles] = useState({
    watermark_on_pdf: settings.watermark_on_pdf ?? true,
    include_cover_page: settings.include_cover_page ?? false,
    page_numbering: settings.page_numbering ?? true,
  });

  const [fontSize, setFontSize] = useState(settings.base_font_size ?? 10);
  const [paperSize, setPaperSize] = useState(settings.paper_size ?? 'A4');

  useEffect(() => {
    setToggles(prev => ({
      watermark_on_pdf: settings.watermark_on_pdf ?? prev.watermark_on_pdf,
      include_cover_page: settings.include_cover_page ?? prev.include_cover_page,
      page_numbering: settings.page_numbering ?? prev.page_numbering,
    }));
    setFontSize(settings.base_font_size ?? 10);
    setPaperSize(settings.paper_size ?? 'A4');
  }, [settings]);

  const handleToggle = (key: keyof typeof toggles, value: boolean) => {
    setToggles(prev => ({ ...prev, [key]: value }));
    onUpdate(key, value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setFontSize(val);
  };

  const handleFontSizeSave = () => {
    onUpdate('base_font_size', fontSize);
  };

  const PAPER_SIZES = [
    { id: 'A4', label: 'A4 (Standard)' },
    { id: 'Letter', label: 'US Letter' }
  ];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* PDF Document Options */}
      <section className="bg-tg-bg rounded-2xl">
        <div className="flex items-center gap-2 px-4 py-3">
          <SettingsIcon className="w-5 h-5 text-tg-hint" />
          <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wider">
            PDF Document Options
          </h2>
        </div>
        <div className="divide-y divide-tg-hint/10 mx-4 bg-tg-secondary-bg/30 rounded-2xl border border-tg-hint/10 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between p-4 bg-transparent transition-colors active:bg-tg-hint/5">
            <div className="flex-1 pr-4">
              <p className="text-[16px] font-semibold text-tg-text">Watermark on PDF</p>
              <p className="text-[13px] text-tg-hint mt-0.5">Add a subtle logo watermark to each page</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggles.watermark_on_pdf}
              disabled={saving}
              onClick={() => handleToggle('watermark_on_pdf', !toggles.watermark_on_pdf)}
              className={`relative inline-flex h-7 w-[50px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                toggles.watermark_on_pdf ? "bg-[#34C759]" : "bg-tg-hint/30"
              } ${saving ? "opacity-50" : ""}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                toggles.watermark_on_pdf ? "translate-x-[24px]" : "translate-x-[2px]"
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-transparent transition-colors active:bg-tg-hint/5">
            <div className="flex-1 pr-4">
              <p className="text-[16px] font-semibold text-tg-text">Include Cover Page</p>
              <p className="text-[13px] text-tg-hint mt-0.5">Generated branding on the first page</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggles.include_cover_page}
              disabled={saving}
              onClick={() => handleToggle('include_cover_page', !toggles.include_cover_page)}
              className={`relative inline-flex h-7 w-[50px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                toggles.include_cover_page ? "bg-[#34C759]" : "bg-tg-hint/30"
              } ${saving ? "opacity-50" : ""}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                toggles.include_cover_page ? "translate-x-[24px]" : "translate-x-[2px]"
              }`} />
            </button>
          </div>

        </div>
      </section>

      {/* PDF Layout */}
      <section className="bg-tg-bg rounded-2xl">
        <div className="flex items-center gap-2 px-4 py-3">
          <FileDown className="w-5 h-5 text-tg-hint" />
          <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wider">
            PDF Layout
          </h2>
        </div>
        <div className="divide-y divide-tg-hint/10 mx-4 bg-tg-secondary-bg/30 rounded-2xl border border-tg-hint/10 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between p-4 bg-transparent transition-colors active:bg-tg-hint/5">
            <div className="flex-1 pr-4">
              <p className="text-[16px] font-semibold text-tg-text">Page Numbering</p>
              <p className="text-[13px] text-tg-hint mt-0.5">Display page numbers in the footer</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggles.page_numbering}
              disabled={saving}
              onClick={() => handleToggle('page_numbering', !toggles.page_numbering)}
              className={`relative inline-flex h-7 w-[50px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                toggles.page_numbering ? "bg-[#34C759]" : "bg-tg-hint/30"
              } ${saving ? "opacity-50" : ""}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                toggles.page_numbering ? "translate-x-[24px]" : "translate-x-[2px]"
              }`} />
            </button>
          </div>

          <div className="p-4 bg-transparent">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[16px] font-semibold text-tg-text">Base Font Size</p>
              <span className="text-[13px] font-medium text-[var(--tg-theme-button-color,#3e88f7)] bg-[var(--tg-theme-button-color,#3e88f7)]/10 px-2 py-0.5 rounded-md">
                {fontSize}pt
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-tg-hint font-medium">A</span>
              <input
                type="range"
                min="8"
                max="14"
                step="1"
                value={fontSize}
                onChange={handleFontSizeChange}
                onMouseUp={handleFontSizeSave}
                onTouchEnd={handleFontSizeSave}
                disabled={saving}
                className="flex-1 h-1.5 bg-tg-hint/20 rounded-lg appearance-none cursor-pointer accent-[var(--tg-theme-button-color,#3e88f7)]"
              />
              <span className="text-[16px] text-tg-hint font-medium">A</span>
            </div>
          </div>

          <div className="p-4 bg-transparent flex items-center justify-between relative">
            <p className="text-[16px] font-semibold text-tg-text">Paper Size</p>
            <div className="flex items-center gap-1">
              <select
                value={paperSize}
                onChange={(e) => {
                  setPaperSize(e.target.value);
                  onUpdate('paper_size', e.target.value);
                }}
                disabled={saving}
                className="appearance-none bg-transparent text-[var(--tg-theme-button-color,#3e88f7)] text-[15px] font-medium outline-none text-right pr-6 relative z-10 cursor-pointer"
                dir="rtl"
              >
                {PAPER_SIZES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[20px] text-[var(--tg-theme-button-color,#3e88f7)] absolute right-4 pointer-events-none">
                chevron_right
              </span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
