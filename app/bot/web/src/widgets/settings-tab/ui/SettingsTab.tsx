"use client";

import React, { useState } from 'react';
import { type UserSettings } from '@/src/entities/user';
import { BrandColorPicker, LogoInput } from '@/src/features/update-settings';
import { Palette, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';

interface SettingsTabProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string) => void;
  saving: boolean;
}

interface BriefToggle {
  key: string;
  label: string;
  description: string;
}

const BRIEF_TOGGLES: BriefToggle[] = [
  { key: "include_assessment", label: "Оценка клиента", description: "Включить блок с анализом клиента" },
  { key: "include_keywords", label: "Ключевые слова", description: "Добавлять теги и ключевые слова" },
  { key: "include_summary", label: "Итоговая сводка", description: "Краткое резюме в конце брифа" },
];

export function SettingsTab({ settings, onUpdate, saving }: SettingsTabProps) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    include_assessment: true,
    include_keywords: true,
    include_summary: true,
  });

  const handleToggle = (key: string, value: boolean) => {
    setToggles((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Brief Customization */}
      <section>
        <div className="flex items-center gap-2 px-1 mb-2">
          <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-900 uppercase tracking-wide">
            Кастомизация брифа
          </h2>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden divide-y divide-zinc-100">
          {BRIEF_TOGGLES.map((toggle) => {
            const isChecked = toggles[toggle.key] ?? true;
            return (
              <div
                key={toggle.key}
                className="flex items-center justify-between p-4 bg-white"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-zinc-900">
                    {toggle.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {toggle.description}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  disabled={saving}
                  onClick={() => handleToggle(toggle.key, !isChecked)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 border border-zinc-200 ${
                    isChecked ? "bg-zinc-900 border-zinc-900" : "bg-zinc-100"
                  } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                      isChecked ? "translate-x-4 bg-white" : "translate-x-0.5 bg-zinc-400"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Brand Color */}
      <section>
        <div className="flex items-center gap-2 px-1 mb-2">
          <Palette className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-900 uppercase tracking-wide">
            Цвет акцента PDF
          </h2>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm p-4">
          <BrandColorPicker
            value={settings.brand_color}
            onChange={(c) => onUpdate("brand_color", c)}
            disabled={saving}
          />
        </div>
      </section>

      {/* Logo */}
      <section>
        <div className="flex items-center gap-2 px-1 mb-2">
          <ImageIcon className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-900 uppercase tracking-wide">
            Логотип
          </h2>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm p-4">
          <LogoInput
            initialValue={settings.logo_url ?? ""}
            onSave={(url) => onUpdate("logo_url", url)}
            disabled={saving}
          />
        </div>
        <p className="text-xs text-zinc-500 px-1 mt-2">
          Логотип будет отображаться в ваших PDF-брифах.
        </p>
      </section>
    </div>
  );
}
