"use client";

import React, { useState } from 'react';
import { type UserSettings } from '@/src/entities/user';
import { SegmentedControl } from '@/src/shared/ui/SegmentedControl';
import { BriefSettings } from './BriefSettings';
import { BrandingSettings } from './BrandingSettings';
import { OutputSettings } from './OutputSettings';
import { AccountSettings } from './AccountSettings';

interface SettingsTabProps {
  settings: UserSettings;
  onUpdate: (field: string, value: string | boolean | number) => void;
  saving: boolean;
}

type SettingSegment = 'brief' | 'branding' | 'output' | 'account';

const SETTING_SEGMENTS = [
  { id: 'brief', label: 'Brief' },
  { id: 'branding', label: 'Branding' },
  { id: 'output', label: 'Output' },
  { id: 'account', label: 'Account' },
];

export function SettingsTab({ settings, onUpdate, saving }: SettingsTabProps) {
  const [activeSegment, setActiveSegment] = useState<SettingSegment>('brief');

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      <div className="px-4 pt-2">
        <SegmentedControl
          segments={SETTING_SEGMENTS}
          activeSegment={activeSegment}
          onChange={(id) => setActiveSegment(id as SettingSegment)}
        />
      </div>

      <div className="mt-4">
        {activeSegment === 'brief' && (
          <BriefSettings settings={settings} onUpdate={onUpdate} saving={saving} />
        )}
        {activeSegment === 'branding' && (
          <BrandingSettings settings={settings} onUpdate={onUpdate} saving={saving} />
        )}
        {activeSegment === 'output' && (
          <OutputSettings settings={settings} onUpdate={onUpdate} saving={saving} />
        )}
        {activeSegment === 'account' && (
          <AccountSettings settings={settings} onUpdate={onUpdate} saving={saving} />
        )}
      </div>

    </div>
  );
}
