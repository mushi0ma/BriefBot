"use client";
import React from 'react';
import { type Template } from '@/src/entities/template';
import { Check, ChevronRight, Target, Paintbrush, Code2, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  default: Target,
  design: Paintbrush,
  development: Code2,
  marketing: BarChart3,
};

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
        const Icon = ICON_MAP[t.slug] || Target;
        return (
          <button
            key={t.slug}
            onClick={() => onSelect(t.slug)}
            disabled={disabled}
            className={`tg-list-item w-full text-left transition-all duration-200 ${
              i > 0 ? "border-t border-[var(--tg-separator)] !ml-0 !pl-4" : ""
            } ${isSelected ? "bg-[var(--tg-theme-button-color,#3e88f7)]/5" : "hover:bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)]/50"}`}
          >
            <div className={`tg-list-icon rounded-xl transition-colors duration-200 ${
              isSelected
                ? "bg-[var(--tg-theme-button-color,#3e88f7)] text-white"
                : "bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-[var(--tg-theme-button-color,#3e88f7)]"
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px]">{t.name}</p>
              <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">{t.desc}</p>
            </div>
            {isSelected ? (
              <Check className="w-5 h-5 text-[var(--tg-theme-button-color,#3e88f7)]" strokeWidth={3} />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--tg-theme-hint-color,#98989e)]" />
            )}
          </button>
        );
      })}
    </>
  );
}
