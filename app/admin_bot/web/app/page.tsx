"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "./TelegramProvider";
import {
  Users,
  FileText,
  LayoutList,
  CheckCircle2,
  Trophy,
  Medal,
  AlertTriangle,
  ServerCrash,
  Search
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */
interface StatsData {
  users: { total: number };
  briefs: {
    total: number;
    today: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  recentBriefs: Array<{
    id: string;
    telegram_id: number;
    template_slug: string;
    processing_state: string;
    created_at: string;
    error_message?: string;
  }>;
  topUsers: Array<{
    telegram_id: number;
    username: string;
    first_name: string;
    briefs_count: number;
  }>;
  timestamp: string;
}

/* ── Metric Row (Card style) ───────────────────────── */
function MetricRow({
  icon: Icon, iconBg, iconColor, label, value, detail,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string; label: string; value: string | number; detail?: string;
}) {
  return (
    <div className="tg-list-item">
      <div className="tg-list-icon" style={{ backgroundColor: iconBg + "18", color: iconColor }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-tight">{label}</p>
        {detail && <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-0.5">{detail}</p>}
      </div>
      <span className="text-[16px] font-semibold tracking-tight text-[var(--tg-theme-text-color,#fff)]">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { initData, isReady } = useTelegram();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<"briefs" | "users">("users");

  const fetchStats = useCallback(async () => {
    if (!initData && isReady) { setLoading(false); return; }
    try {
      const res = await fetch("/api/stats", { headers: { Authorization: initData } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `HTTP ${res.status}`); }
      setStats(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally { setLoading(false); }
  }, [initData, isReady]);

  const performSearch = useCallback(async (query: string, type: string) => {
    if (!query) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`, {
        headers: { Authorization: initData }
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [initData]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery, searchType);
      } else {
        setSearchResults(null);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery, searchType, performSearch]);

  useEffect(() => { if (isReady) fetchStats(); }, [isReady, fetchStats]);
  useEffect(() => {
    if (!isReady) return;
    const i = setInterval(fetchStats, 30000);
    return () => clearInterval(i);
  }, [isReady, fetchStats]);

  if (!isReady) return null;

  return (
    <main className="min-h-screen pb-8 max-w-lg mx-auto">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold">BriefBot Admin</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-[#30d158] animate-pulse-dot" />
            <span className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">Live</span>
          </div>
        </div>
        <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-0.5">Панель управления</p>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-3 tg-section p-3 border border-[#ff453a]/20">
          <p className="text-[13px] text-[#ff453a]">⚠️ {error}</p>
        </div>
      )}

      {/* ── No Telegram ─────────────────────────────────────────── */}
      {!initData && isReady && (
        <div className="mx-4 mt-4 bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] rounded-2xl p-8 text-center animate-in shadow-sm">
          <ServerCrash className="w-12 h-12 mx-auto text-[var(--tg-theme-hint-color,#98989e)] mb-3 opacity-50" />
          <p className="text-[15px] text-[var(--tg-theme-hint-color,#98989e)]">
            Откройте через Telegram
          </p>
        </div>
      )}

      {/* ── Search Bar ──────────────────────────────────────────── */}
      {initData && isReady && (
        <div className="px-4 mt-4 animate-in">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--tg-theme-hint-color,#98989e)]" />
            </div>
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-none ring-1 ring-inset ring-[var(--tg-separator,rgba(84,84,88,0.35))] bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] text-[var(--tg-theme-text-color,#fff)] placeholder:text-[var(--tg-theme-hint-color,#98989e)] focus:ring-2 focus:ring-inset focus:ring-[var(--tg-theme-button-color,#3e88f7)] sm:text-sm sm:leading-6"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setSearchType("users")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                searchType === "users"
                  ? "bg-[var(--tg-theme-button-color,#3e88f7)] text-white"
                  : "bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] text-[var(--tg-theme-text-color,#fff)]"
              }`}
            >
              Пользователи
            </button>
            <button
              onClick={() => setSearchType("briefs")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                searchType === "briefs"
                  ? "bg-[var(--tg-theme-button-color,#3e88f7)] text-white"
                  : "bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] text-[var(--tg-theme-text-color,#fff)]"
              }`}
            >
              Брифы
            </button>
          </div>
        </div>
      )}

      {/* ── Search Results ──────────────────────────────────────── */}
      {searchQuery ? (
        <div className="mt-4 animate-in">
          <p className="tg-section-header">Результаты поиска</p>
          <div className="mx-4 flex flex-col gap-2">
            {isSearching ? (
              <div className="tg-list-item">
                <p className="text-[14px] text-[var(--tg-theme-hint-color,#98989e)]">Поиск...</p>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((res) => (
                <div key={res.id || res.telegram_id} className="tg-list-item flex-col !items-stretch !gap-1 !py-3">
                  {searchType === "users" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="font-medium text-[var(--tg-theme-text-color,#fff)]">
                          {res.username ? `@${res.username}` : res.first_name || "Без имени"}
                        </span>
                        <span className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)]">ID: {res.telegram_id}</span>
                      </div>
                      <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">Брифов: {res.briefs_count}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="font-medium text-[var(--tg-theme-text-color,#fff)]">
                          {res.title || res.template_slug || "Бриф"}
                        </span>
                        <span className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] font-mono">
                          User ID: {res.telegram_id}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">
                          Статус: {res.processing_state}
                        </p>
                        <span className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)]">
                          {new Date(res.created_at).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="tg-list-item">
                <p className="text-[14px] text-[var(--tg-theme-hint-color,#98989e)]">Ничего не найдено</p>
              </div>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="px-4 mt-4 space-y-3 animate-in">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="tg-section p-4 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="animate-in">
          {/* ── Key Metrics ─────────────────────────────────────── */}
          <p className="tg-section-header mt-4">Показатели</p>
          <div className="mx-4 flex flex-col gap-2">
            <MetricRow icon={Users} iconColor="#3e88f7" iconBg="#3e88f7" label="Пользователей" value={stats.users.total} />
            <MetricRow icon={FileText} iconColor="#30d158" iconBg="#30d158" label="Брифов за сегодня" value={stats.briefs.today} />
            <MetricRow icon={LayoutList} iconColor="#ff9f0a" iconBg="#ff9f0a" label="Всего брифов" value={stats.briefs.total} />
            <MetricRow icon={CheckCircle2} iconColor="#30d158" iconBg="#30d158" label="Успешность" value={`${stats.briefs.successRate}%`} />
          </div>

          {/* ── Processing Stats ────────────────────────────────── */}
          <p className="tg-section-header mt-6">Обработка</p>
          <div className="mx-4 bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] rounded-xl p-5 shadow-sm">
            <div className="tg-progress-track mb-3">
              <div
                className="tg-progress-fill bg-[#30d158]"
                style={{ width: `${stats.briefs.total > 0 ? (stats.briefs.successful / stats.briefs.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[13px] font-medium text-[var(--tg-theme-hint-color,#98989e)]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#30d158]" /> {stats.briefs.successful} успешных</span>
              <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#ff453a]" /> {stats.briefs.failed} ошибок</span>
            </div>
          </div>

          {/* ── Top Users ───────────────────────────────────────── */}
          {stats.topUsers.length > 0 && (
            <>
              <p className="tg-section-header mt-6">Топ пользователей</p>
              <div className="mx-4 flex flex-col gap-2">
                {stats.topUsers.map((user, i) => (
                  <div key={user.telegram_id} className="tg-list-item">
                    <div className={`tg-list-icon ${
                      i === 0 ? "bg-[#ffd60a]/10 text-[#ffd60a]" :
                      i === 1 ? "bg-[#8e8e93]/10 text-[#8e8e93]" :
                      i === 2 ? "bg-[#ff9f0a]/10 text-[#ff9f0a]" :
                      "bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-[var(--tg-theme-button-color,#3e88f7)]"
                    }`}>
                      {i === 0 ? <Trophy className="w-5 h-5" /> :
                       i <= 2 ? <Medal className="w-5 h-5" /> :
                       <span className="text-[14px] font-bold">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium truncate text-[var(--tg-theme-text-color,#fff)]">
                        {user.username ? `@${user.username}` : user.first_name || `ID:${user.telegram_id}`}
                      </p>
                    </div>
                    <span className="text-[15px] font-semibold text-[var(--tg-theme-hint-color,#98989e)] font-mono">
                      {user.briefs_count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Recent Errors ───────────────────────────────────── */}
          {stats.recentBriefs && stats.recentBriefs.filter((b) => b.processing_state === 'failed').length > 0 && (
            <>
              <p className="tg-section-header mt-6">Последние ошибки</p>
              <div className="mx-4 flex flex-col gap-2">
                {stats.recentBriefs.filter((b) => b.processing_state === 'failed').slice(0, 5).map((err) => (
                  <div key={err.id} className="tg-list-item flex-col !items-stretch !gap-3 !py-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#ff453a]" />
                        <span className="text-[13px] font-medium text-[var(--tg-theme-hint-color,#98989e)]">
                          User {err.telegram_id}
                        </span>
                      </div>
                      <span className="text-[12px] font-medium text-[var(--tg-theme-hint-color,#98989e)]/70">
                        {new Date(err.created_at).toLocaleString("ru-RU", {
                          hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[14px] text-[#ff453a]/90 break-words leading-relaxed">{err.error_message || "Неизвестная ошибка"}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Footer ──────────────────────────────────────────── */}
          <p className="text-center text-[11px] text-[var(--tg-theme-hint-color,#98989e)] mt-6 px-4">
            Обновлено: {new Date(stats.timestamp).toLocaleTimeString("ru-RU")} · обновление каждые 30с
          </p>
        </div>
      ) : null}
    </main>
  );
}
