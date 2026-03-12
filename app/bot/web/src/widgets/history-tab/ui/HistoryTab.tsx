"use client";
import React, { useState, useCallback } from 'react';
import { type Brief, BriefRow } from '@/src/entities/brief';
import { Inbox, Clock, Download, Archive, Loader2, AlertCircle } from 'lucide-react';
import { useTelegram } from '@/src/shared/lib/telegram';
import { createApiFetch } from '@/src/shared/api';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface HistoryTabProps {
  briefs: Brief[];
}

export function HistoryTab({ briefs: initialBriefs }: HistoryTabProps) {
  const { initData } = useTelegram();
  const [briefs, setBriefs] = useState<Brief[]>(initialBriefs);
  const [downloading, setDownloading] = useState<"new" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiFetch = useCallback(
    (path: string, opts?: RequestInit) => createApiFetch(initData)(path, opts),
    [initData]
  );

  const handleDownload = async (type: "new" | "all") => {
    try {
      setDownloading(type);
      setError(null);

      // 1. Filter targets
      let targets = briefs.filter(b => b.pdf_url);
      if (type === "new") {
        targets = targets.filter(b => !b.is_downloaded);
      }

      if (targets.length === 0) {
        setError(type === "new" ? "Нет новых брифов для скачивания" : "Нет доступных PDF-файлов");
        return;
      }

      const recordIds = targets.map(t => t.id);

      // 2. Request backend to get explicit valid URLs and mark them as downloaded
      const res = await apiFetch("/api/history/download-bulk", {
        method: "POST",
        body: JSON.stringify({ record_ids: recordIds }),
      });

      if (!res.ok) {
        throw new Error("Ошибка при запросе файлов");
      }

      const data = await res.json();
      const urls: { id: string, url: string, title: string }[] = data.urls || [];

      if (urls.length === 0) {
        setError("Не удалось получить ссылки на файлы");
        return;
      }

      // 3. Download files into JSZip
      const zip = new JSZip();
      let added = 0;

      await Promise.all(
        urls.map(async (item) => {
          try {
            const fileRes = await fetch(item.url);
            if (!fileRes.ok) throw new Error(`Status ${fileRes.status}`);
            const blob = await fileRes.blob();
            // ensure safe filename
            const safeTitle = item.title.replace(/[^a-zA-Zа-яА-Я0-9\s-_]/g, "").trim() || "Document";
            const filename = `${safeTitle}_${item.id.slice(0, 8)}.pdf`;
            zip.file(filename, blob);
            added++;
          } catch (e) {
            console.error(`Failed to download ${item.url}:`, e);
          }
        })
      );

      if (added === 0) {
        throw new Error("Не удалось загрузить ни одного файла");
      }

      // 4. Generate ZIP and trigger save download
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, type === "new" ? "new_briefs.zip" : "all_briefs.zip");

      // 5. Update local state to reflect downloaded status
      setBriefs(prev => prev.map(b => recordIds.includes(b.id) ? { ...b, is_downloaded: true } : b));

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла неизвестная ошибка");
    } finally {
      setDownloading(null);
    }
  };

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
      {error && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-[13px] flex items-center gap-2 animate-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 mb-3">
        <button
          onClick={() => handleDownload("new")}
          disabled={downloading !== null}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--tg-theme-button-color,#3e88f7)] text-white text-[14px] font-medium transition-opacity disabled:opacity-50 active:scale-[0.98]"
        >
          {downloading === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Новые
        </button>
        <button
          onClick={() => handleDownload("all")}
          disabled={downloading !== null}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#efeff3)] text-[var(--tg-theme-text-color,#000)] text-[14px] font-medium transition-opacity disabled:opacity-50 active:scale-[0.98]"
        >
          {downloading === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
          Весь архив
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 mb-1 mt-4">
        <Clock className="w-4 h-4 text-[var(--tg-theme-hint-color,#98989e)]" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
          Последние брифы
        </p>
      </div>
      <div className="mx-4 flex flex-col gap-2">
        {briefs.map((b, i) => (
          <BriefRow key={b.id} brief={b} isLast={i === briefs.length - 1} />
        ))}
      </div>
    </>
  );
}
