"use client";
import React, { useState, useCallback } from 'react';
import { type Brief, BriefRow } from '@/src/entities/brief';
import { Clock, Download, Archive, Loader2, AlertCircle } from 'lucide-react';
import { useTelegram } from '@/src/shared/lib/telegram';
import { createApiFetch } from '@/src/shared/api';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { EmptyState } from '@/src/shared/ui';
import { Search } from 'lucide-react';

interface HistoryTabProps {
  briefs: Brief[];
}

export function HistoryTab({ briefs: initialBriefs }: HistoryTabProps) {
  const { initData } = useTelegram();
  const [briefs, setBriefs] = useState<Brief[]>(initialBriefs);
  const [downloading, setDownloading] = useState<"new" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const res = await apiFetch(`/api/history?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setBriefs(data.briefs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [apiFetch]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery, performSearch]);

  return (
    <>
      {/* ── Search Bar ──────────────────────────────────────────── */}
      <div className="px-4 mt-2 mb-4 animate-in">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[var(--tg-theme-hint-color,#98989e)]" />
          </div>
          <input
            type="text"
            placeholder="Поиск брифов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-none ring-1 ring-inset ring-[var(--tg-separator,rgba(84,84,88,0.35))] bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] text-[var(--tg-theme-text-color,#fff)] placeholder:text-[var(--tg-theme-hint-color,#98989e)] focus:ring-2 focus:ring-inset focus:ring-[var(--tg-theme-button-color,#3e88f7)] sm:text-sm sm:leading-6"
          />
        </div>
      </div>

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

      {briefs.length === 0 && !isSearching ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 mb-1 mt-4">
            <Clock className="w-4 h-4 text-[var(--tg-theme-hint-color,#98989e)]" />
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color,#98989e)]">
              Последние брифы
            </p>
          </div>
          <div className="mx-4 flex flex-col gap-2">
            {isSearching ? (
              <div className="tg-list-item">
                <p className="text-[14px] text-[var(--tg-theme-hint-color,#98989e)]">Поиск...</p>
              </div>
            ) : (
              briefs.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
                >
                  <BriefRow brief={b} isLast={i === briefs.length - 1} />
                </motion.div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}
