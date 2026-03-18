import React from 'react';
import { Activity, Server, Database, Cloud, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export function HealthTab() {
  const MOCK_SERVICES = [
    { name: 'API Gateway', status: 'operational', uptime: '99.99%', latency: '42ms', icon: <Server className="w-5 h-5 text-[var(--tg-theme-button-color,#3e88f7)]" /> },
    { name: 'PostgreSQL DB', status: 'operational', uptime: '100%', latency: '8ms', icon: <Database className="w-5 h-5 text-[#34C759]" /> },
    { name: 'Redis Cache', status: 'degraded', uptime: '98.5%', latency: '120ms', icon: <Zap className="w-5 h-5 text-[#FF9500]" /> },
    { name: 'PDF Generator', status: 'operational', uptime: '99.9%', latency: '850ms', icon: <Cloud className="w-5 h-5 text-[var(--tg-theme-button-color,#3e88f7)]" /> },
    { name: 'Auth Service', status: 'operational', uptime: '100%', latency: '12ms', icon: <ShieldCheck className="w-5 h-5 text-[#34C759]" /> },
  ];

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
              <h2 className="text-[20px] font-bold text-tg-text tracking-tight">All Systems Operational</h2>
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

          {MOCK_SERVICES.map((service, index) => (
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
