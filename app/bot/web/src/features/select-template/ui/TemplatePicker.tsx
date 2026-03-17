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
    <div className="flex flex-col gap-3">
      {templates.map((t) => {
        const isSelected = selected === t.slug || (selected === null && t.slug === 'default');

        return (
          <button
            key={t.slug}
            onClick={() => onSelect(t.slug)}
            disabled={disabled}
            className={`w-full text-left outline-none transition-all duration-200 rounded-[20px] p-4 flex items-center gap-4 ${
              isSelected 
                ? "bg-tg-button/10 border border-tg-button shadow-sm"
                : "bg-tg-secondary-bg/30 border border-tg-hint/10 active:scale-[0.98] hover:bg-tg-secondary-bg/50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className={`w-[48px] h-[48px] rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? "bg-tg-button text-white shadow-md shadow-tg-button/30"
                : "bg-tg-hint/10 text-tg-hint"
            }`}>
              <span className="material-symbols-outlined text-[24px]">{t.icon || "article"}</span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <div className="flex justify-between items-center">
                <p className={`text-[17px] font-semibold truncate tracking-tight ${
                  isSelected ? "text-tg-button" : "text-tg-text"
                }`}>
                  {t.name}
                </p>
                {isSelected && (
                  <span className="material-symbols-outlined text-tg-button text-[20px] ml-2 shrink-0">
                    check_circle
                  </span>
                )}
              </div>
              <p className="text-[14px] leading-snug text-tg-hint line-clamp-2 pr-2">{t.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
