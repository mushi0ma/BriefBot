import React from 'react';
import type { Brief } from '../model/schema';
import { formatDate, stateInfo } from '../model/helpers';
import { FileText, Download } from 'lucide-react';

export function BriefRow({ brief, isLast }: { brief: Brief; isLast: boolean }) {
  const status = stateInfo(brief.processing_state);
  const summary = brief.brief_data?.summary;
  const hasPdf = brief.pdf_url && brief.pdf_url.startsWith("http");

  return (
    <div className="tg-list-item flex-col !items-stretch !gap-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="tg-list-icon bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-[var(--tg-theme-button-color,#3e88f7)]">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-[15px] font-medium truncate flex items-center gap-1.5 text-[var(--tg-theme-text-color,#fff)]">
              <span>{brief.template_slug.charAt(0).toUpperCase() + brief.template_slug.slice(1)}</span>
              {brief.is_downloaded && (
                <span className="bg-green-500/10 text-green-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md">
                  Сохранен
                </span>
              )}
            </p>
            <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">
              {formatDate(brief.created_at)}
            </p>
          </div>
        </div>
        <span className={`tg-badge ${status.color}`}>{status.label}</span>
      </div>

      {summary && (
        <p className="text-[14px] leading-relaxed text-[var(--tg-theme-hint-color,#98989e)] mt-3 ml-[48px] line-clamp-2">
          {summary}
        </p>
      )}

      {hasPdf && (
        <a
          href={brief.pdf_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 mt-3 ml-[48px] text-[14px] font-medium text-[var(--tg-theme-button-color,#3e88f7)] transition-opacity duration-200 hover:opacity-80"
        >
          <Download className="w-4 h-4" /> Скачать PDF
        </a>
      )}
    </div>
  );
}
