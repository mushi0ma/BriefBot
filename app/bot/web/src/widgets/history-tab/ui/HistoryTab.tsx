"use client";
import React from 'react';
import { type Brief, BriefRow } from '@/src/entities/brief';

interface HistoryTabProps {
  briefs: Brief[];
}

export function HistoryTab({ briefs }: HistoryTabProps) {
  if (briefs.length === 0) {
    return (
      <div className="px-4">
        <div className="tg-section p-6 text-center">
          <p className="text-[40px] mb-2">📭</p>
          <p className="text-[15px] text-[var(--tg-theme-hint-color,#98989e)]">
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
      <p className="tg-section-header">Последние брифы</p>
      <div className="mx-4 tg-section">
        {briefs.map((b, i) => (
          <BriefRow key={b.id} brief={b} isLast={i === briefs.length - 1} />
        ))}
      </div>
    </>
  );
}
