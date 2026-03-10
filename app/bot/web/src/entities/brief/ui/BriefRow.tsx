import React from 'react';
import type { Brief } from '../model/schema';
import { formatDate, stateInfo } from '../model/helpers';

export function BriefRow({ brief, isLast }: { brief: Brief; isLast: boolean }) {
  const status = stateInfo(brief.processing_state);
  const summary = brief.brief_data?.summary;
  const hasPdf = brief.pdf_url && brief.pdf_url.startsWith("http");

  return (
    <div className={`tg-list-item flex-col !items-stretch !gap-0 ${!isLast ? "border-b border-[var(--tg-separator)]" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="tg-list-icon bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-xs">
            📋
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-normal truncate">
              {brief.template_slug.charAt(0).toUpperCase() + brief.template_slug.slice(1)}
            </p>
            <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">
              {formatDate(brief.created_at)}
            </p>
          </div>
        </div>
        <span className={`tg-badge ${status.color}`}>{status.label}</span>
      </div>

      {summary && (
        <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-1.5 ml-[42px] line-clamp-2">
          {summary}
        </p>
      )}

      {hasPdf && (
        <a
          href={brief.pdf_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 mt-2 ml-[42px] text-[13px] font-medium text-[var(--tg-theme-button-color,#3e88f7)]"
        >
          <span>📄</span> Скачать PDF
        </a>
      )}
    </div>
  );
}
