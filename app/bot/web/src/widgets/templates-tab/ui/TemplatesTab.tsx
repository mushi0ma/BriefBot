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
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1 mb-1">
          <LayoutGrid className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-900 uppercase tracking-wide">
            Шаблон по умолчанию
          </h2>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden p-2">
          <TemplatePicker
            templates={TEMPLATES}
            selected={selected}
            onSelect={onSelect}
            disabled={saving}
          />
        </div>
        <p className="text-xs text-zinc-500 px-1 mt-1">
          Выбранный шаблон будет использоваться по умолчанию при генерации новых брифов.
        </p>
      </div>
    </div>
  );
}
