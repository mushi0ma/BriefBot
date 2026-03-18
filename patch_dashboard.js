const fs = require('fs');
const path = './app/admin_bot/web/src/widgets/dashboard-tab/ui/DashboardTab.tsx';

let content = fs.readFileSync(path, 'utf8');

// Add use client
content = `"use client";\n` + content;

// Add hooks and replace mock data
const componentStart = content.indexOf('export function DashboardTab() {');
const hooksToAdd = `
  const { initData } = useTelegram();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/stats', {
          headers: {
            'Authorization': \`Bearer \${initData || window.Telegram?.WebApp?.initData || ''}\`
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
`;

content = content.replace(
  'import React from \'react\';',
  'import React, { useState, useEffect } from \'react\';\nimport { useTelegram } from \'@/src/shared/lib/telegram\';\nimport { LoadingState } from \'@/src/shared/ui/states/LoadingState\';\nimport { ErrorState } from \'@/src/shared/ui/states/ErrorState\';'
);

content = content.replace(
  'export function DashboardTab() {',
  'export function DashboardTab() {' + hooksToAdd
);

// Replace hardcoded KPIs
content = content.replace(
  '<KpiCard title="Total Briefs" value="1,248" label="+14% this month" type="up" />',
  '{/* Mock trend indicator as real backend currently provides only raw counts */}\n        <KpiCard title="Total Briefs" value={data?.totalBriefs?.toString() || "0"} label="All time" type="neutral" />'
);
content = content.replace(
  '<KpiCard title="Active Users" value="842" label="Daily active metric" type="neutral" />',
  '<KpiCard title="Total Users" value={data?.totalUsers?.toString() || "0"} label="Registered accounts" type="neutral" />'
);
content = content.replace(
  '<KpiCard title="API Errors" value="12" label="-2 since yesterday" type="down" />',
  '<KpiCard title="Premium Users" value={data?.premiumUsers?.toString() || "0"} label="Active subscriptions" type="up" />'
);

fs.writeFileSync(path, content);
console.log('Patched DashboardTab.tsx');
