"use client";
import React from 'react';
import { type Template } from '@/src/entities/template';

interface TemplatePickerProps {
  templates: Template[];
  selected: string | null;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

export function TemplatePicker({ templates, selected, onSelect, disabled }: TemplatePickerProps) {
  return (
    <>
      {templates.map((t, i) => {
        const isSelected = selected === t.slug;
        return (
          <button
            key={t.slug}
            onClick={() => onSelect(t.slug)}
            disabled={disabled}
            className={`tg-list-item w-full text-left ${i > 0 ? "border-t border-[var(--tg-separator)] !ml-0 !pl-4" : ""}`}
          >
            <div className="tg-list-icon bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-base">
              {t.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px]">{t.name}</p>
              <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">{t.desc}</p>
            </div>
            {isSelected ? (
              <span className="text-[var(--tg-theme-button-color,#3e88f7)] text-lg">✓</span>
            ) : (
              <span className="tg-chevron">›</span>
            )}
          </button>
        );
      })}
    </>
  );
}
