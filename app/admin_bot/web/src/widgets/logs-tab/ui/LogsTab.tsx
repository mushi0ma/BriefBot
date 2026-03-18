import React, { useState } from 'react';
import { Terminal, Info, AlertTriangle, Search, Filter, RefreshCw, XCircle } from 'lucide-react';

type LogLevel = 'error' | 'warn' | 'info';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
}

export function LogsTab() {
  const [activeFilter, setActiveFilter] = useState<LogLevel | 'all'>('all');

  const MOCK_LOGS: LogEntry[] = [
    { id: '1', timestamp: '10:42:15.342', level: 'error', service: 'pdf-generator', message: 'Failed to launch puppeteer instance: Timeout exceeded' },
    { id: '2', timestamp: '10:41:02.111', level: 'warn', service: 'api-gateway', message: 'Rate limit approaching for user 892134' },
    { id: '3', timestamp: '10:39:45.001', level: 'info', service: 'auth-service', message: 'User 12934 successfully authenticated via Telegram' },
    { id: '4', timestamp: '10:35:12.888', level: 'info', service: 'db-sync', message: 'Completed background migration job #442' },
    { id: '5', timestamp: '10:32:05.102', level: 'error', service: 'stripe-webhook', message: 'Signature verification failed for event evt_10924' },
    { id: '6', timestamp: '10:28:55.992', level: 'warn', service: 'cache-layer', message: 'Redis connection latency spiked to 450ms' },
    { id: '7', timestamp: '10:25:33.441', level: 'info', service: 'pdf-generator', message: 'Successfully generated brief doc_8823.pdf in 2.4s' },
  ];

  const getLogIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-[#FF3B30]" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-[#FF9500]" />;
      case 'info': return <Info className="w-4 h-4 text-[#34C759]" />;
    }
  };

  const filteredLogs = activeFilter === 'all'
    ? MOCK_LOGS
    : MOCK_LOGS.filter(log => log.level === activeFilter);

  return (
    <div className="space-y-4 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Search Header */}
      <section className="px-4 pt-4 sticky top-14 z-40 bg-tg-bg/90 backdrop-blur-md pb-4 border-b border-tg-hint/10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-tg-hint uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              System Output
            </h3>
            <button className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--tg-theme-button-color,#3e88f7)] bg-[var(--tg-theme-button-color,#3e88f7)]/10 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint" />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full h-10 pl-9 pr-4 bg-tg-secondary-bg/50 border border-tg-hint/20 rounded-xl text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color,#3e88f7)]/30 transition-shadow"
              />
            </div>
            <button className="h-10 px-3 flex items-center justify-center gap-2 bg-tg-secondary-bg/50 border border-tg-hint/20 rounded-xl text-[var(--tg-theme-button-color,#3e88f7)] hover:bg-tg-hint/10 transition-colors shrink-0">
              <Filter className="w-4 h-4" />
              <span className="text-[13px] font-semibold hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Filters */}
      <section className="px-4 flex gap-2 overflow-x-auto snap-x scrollbar-hide">
        {['all', 'error', 'warn', 'info'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter as LogLevel | 'all')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-colors snap-start shrink-0
              ${activeFilter === filter
                ? 'bg-[var(--tg-theme-button-color,#3e88f7)] text-white shadow-sm'
                : 'bg-tg-secondary-bg/50 text-tg-hint border border-tg-hint/20 hover:bg-tg-hint/10'}`}
          >
            {filter}
          </button>
        ))}
      </section>

      {/* Terminal View */}
      <section className="px-4">
        <div className="bg-[#1C1C1E] rounded-2xl border border-[#3A3A3C] shadow-lg overflow-hidden flex flex-col h-[400px]">

          <div className="bg-[#2C2C2E] px-4 py-2 border-b border-[#3A3A3C] flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>
            <span className="text-[11px] font-mono text-[#8E8E93]">production-cluster-01</span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] sm:text-[12px]">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex gap-3 items-start group hover:bg-white/5 p-1 rounded transition-colors break-all">
                <span className="text-[#8E8E93] shrink-0 pt-0.5">{log.timestamp}</span>
                <span className="shrink-0 pt-0.5">{getLogIcon(log.level)}</span>
                <span className="text-[#0A84FF] font-semibold shrink-0 min-w-[100px] pt-0.5">[{log.service}]</span>
                <span className={`flex-1 leading-snug ${
                  log.level === 'error' ? 'text-[#FF453A]' :
                  log.level === 'warn' ? 'text-[#FF9F0A]' : 'text-[#EBEBF5]'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
}
