"use client";
import React, { useState, useCallback, useMemo } from 'react';
import { type Brief, BriefRow } from '@/src/entities/brief';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTelegram } from '@/src/shared/lib/telegram';
import { createApiFetch } from '@/src/shared/api';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState, SegmentedControl } from '@/src/shared/ui';

interface HistoryTabProps {
  briefs: Brief[];
}

type FilterView = "new" | "archive";

export function HistoryTab({ briefs: initialBriefs }: HistoryTabProps) {
  const { initData } = useTelegram();
  const [briefs, setBriefs] = useState<Brief[]>(initialBriefs);
  const [view, setView] = useState<FilterView>("new");
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const apiFetch = useCallback(
    (path: string, opts?: RequestInit) => createApiFetch(initData)(path, opts),
    [initData]
  );

  // Filter local briefs based on view
  const filteredBriefs = useMemo(() => {
    if (view === "new") {
      return briefs.filter(b => !b.is_downloaded);
    }
    return briefs; // Archive shows all, or you could filter to only downloaded ones if requested.
  }, [briefs, view]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);

      // We only download the current filtered view targets
      const targets = filteredBriefs.filter(b => b.pdf_url);

      if (targets.length === 0) {
        setError(view === "new" ? "Нет новых брифов для скачивания" : "Нет доступных PDF-файлов");
        return;
      }

      const recordIds = targets.map(t => t.id);

      // Request backend to get explicit valid URLs and mark them as downloaded
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

      // Download files into JSZip
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

      // Generate ZIP and trigger save download
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, view === "new" ? "new_briefs.zip" : "all_briefs.zip");

      // Update local state to reflect downloaded status
      setBriefs(prev => prev.map(b => recordIds.includes(b.id) ? { ...b, is_downloaded: true } : b));

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла неизвестная ошибка");
    } finally {
      setDownloading(false);
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
    <div className="flex flex-col flex-1 h-full font-sans text-tg-text">

      {/* ── Search Bar & Download Button ──────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-tg-bg flex items-center gap-2 animate-in">
        <label className="flex flex-col flex-1 min-w-40 h-11">
          <div className="flex w-full flex-1 items-stretch rounded-xl h-full bg-[var(--tg-theme-secondary-bg-color,#efeff3)] dark:bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] border border-transparent focus-within:border-[var(--tg-theme-button-color,#3e88f7)]/50 transition-all">
            <div className="text-tg-hint flex items-center justify-center pl-4">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              type="text"
              placeholder="Search your briefs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-tg-text focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-tg-hint px-3 text-sm font-normal leading-normal"
            />
          </div>
        </label>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloading || filteredBriefs.filter(b => b.pdf_url).length === 0}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tg-button hover:bg-tg-button/90 text-tg-button-text transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          title="Download Displayed Briefs"
        >
          {downloading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[20px]">download</span>
          )}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-[13px] flex items-center gap-2 animate-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Segmented Control Tabs */}
      <div className="px-4 pb-2 bg-tg-bg">
        <SegmentedControl
          segments={[
            { id: "new", label: "New" },
            { id: "archive", label: "Archive" }
          ]}
          activeSegment={view}
          onChange={(id) => setView(id as FilterView)}
        />
      </div>

      {/* Content Area */}
      {filteredBriefs.length === 0 && !isSearching ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="flex items-center gap-2 px-4 mb-1 mt-4">
            <span className="material-symbols-outlined text-tg-hint text-[16px]">history</span>
            <p className="text-[12px] font-bold uppercase tracking-wider text-tg-hint">
              {view === "new" ? "New Briefs" : "All Briefs"}
            </p>
          </div>
          <div className="mx-4 flex flex-col gap-2 mt-2">
            <AnimatePresence mode="popLayout">
              {isSearching ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="tg-list-item flex items-center gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />
                  <p className="text-[14px] text-tg-hint">Поиск...</p>
                </motion.div>
              ) : (
                filteredBriefs.map((b, i) => (
                  <motion.div
                    layout
                    key={b.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
                  >
                    <BriefRow brief={b} isLast={i === filteredBriefs.length - 1} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
