"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "./TelegramProvider";
import {
  Users,
  FileText,
  CalendarDays,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  Clock,
  ServerCrash,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */
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
    error_message: string | null;
  }>;
  topUsers: Array<{
    telegram_id: number;
    username: string;
    first_name: string;
    briefs_count: number;
  }>;
  timestamp: string;
}

/* ── Metric Card ─────────────────────────────────────────────── */
function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="border border-[var(--border)] rounded-md bg-[var(--bg-card)] p-4 transition-all duration-200 hover:border-[var(--border-hover)]">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      {detail && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{detail}</p>
      )}
    </div>
  );
}

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    done: { label: "Done", cls: "text-[var(--success)] bg-[var(--success)]/10" },
    failed: { label: "Error", cls: "text-[var(--destructive)] bg-[var(--destructive)]/10" },
    processing: { label: "Processing", cls: "text-yellow-500 bg-yellow-500/10" },
  };
  const c = config[state] ?? { label: state, cls: "text-[var(--text-muted)] bg-white/5" };
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
export default function Dashboard() {
  const { initData, isReady } = useTelegram();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!initData && isReady) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/stats", {
        headers: { Authorization: initData },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setStats(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [initData, isReady]);

  useEffect(() => {
    if (isReady) fetchStats();
  }, [isReady, fetchStats]);

  useEffect(() => {
    if (!isReady) return;
    const i = setInterval(fetchStats, 30000);
    return () => clearInterval(i);
  }, [isReady, fetchStats]);

  if (!isReady) return null;

  return (
    <main className="min-h-screen pb-8 max-w-2xl mx-auto px-4">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="pt-5 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              BriefBot
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Admin Dashboard
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse-dot" />
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              live
            </span>
          </div>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="mt-4 border border-[var(--destructive)]/20 rounded-md bg-[var(--destructive)]/5 px-3 py-2">
          <p className="text-xs text-[var(--destructive)]">{error}</p>
        </div>
      )}

      {/* ── No Telegram ───────────────────────────────────────── */}
      {!initData && isReady && (
        <div className="mt-8 border border-[var(--border)] rounded-md bg-[var(--bg-card)] p-8 text-center animate-in">
          <ServerCrash className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">
            Open via Telegram
          </p>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 animate-in">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border border-[var(--border)] rounded-md bg-[var(--bg-card)] p-4 space-y-3"
            >
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-6 w-1/2" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="animate-in">
          {/* ── Metrics Grid ──────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <MetricCard
              icon={Users}
              label="Users"
              value={stats.users.total}
            />
            <MetricCard
              icon={CalendarDays}
              label="Today"
              value={stats.briefs.today}
            />
            <MetricCard
              icon={FileText}
              label="Total Briefs"
              value={stats.briefs.total}
            />
            <MetricCard
              icon={TrendingUp}
              label="Success Rate"
              value={`${stats.briefs.successRate}%`}
            />
          </div>

          {/* ── Processing Bar ────────────────────────────────── */}
          <div className="mt-4 border border-[var(--border)] rounded-md bg-[var(--bg-card)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Processing
                </span>
              </div>
            </div>
            <div className="h-1 rounded-sm bg-white/[0.04] overflow-hidden mb-2">
              <div
                className="h-full rounded-sm bg-[var(--success)] transition-all duration-700"
                style={{
                  width: `${
                    stats.briefs.total > 0
                      ? (stats.briefs.successful / stats.briefs.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                {stats.briefs.successful} successful
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-[var(--destructive)]" />
                {stats.briefs.failed} failed
              </span>
            </div>
          </div>

          {/* ── Recent Briefs Table ───────────────────────────── */}
          {stats.recentBriefs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Recent Briefs
                </span>
              </div>
              <div className="border border-[var(--border)] rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                      <th className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-3 py-2">
                        Status
                      </th>
                      <th className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-3 py-2">
                        User
                      </th>
                      <th className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-3 py-2 hidden sm:table-cell">
                        Template
                      </th>
                      <th className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-3 py-2 text-right">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBriefs.map((brief) => (
                      <tr
                        key={brief.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors duration-150"
                      >
                        <td className="px-3 py-2.5">
                          <StatusBadge state={brief.processing_state} />
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-[var(--text-secondary)]">
                          {brief.telegram_id}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--text-muted)] hidden sm:table-cell">
                          {brief.template_slug || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--text-muted)] text-right font-mono">
                          {new Date(brief.created_at).toLocaleDateString(
                            "ru-RU",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Top Users ─────────────────────────────────────── */}
          {stats.topUsers.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Top Users
                </span>
              </div>
              <div className="border border-[var(--border)] rounded-md overflow-hidden divide-y divide-[var(--border)]">
                {stats.topUsers.map((user, i) => (
                  <div
                    key={user.telegram_id}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-[var(--text-muted)] w-4 text-right">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[var(--text-primary)]">
                        {user.username
                          ? `@${user.username}`
                          : user.first_name || `ID:${user.telegram_id}`}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {user.briefs_count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer ────────────────────────────────────────── */}
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-6 font-mono">
            Updated{" "}
            {new Date(stats.timestamp).toLocaleTimeString("ru-RU")} ·
            refreshes every 30s
          </p>
        </div>
      ) : null}
    </main>
  );
}
