"use client";
import React from 'react';
import { type Brief, BriefRow } from '@/src/entities/brief';
import { Inbox, Clock } from 'lucide-react';

interface HistoryTabProps {
  briefs: Brief[];
}

export function HistoryTab({ briefs }: HistoryTabProps) {
  if (briefs.length === 0) {
    return (
      <div className="px-4">
        <div className="tg-section rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--tg-theme-button-color,#3e88f7)]/10 mb-3">
            <Inbox className="w-7 h-7 text-[var(--tg-theme-button-color,#3e88f7)]" />
          </div>
          <p className="text-[15px] text-[var(--tg-theme-text-color,#fff)]">
            Пока нет брифов
          </p>
          <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-1">
            Отправьте аудио или текст боту
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 mb-1">
        <Clock className="w-4 h-4 text-[var(--tg-theme-hint-color,#98989e)]" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
          Последние брифы
        </p>
      </div>
      <div className="mx-4 tg-section rounded-xl">
        {briefs.map((b, i) => (
          <BriefRow key={b.id} brief={b} isLast={i === briefs.length - 1} />
        ))}
      </div>
    </>
  );
}
