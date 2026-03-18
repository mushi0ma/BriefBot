/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import { useTelegram } from '@/src/shared/lib/telegram';
import { LoadingState } from '@/src/shared/ui/states/LoadingState';
import { ErrorState } from '@/src/shared/ui/states/ErrorState';
import { Activity, Server, Database, Cloud, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export function HealthTab() {
  const { initData } = useTelegram();
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/health', {
          headers: {
            'Authorization': `Bearer ${initData || window.Telegram?.WebApp?.initData || ''}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch health data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [initData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => window.location.reload()} />;


  const getIconForService = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('db') || lowerName.includes('database')) return <Database className="w-5 h-5" />;
    if (lowerName.includes('redis') || lowerName.includes('cache')) return <Zap className="w-5 h-5" />;
    if (lowerName.includes('auth')) return <ShieldCheck className="w-5 h-5" />;
    if (lowerName.includes('pdf')) return <Cloud className="w-5 h-5" />;
    return <Server className="w-5 h-5" />;
  };

  // Convert API object to array. Assumes API returns { status: 'ok', services: { db: { status: 'operational', latency: '...' }, ... } }
  const servicesList = data?.services ? Object.entries(data.services).map(([key, val]: [string, any]) => ({
    name: val.name || key,
    status: val.status || 'unknown',
    uptime: val.uptime || 'N/A',
    latency: val.latency || 'N/A',
    icon: getIconForService(val.name || key)
  })) : [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'operational': return 'bg-[#34C759] text-white';
      case 'degraded': return 'bg-[#FF9500] text-white';
      case 'down': return 'bg-[#FF3B30] text-white';
      default: return 'bg-tg-hint text-white';
    }
  };

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'operational': return 'bg-[#34C759]/10 border-[#34C759]/20';
      case 'degraded': return 'bg-[#FF9500]/10 border-[#FF9500]/20';
      case 'down': return 'bg-[#FF3B30]/10 border-[#FF3B30]/20';
      default: return 'bg-tg-hint/10 border-tg-hint/20';
    }
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Overall System Status Header */}
      <section className="px-4 pt-4 sticky top-14 z-40 bg-tg-bg/90 backdrop-blur-md pb-4 border-b border-tg-hint/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#34C759]/10">
              <Activity className="w-6 h-6 text-[#34C759]" />
              <div className="absolute inset-0 rounded-full border border-[#34C759]/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-tg-text tracking-tight">{data?.status === "ok" ? "All Systems Operational" : "System Degraded"}</h2>
              <p className="text-[13px] font-medium text-tg-hint mt-0.5">Updated just now</p>
            </div>
          </div>
        </div>
      </section>

      {/* Critical Alerts (if any) */}
      <section className="px-4">
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-2xl p-4 flex gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-[#FF9500] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[14px] font-bold text-[#FF9500] mb-1">Redis Cache Degraded Performance</h4>
            <p className="text-[13px] font-medium text-tg-hint/80 text-[#FF9500]/80">
              Experiencing elevated latency spikes during peak load. Auto-scaling initiated.
            </p>
          </div>
        </div>
      </section>

      {/* Service Health List */}
      <section className="px-4">
        <h3 className="text-[15px] font-bold text-tg-hint uppercase tracking-wider mb-3 ml-2">Core Services</h3>
        <div className="bg-tg-bg rounded-2xl border border-tg-hint/10 shadow-sm overflow-hidden divide-y divide-tg-hint/10">

          {servicesList.map((service: any, index: number) => (
            <div key={index} className="p-4 flex items-center gap-4 hover:bg-tg-secondary-bg/30 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getStatusBg(service.status)}`}>
                {service.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[16px] font-semibold text-tg-text truncate pr-2">{service.name}</span>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${getStatusColor(service.status)}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{service.status}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-tg-hint uppercase tracking-wider">Uptime</span>
                      <span className="text-[13px] font-bold text-tg-text">{service.uptime}</span>
                    </div>
                    <div className="w-px h-6 bg-tg-hint/20" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-tg-hint uppercase tracking-wider">Latency</span>
                      <span className="text-[13px] font-bold text-tg-text">{service.latency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>
      </section>

    </div>
  );
}
