"use client";
import React from 'react';
import { type UserSettings } from '@/src/entities/user';
import { BrandColorPicker, LogoInput } from '@/src/features/update-settings';
import { Palette, ImageIcon } from 'lucide-react';

interface SettingsTabProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string) => void;
  saving: boolean;
}

export function SettingsTab({ settings, onUpdate, saving }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Brand Color Section */}
      <section>
        <div className="flex items-center gap-2 px-4 mb-2">
          <Palette className="w-4 h-4 text-[var(--tg-theme-hint-color,#98989e)]" />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
            Цвет акцента PDF
          </p>
        </div>
        <div className="mx-4 tg-section rounded-xl p-4">
          <BrandColorPicker
            value={settings.brand_color}
            onChange={(c) => onUpdate("brand_color", c)}
            disabled={saving}
          />
        </div>
      </section>

      {/* Logo Section */}
      <section>
        <div className="flex items-center gap-2 px-4 mb-2">
          <ImageIcon className="w-4 h-4 text-[var(--tg-theme-hint-color,#98989e)]" />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
            Логотип
          </p>
        </div>
        <div className="mx-4 tg-section rounded-xl p-4">
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
