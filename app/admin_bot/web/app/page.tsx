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
  ServerCrash
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
        <div className="mx-4 mt-4 bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] rounded-2xl p-8 text-center animate-in shadow-sm">
          <ServerCrash className="w-12 h-12 mx-auto text-[var(--tg-theme-hint-color,#98989e)] mb-3 opacity-50" />
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
          {stats.recentErrors.length > 0 && (
            <>
              <p className="tg-section-header mt-6">Последние ошибки</p>
              <div className="mx-4 flex flex-col gap-2">
                {stats.recentErrors.map((err) => (
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
                    <p className="text-[14px] text-[#ff453a]/90 break-words leading-relaxed">{err.error_message}</p>
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
