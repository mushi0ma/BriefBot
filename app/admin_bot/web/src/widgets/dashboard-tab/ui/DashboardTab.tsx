/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import { useTelegram } from '@/src/shared/lib/telegram';
import { LoadingState } from '@/src/shared/ui/states/LoadingState';
import { ErrorState } from '@/src/shared/ui/states/ErrorState';
import { ArrowUpRight, CheckCircle2, AlertTriangle, TrendingUp, Download, Clock } from 'lucide-react';

export function DashboardTab() {
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

  const KpiCard = ({ title, value, label, type }: { title: string, value: string, label: string, type: 'up' | 'down' | 'neutral' }) => (
    <div className="bg-tg-secondary-bg/50 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-between border border-tg-hint/10 shadow-sm min-w-[140px] flex-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-tg-hint tracking-wide uppercase">{title}</span>
        {type === 'up' && <TrendingUp className="w-4 h-4 text-[#34C759]" />}
        {type === 'down' && <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />}
        {type === 'neutral' && <CheckCircle2 className="w-4 h-4 text-[var(--tg-theme-button-color,#3e88f7)]" />}
      </div>
      <div>
        <h3 className="text-3xl font-bold text-tg-text tracking-tight">{value}</h3>
        <p className="text-[12px] font-medium text-tg-hint mt-1 flex items-center gap-1">
          {label}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Top Level KPIs */}
      <section className="px-4 pt-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {/* Mock trend indicator as real backend currently provides only raw counts */}
        <KpiCard title="Всего брифов" value={data?.totalBriefs?.toString() || "0"} label="За все время" type="neutral" />
        <KpiCard title="Всего пользователей" value={data?.totalUsers?.toString() || "0"} label="Зарегистрировано" type="neutral" />
        <KpiCard title="Premium пользователи" value={data?.premiumUsers?.toString() || "0"} label="Активные подписки" type="up" />
      </section>

      {/* Generation Volume Chart */}
      <section className="px-4">
        <div className="bg-tg-bg rounded-2xl p-5 border border-tg-hint/10 shadow-sm relative overflow-hidden">
          {/* Decorative background grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMmgxOHYxOEgxVjJ6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTI4LCAxMjgsIDEyOCwgMC4xKSIvPjwvc3ZnPg==')] opacity-50" />

          <div className="relative z-10">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-[16px] font-bold text-tg-text">Объем генераций брифов</h3>
                <p className="text-[13px] text-tg-hint font-medium">За последние 7 дней</p>
              </div>
              <div className="bg-[#34C759]/10 text-[#34C759] text-[12px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                24%
              </div>
            </div>

            {/* Mocked Bar Chart using Flexbox */}
            <div className="flex items-end justify-between h-[120px] gap-2 pt-4">
              {(data?.weeklyStats || [0, 0, 0, 0, 0, 0, 0]).map((height: number, i: number) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
                  <div className="w-full relative flex items-end h-full">
                    <div
                      className="w-full bg-[var(--tg-theme-button-color,#3e88f7)]/80 hover:bg-[var(--tg-theme-button-color,#3e88f7)] rounded-t-sm transition-all duration-300"
                      style={{ height: `${height}%` }}
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-tg-text text-tg-bg text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {height * 3}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-tg-hint">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Usage Stats */}
      <section className="px-4">
        <h3 className="text-[15px] font-bold text-tg-hint uppercase tracking-wider mb-3 ml-2">Использование функций</h3>
        <div className="bg-tg-bg rounded-2xl border border-tg-hint/10 shadow-sm overflow-hidden divide-y divide-tg-hint/10">

          <div className="p-4 flex items-center gap-4 hover:bg-tg-secondary-bg/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#FF9500]/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-[#FF9500]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[16px] font-semibold text-tg-text">Экспорт в PDF</span>
                <span className="text-[14px] font-bold text-tg-text">8,421</span>
              </div>
              <div className="w-full h-1.5 bg-tg-hint/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#FF9500] rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center gap-4 hover:bg-tg-secondary-bg/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#AF52DE]/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[#AF52DE]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[16px] font-semibold text-tg-text">Сохраненные шаблоны</span>
                <span className="text-[14px] font-bold text-tg-text">3,190</span>
              </div>
              <div className="w-full h-1.5 bg-tg-hint/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#AF52DE] rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center gap-4 hover:bg-tg-secondary-bg/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#5856D6]/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#5856D6]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[16px] font-semibold text-tg-text">Ср. время генерации</span>
                <span className="text-[14px] font-bold text-tg-text">4.2s</span>
              </div>
              <div className="w-full h-1.5 bg-tg-hint/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#5856D6] rounded-full" style={{ width: '30%' }} />
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
