"use client";

import React, { useState, useEffect } from 'react';
import { type UserSettings } from '@/src/entities/user';

interface BriefSettingsProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string | boolean | number) => void;
  saving: boolean;
}

interface BriefToggle {
  key: keyof UserSettings;
  label: string;
  icon: string;
}

const BRIEF_TOGGLES: BriefToggle[] = [
  { key: "include_assessment", label: "Client Evaluation", icon: "assessment" },
  { key: "include_keywords", label: "Keywords Extraction", icon: "key" },
  { key: "include_summary", label: "Auto-Summary", icon: "auto_awesome" },
  { key: "include_competitors", label: "Competitor Analysis", icon: "monitoring" },
  { key: "include_tone", label: "Tone of Voice", icon: "record_voice_over" },
];

export function BriefSettings({ settings, onUpdate, saving }: BriefSettingsProps) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    include_assessment: settings.include_assessment ?? true,
    include_keywords: settings.include_keywords ?? true,
    include_summary: settings.include_summary ?? false,
    include_competitors: settings.include_competitors ?? false,
    include_tone: settings.include_tone ?? true,
  });

  useEffect(() => {
    setToggles(prev => ({
      ...prev,
      include_assessment: settings.include_assessment ?? prev.include_assessment,
      include_keywords: settings.include_keywords ?? prev.include_keywords,
      include_summary: settings.include_summary ?? prev.include_summary,
      include_competitors: settings.include_competitors ?? prev.include_competitors,
      include_tone: settings.include_tone ?? prev.include_tone,
    }));
  }, [settings]);

  const handleToggle = (key: string, value: boolean) => {
    setToggles((prev) => ({ ...prev, [key]: value }));
    onUpdate(key, value);
  };

  return (
    <section className="bg-tg-bg rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-tg-hint/10">
        <h2 className="text-[20px] font-bold text-tg-text tracking-tight">
          Brief Customization
        </h2>
      </div>
      <div className="divide-y divide-tg-hint/10 mx-4 bg-tg-secondary-bg/30 rounded-2xl border border-tg-hint/10 mt-2 shadow-sm overflow-hidden">
        {BRIEF_TOGGLES.map((toggle) => {
          const isChecked = toggles[toggle.key as string] ?? false;
          return (
            <div
              key={toggle.key}
              className="flex items-center justify-between p-4 bg-transparent transition-colors active:bg-tg-hint/5"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="material-symbols-outlined text-tg-hint text-2xl w-6 flex-shrink-0 text-center">
                  {toggle.icon}
                </span>
                <p className="text-[16px] font-medium text-tg-text">
                  {toggle.label}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                disabled={saving}
                onClick={() => handleToggle(toggle.key as string, !isChecked)}
                className={`relative inline-flex h-7 w-[50px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  isChecked ? "bg-[#34C759]" : "bg-tg-hint/30"
                } ${saving ? "opacity-50" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isChecked ? "translate-x-[24px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[13px] text-tg-hint px-6 mt-4 leading-relaxed text-center pb-4">
        These settings will apply to all future briefs generated within the system.
      </p>
    </section>
  );
}
