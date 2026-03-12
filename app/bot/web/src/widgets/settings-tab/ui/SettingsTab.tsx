"use client";
import React, { useState } from 'react';
import { type UserSettings } from '@/src/entities/user';
import { BrandColorPicker, LogoInput } from '@/src/features/update-settings';
import { Palette, ImageIcon, SlidersHorizontal } from 'lucide-react';
import { Toggle } from '@/src/shared/ui';

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
        <div className="flex items-center gap-2 px-4 mb-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--tg-theme-hint-color,#98989e)]" />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
            Кастомизация брифа
          </p>
        </div>
        <div className="mx-4 rounded-xl overflow-hidden border border-[var(--border-color)]">
          {BRIEF_TOGGLES.map((toggle, i) => (
            <div
              key={toggle.key}
              className={`flex items-center justify-between px-4 py-3.5 bg-[var(--tg-theme-bg-color,#1c1c1e)] ${
                i < BRIEF_TOGGLES.length - 1 ? "border-b border-[var(--border-color)]" : ""
              }`}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-[14px] font-medium text-[var(--tg-theme-text-color,#fff)]">
                  {toggle.label}
                </p>
                <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] mt-0.5">
                  {toggle.description}
                </p>
              </div>
              <Toggle
                checked={toggles[toggle.key] ?? true}
                onChange={(v) => handleToggle(toggle.key, v)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Brand Color */}
      <section>
        <div className="flex items-center gap-2 px-4 mb-2">
          <Palette className="w-3.5 h-3.5 text-[var(--tg-theme-hint-color,#98989e)]" />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
            Цвет акцента PDF
          </p>
        </div>
        <div className="mx-4 rounded-xl p-4 bg-[var(--tg-theme-bg-color,#1c1c1e)] border border-[var(--border-color)]">
          <BrandColorPicker
            value={settings.brand_color}
            onChange={(c) => onUpdate("brand_color", c)}
            disabled={saving}
          />
        </div>
      </section>

      {/* Logo */}
      <section>
        <div className="flex items-center gap-2 px-4 mb-2">
          <ImageIcon className="w-3.5 h-3.5 text-[var(--tg-theme-hint-color,#98989e)]" />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
            Логотип
          </p>
        </div>
        <div className="mx-4 rounded-xl p-4 bg-[var(--tg-theme-bg-color,#1c1c1e)] border border-[var(--border-color)]">
          <LogoInput
            initialValue={settings.logo_url ?? ""}
            onSave={(url) => onUpdate("logo_url", url)}
            disabled={saving}
          />
        </div>
        <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] px-8 mt-1.5">
          Логотип будет отображаться в ваших PDF-брифах.
        </p>
      </section>
    </div>
  );
}
