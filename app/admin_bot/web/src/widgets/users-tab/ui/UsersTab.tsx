/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import { useTelegram } from '@/src/shared/lib/telegram';
import { LoadingState } from '@/src/shared/ui/states/LoadingState';
import { ErrorState } from '@/src/shared/ui/states/ErrorState';
import { Users, Crown, Globe, Search, MoreVertical, Filter } from 'lucide-react';

export function UsersTab() {
  const { initData } = useTelegram();
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/stats', {
          headers: {
            'Authorization': `Bearer ${initData || window.Telegram?.WebApp?.initData || ''}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch stats');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [initData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => window.location.reload()} />;

  // Use recent users from API if available, else empty
  const usersList = data?.recentUsers || [];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Search Header */}
      <section className="px-4 pt-4 sticky top-14 z-40 bg-tg-bg/90 backdrop-blur-md pb-4 border-b border-tg-hint/10">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint" />
            <input
              type="text"
              placeholder="Поиск пользователей..."
              className="w-full h-10 pl-9 pr-4 bg-tg-secondary-bg/50 border border-tg-hint/20 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color,#3e88f7)]/30 transition-shadow"
            />
          </div>
          <button className="h-10 w-10 flex items-center justify-center bg-tg-secondary-bg/50 border border-tg-hint/20 rounded-xl text-[var(--tg-theme-button-color,#3e88f7)] hover:bg-tg-hint/10 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Cohort Stats Grid */}
      <section className="px-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-tg-bg rounded-2xl p-4 border border-tg-hint/10 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-tg-hint">
              <Crown className="w-4 h-4 text-[#FF9500]" />
              <span className="text-[12px] font-bold uppercase tracking-wider">Конверсия в Premium</span>
            </div>
            <div className="flex items-end justify-between">
              <h4 className="text-[28px] font-black text-tg-text">{data?.totalUsers && data?.totalUsers > 0 ? Math.round((data.premiumUsers / data.totalUsers) * 100) : 0}%</h4>
              <span className="text-[11px] font-bold text-[#34C759] bg-[#34C759]/10 px-1.5 py-0.5 rounded flex items-center mb-1">
                +2.1%
              </span>
            </div>
          </div>
          <div className="bg-tg-bg rounded-2xl p-4 border border-tg-hint/10 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-tg-hint">
              <Globe className="w-4 h-4 text-[var(--tg-theme-button-color,#3e88f7)]" />
              <span className="text-[12px] font-bold uppercase tracking-wider">Топ регион</span>
            </div>
            <div className="flex items-end justify-between">
              <h4 className="text-[20px] font-black text-tg-text truncate">Европа</h4>
              <span className="text-[11px] font-bold text-tg-hint mb-1">
                42%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Users List */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4 pl-2">
          <h3 className="text-[15px] font-bold text-tg-hint uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recent Activity
          </h3>
          <button className="text-[13px] font-medium text-[var(--tg-theme-button-color,#3e88f7)]">
            View All
          </button>
        </div>

        <div className="bg-tg-bg rounded-2xl border border-tg-hint/10 shadow-sm overflow-hidden divide-y divide-tg-hint/10">
          {usersList.map((user: any) => (
            <div key={user.id} className="flex items-center p-4 hover:bg-tg-secondary-bg/30 transition-colors cursor-pointer group">
              <div className="relative shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${(user.first_name || user.name || "Unknown")}&backgroundColor=3e88f7,FF9500,AF52DE&textColor=ffffff`}
                  alt={(user.first_name || user.name || "Unknown")}
                  className="w-11 h-11 rounded-full border border-tg-hint/10"
                />
                {(user.is_premium || user.isPremium) && (
                  <div className="absolute -bottom-1 -right-1 bg-[#FF9500] rounded-full p-0.5 border-2 border-tg-bg shadow-sm">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-[16px] font-semibold text-tg-text truncate pr-2">{(user.first_name || user.name || "Unknown")}</h4>
                  <span className="text-[12px] font-medium text-tg-hint shrink-0">{(user.lastActive || "Недавно")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[13px] text-tg-hint font-medium truncate">{(user.username ? `@${user.username}` : "Нет username")}</p>
                  <div className="flex items-center gap-1 text-[12px] text-tg-hint font-medium">
                    <div className="w-1 h-1 rounded-full bg-tg-hint/40" />
                    <span>{(user.briefs_count || user.briefs || 0)} брифов</span>
                  </div>
                </div>
              </div>

              <button className="ml-2 p-2 rounded-full hover:bg-tg-hint/10 text-tg-hint opacity-0 group-hover:opacity-100 transition-opacity" aria-label="More options">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
