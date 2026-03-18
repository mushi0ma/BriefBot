const fs = require('fs');
const path = './app/admin_bot/web/src/widgets/health-tab/ui/HealthTab.tsx';

let content = fs.readFileSync(path, 'utf8');

// Add use client
content = `"use client";\n` + content;

const hooksToAdd = `
  const { initData } = useTelegram();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/health', {
          headers: {
            'Authorization': \`Bearer \${initData || window.Telegram?.WebApp?.initData || ''}\`
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
`;

content = content.replace(
  'import React from \'react\';',
  'import React, { useState, useEffect } from \'react\';\nimport { useTelegram } from \'@/src/shared/lib/telegram\';\nimport { LoadingState } from \'@/src/shared/ui/states/LoadingState\';\nimport { ErrorState } from \'@/src/shared/ui/states/ErrorState\';'
);

content = content.replace(
  'export function HealthTab() {',
  'export function HealthTab() {' + hooksToAdd
);

// We keep the icons mapper, but replace MOCK_SERVICES with the dynamic list mapping
const iconMapFunc = `
  const getIconForService = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('db') || lowerName.includes('database')) return <Database className="w-5 h-5" />;
    if (lowerName.includes('redis') || lowerName.includes('cache')) return <Zap className="w-5 h-5" />;
    if (lowerName.includes('auth')) return <ShieldCheck className="w-5 h-5" />;
    if (lowerName.includes('pdf')) return <Cloud className="w-5 h-5" />;
    return <Server className="w-5 h-5" />;
  };
`;

content = content.replace(
  /const MOCK_SERVICES = \[[\s\S]*?\];/,
  iconMapFunc + `\n  // Convert API object to array. Assumes API returns { status: 'ok', services: { db: { status: 'operational', latency: '...' }, ... } }\n  const servicesList = data?.services ? Object.entries(data.services).map(([key, val]: [string, any]) => ({\n    name: val.name || key,\n    status: val.status || 'unknown',\n    uptime: val.uptime || 'N/A',\n    latency: val.latency || 'N/A',\n    icon: getIconForService(val.name || key)\n  })) : [];`
);

content = content.replace(
  'MOCK_SERVICES.map((service, index)',
  'servicesList.map((service: any, index: number)'
);

content = content.replace(
  /<Server className="w-5 h-5 text-\[var\(--tg-theme-button-color,#3e88f7\)\]" \/>/g,
  '{service.icon}' // this will use the icon from the mapping, but we might need to handle colors via the wrapper
);

content = content.replace(
  '<h2 className="text-[20px] font-bold text-tg-text tracking-tight">All Systems Operational</h2>',
  '<h2 className="text-[20px] font-bold text-tg-text tracking-tight">{data?.status === "ok" ? "All Systems Operational" : "System Degraded"}</h2>'
);

fs.writeFileSync(path, content);
console.log('Patched HealthTab.tsx');
