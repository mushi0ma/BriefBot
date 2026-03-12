"use client";
import React from 'react';
import { TEMPLATES } from '@/src/entities/template';
import { TemplatePicker } from '@/src/features/select-template';

interface TemplatesTabProps {
  selected: string | null;
  onSelect: (slug: string) => void;
  saving: boolean;
}

export function TemplatesTab({ selected, onSelect, saving }: TemplatesTabProps) {
  return (
    <>
      <p className="tg-section-header">Шаблон по умолчанию</p>
      <div className="mx-4 flex flex-col gap-2">
        <TemplatePicker
          templates={TEMPLATES}
          selected={selected}
          onSelect={onSelect}
          disabled={saving}
        />
      </div>
      <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] px-8 mt-1.5">
        Выбранный шаблон будет использоваться по умолчанию при генерации новых брифов.
      </p>
    </>
  );
}
