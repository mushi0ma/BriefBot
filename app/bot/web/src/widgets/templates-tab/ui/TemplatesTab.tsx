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
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-4 mb-1">
        <LayoutGrid className="w-3.5 h-3.5 text-[var(--tg-theme-hint-color,#98989e)]" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
          Шаблон по умолчанию
        </p>
      </div>
      <div className="mx-4 flex flex-col gap-2">
        <TemplatePicker
          templates={TEMPLATES}
          selected={selected}
          onSelect={onSelect}
          disabled={saving}
        />
      </div>
      <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] px-8 mt-1">
        Выбранный шаблон будет использоваться по умолчанию при генерации новых брифов.
      </p>
    </div>
  );
}
