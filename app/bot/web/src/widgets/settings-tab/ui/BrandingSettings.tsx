"use client";

import React from 'react';
import { type UserSettings } from '@/src/entities/user';
import { BrandColorPicker, LogoInput } from '@/src/features/update-settings';
import { Palette, Image as ImageIcon } from 'lucide-react';

interface BrandingSettingsProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string | boolean | number) => void;
  saving: boolean;
}

export function BrandingSettings({ settings, onUpdate, saving }: BrandingSettingsProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="bg-tg-bg rounded-2xl">
        <div className="flex items-center gap-2 px-4 py-3">
          <Palette className="w-5 h-5 text-tg-hint" />
          <h2 className="text-[17px] font-semibold text-tg-text">
            PDF Accent Color
          </h2>
        </div>
        <div className="p-4 bg-tg-secondary-bg/50 rounded-2xl mx-4 shadow-sm border border-tg-hint/10">
          <BrandColorPicker
            value={settings.brand_color}
            onChange={(c) => onUpdate("brand_color", c)}
            disabled={saving}
          />
        </div>
      </section>

      <section className="bg-tg-bg rounded-2xl">
        <div className="flex items-center gap-2 px-4 py-3">
          <ImageIcon className="w-5 h-5 text-tg-hint" />
          <h2 className="text-[17px] font-semibold text-tg-text">
            Company Logo
          </h2>
        </div>
        <div className="p-4 bg-tg-secondary-bg/50 rounded-2xl mx-4 shadow-sm border border-tg-hint/10">
          <LogoInput
            initialValue={settings.logo_url ?? ""}
            onSave={(url) => onUpdate("logo_url", url)}
            disabled={saving}
          />
        </div>
      </section>
    </div>
  );
}
