"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "./TelegramProvider";

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

function MetricCard({
  label,
  value,
  icon,
  accent,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <div
      className="glass-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {accent && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: accent + "20", color: accent }}
          >
            live
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-tg-text mb-1">{value}</div>
      <div className="text-sm text-tg-hint">{label}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="skeleton h-8 w-8 mb-3 rounded-full" />
      <div className="skeleton h-8 w-20 mb-2" />
      <div className="skeleton h-4 w-28" />
    </div>
  );
}

export default function Dashboard() {
  const { initData, isReady } = useTelegram();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!initData && isReady) {
      // Running outside Telegram — show demo mode
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/stats", {
        headers: { Authorization: initData },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: StatsData = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }, [initData, isReady]);

  useEffect(() => {
    if (isReady) {
      fetchStats();
    }
  }, [isReady, fetchStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [isReady, fetchStats]);

  if (!isReady) return null;

  return (
    <main className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-bold text-tg-text">📊 BriefBot Admin</h1>
          <p className="text-xs text-tg-hint mt-0.5">Панель управления</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
          <span className="text-xs text-tg-hint">Live</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card p-4 mb-4 border-red-500/30 animate-fade-in-up">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* No Telegram Context */}
      {!initData && isReady && (
        <div className="glass-card p-6 text-center mb-6 animate-fade-in-up">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-tg-hint text-sm">
            Откройте через Telegram для доступа к данным
          </p>
        </div>
      )}

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <MetricCard
              icon="👥"
              label="Пользователей"
              value={stats.users.total}
              accent="#2481cc"
              delay={0}
            />
            <MetricCard
              icon="📋"
              label="Брифов сегодня"
              value={stats.briefs.today}
              accent="#27AE60"
              delay={50}
            />
            <MetricCard
              icon="✅"
              label="Успешность"
              value={`${stats.briefs.successRate}%`}
              accent="#F39C12"
              delay={100}
            />
            <MetricCard
              icon="📄"
              label="Всего брифов"
              value={stats.briefs.total}
              delay={150}
            />
          </div>

          {/* Brief Stats Bar */}
          <div className="glass-card p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h2 className="text-sm font-semibold text-tg-text mb-3">
              Статистика обработки
            </h2>
            <div className="w-full flex items-center mb-2">
              <div
                className="h-2 rounded-l-full bg-green-500 transition-all duration-700"
                style={{
                  width: `${stats.briefs.total > 0 ? (stats.briefs.successful / stats.briefs.total) * 100 : 0}%`,
                  minWidth: stats.briefs.successful > 0 ? "4px" : "0px",
                }}
              />
              <div
                className="h-2 bg-white/5 transition-all duration-700"
                style={{
                  width: `${stats.briefs.total > 0 ? ((stats.briefs.total - stats.briefs.successful - stats.briefs.failed) / stats.briefs.total) * 100 : 100}%`,
                }}
              />
              <div
                className="h-2 rounded-r-full bg-red-500 transition-all duration-700"
                style={{
                  width: `${stats.briefs.total > 0 ? (stats.briefs.failed / stats.briefs.total) * 100 : 0}%`,
                  minWidth: stats.briefs.failed > 0 ? "4px" : "0px",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-tg-hint">
              <span>✅ {stats.briefs.successful} успешных</span>
              <span>❌ {stats.briefs.failed} ошибок</span>
            </div>
          </div>

          {/* Top Users */}
          {stats.topUsers.length > 0 && (
            <div className="glass-card p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <h2 className="text-sm font-semibold text-tg-text mb-3">
                🏆 Топ пользователей
              </h2>
              <div className="space-y-2">
                {stats.topUsers.map((user, i) => (
                  <div
                    key={user.telegram_id}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-5 text-tg-hint">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span className="text-sm text-tg-text">
                        {user.username
                          ? `@${user.username}`
                          : user.first_name || `ID:${user.telegram_id}`}
                      </span>
                    </div>
                    <span className="text-xs text-tg-hint font-mono">
                      {user.briefs_count} 📋
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Errors */}
          {stats.recentErrors.length > 0 && (
            <div className="glass-card p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <h2 className="text-sm font-semibold text-tg-text mb-3">
                🚨 Последние ошибки
              </h2>
              <div className="space-y-2">
                {stats.recentErrors.map((err) => (
                  <div
                    key={err.id}
                    className="p-3 rounded-lg bg-red-500/5 border border-red-500/10"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-tg-hint">
                        User {err.telegram_id}
                      </span>
                      <span className="text-[10px] text-tg-hint">
                        {new Date(err.created_at).toLocaleString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-red-400 truncate">
                      {err.error_message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-tg-hint animate-fade-in-up" style={{ animationDelay: "350ms" }}>
            Обновлено:{" "}
            {new Date(stats.timestamp).toLocaleTimeString("ru-RU")}
            {" · "} обновление каждые 30с
          </div>
        </>
      ) : null}
    </main>
  );
}
