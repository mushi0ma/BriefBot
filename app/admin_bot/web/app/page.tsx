"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "./TelegramProvider";

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
  recentErrors: Array<{
    id: string;
    telegram_id: number;
    error_message: string;
    created_at: string;
  }>;
  topUsers: Array<{
    telegram_id: number;
    username: string;
    first_name: string;
    briefs_count: number;
  }>;
  timestamp: string;
}

/* ── Metric Row (BotFather list style) ───────────────────────── */
function MetricRow({
  icon, iconBg, label, value, detail,
}: {
  icon: string; iconBg: string; label: string; value: string | number; detail?: string;
}) {
  return (
    <div className="tg-list-item">
      <div className="tg-list-icon" style={{ backgroundColor: iconBg + "18" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px]">{label}</p>
        {detail && <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">{detail}</p>}
      </div>
      <span className="text-[15px] font-semibold text-[var(--tg-theme-hint-color,#98989e)]">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { initData, isReady } = useTelegram();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="mx-4 mt-4 tg-section p-6 text-center animate-in">
          <p className="text-[40px] mb-2">🤖</p>
          <p className="text-[15px] text-[var(--tg-theme-hint-color,#98989e)]">
            Откройте через Telegram
          </p>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────── */}
      {loading ? (
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
          <div className="mx-4 tg-section">
            <MetricRow icon="👥" iconBg="#3e88f7" label="Пользователей" value={stats.users.total} />
            <MetricRow icon="📋" iconBg="#30d158" label="Брифов за сегодня" value={stats.briefs.today} />
            <MetricRow icon="📄" iconBg="#ff9f0a" label="Всего брифов" value={stats.briefs.total} />
            <MetricRow icon="✅" iconBg="#30d158" label="Успешность" value={`${stats.briefs.successRate}%`} />
          </div>

          {/* ── Processing Stats ────────────────────────────────── */}
          <p className="tg-section-header mt-6">Обработка</p>
          <div className="mx-4 tg-section p-4">
            <div className="tg-progress-track mb-2.5">
              <div
                className="tg-progress-fill bg-[#30d158]"
                style={{ width: `${stats.briefs.total > 0 ? (stats.briefs.successful / stats.briefs.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">
              <span>✅ {stats.briefs.successful} успешных</span>
              <span>❌ {stats.briefs.failed} ошибок</span>
            </div>
          </div>

          {/* ── Top Users ───────────────────────────────────────── */}
          {stats.topUsers.length > 0 && (
            <>
              <p className="tg-section-header mt-6">Топ пользователей</p>
              <div className="mx-4 tg-section">
                {stats.topUsers.map((user, i) => (
                  <div key={user.telegram_id} className="tg-list-item">
                    <div className="tg-list-icon bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-sm">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] truncate">
                        {user.username ? `@${user.username}` : user.first_name || `ID:${user.telegram_id}`}
                      </p>
                    </div>
                    <span className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] font-mono">
                      {user.briefs_count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Recent Errors ───────────────────────────────────── */}
          {stats.recentErrors.length > 0 && (
            <>
              <p className="tg-section-header mt-6">Последние ошибки</p>
              <div className="mx-4 tg-section">
                {stats.recentErrors.map((err) => (
                  <div key={err.id} className="tg-list-item flex-col !items-stretch !gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">
                        User {err.telegram_id}
                      </span>
                      <span className="text-[11px] text-[var(--tg-theme-hint-color,#98989e)]">
                        {new Date(err.created_at).toLocaleString("ru-RU", {
                          hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#ff453a] truncate">{err.error_message}</p>
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
