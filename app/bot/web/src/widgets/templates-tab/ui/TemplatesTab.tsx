"use client";
import React from 'react';
import { TEMPLATES } from '@/src/entities/template';
import { TemplatePicker } from '@/src/features/select-template';
import { LayoutGrid } from 'lucide-react';

interface TemplatesTabProps {
  selected: string | null;
  onSelect: (slug: string) => void;
  saving: boolean;
}

export function TemplatesTab({ selected, onSelect, saving }: TemplatesTabProps) {
  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Header Info */}
      <div className="flex flex-col px-4 pt-2 mb-2">
        <div className="flex items-center justify-between bg-tg-secondary-bg/50 p-4 rounded-2xl border border-tg-hint/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tg-button/20 flex items-center justify-center text-tg-button font-bold text-lg shadow-sm border border-tg-button/30">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-tg-text leading-tight">Alex Rivera</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[#FFD700] text-[14px]">star</span>
                <span className="text-[11px] font-bold text-[#FFD700] uppercase tracking-wider">PREMIUM</span>
              </div>
            </div>
          </div>
          <button className="text-tg-hint w-8 h-8 flex items-center justify-center hover:bg-tg-hint/10 rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
          </button>
        </div>
        <p className="text-[13px] font-medium text-tg-hint mt-3 px-1">BriefBot Power User</p>
      </div>

      {/* Available Templates Section */}
      <section className="bg-tg-bg">
        <div className="px-5 py-2">
          <h2 className="text-[20px] font-bold text-tg-text tracking-tight">
            Available Templates
          </h2>
        </div>
        <div className="px-4 mt-2 mb-6">
          <TemplatePicker
            templates={TEMPLATES}
            selected={selected}
            onSelect={onSelect}
            disabled={saving}
          />
        </div>
      </section>

      <div className="px-4 mt-8 pb-4">
        <button
          className="w-full bg-tg-button text-tg-button-text font-semibold py-4 rounded-xl transition-all active:scale-[0.98] active:bg-tg-button/90 shadow-lg shadow-tg-button/20 flex justify-center items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Create Brief from Template
        </button>
      </div>

    </div>
  );
}
