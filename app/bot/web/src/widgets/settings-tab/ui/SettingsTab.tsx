"use client";
import React from 'react';
import { type UserSettings } from '@/src/entities/user';
import { BrandColorPicker, LogoInput } from '@/src/features/update-settings';

interface SettingsTabProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string) => void;
  saving: boolean;
}

export function SettingsTab({ settings, onUpdate, saving }: SettingsTabProps) {
  return (
    <>
      <p className="tg-section-header">Цвет акцента PDF</p>
      <div className="mx-4 tg-section p-4">
        <BrandColorPicker
          value={settings.brand_color}
          onChange={(c) => onUpdate("brand_color", c)}
          disabled={saving}
        />
      </div>

      <p className="tg-section-header mt-6">Логотип</p>
      <div className="mx-4 tg-section p-4">
        <LogoInput
          initialValue={settings.logo_url ?? ""}
          onSave={(url) => onUpdate("logo_url", url)}
          disabled={saving}
        />
      </div>
      <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] px-8 mt-1.5">
        Логотип будет отображаться в ваших PDF-брифах. Загрузите через бота или укажите URL.
      </p>
    </>
  );
}
