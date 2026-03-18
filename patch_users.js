const fs = require('fs');
const path = './app/admin_bot/web/src/widgets/users-tab/ui/UsersTab.tsx';

let content = fs.readFileSync(path, 'utf8');

// Add use client
content = `"use client";\n` + content;

// Add hooks and replace mock data
const componentStart = content.indexOf('export function UsersTab() {');
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
  'export function UsersTab() {',
  'export function UsersTab() {' + hooksToAdd
);

// We replace the hardcoded MOCK_USERS array with the latestUsers from our stats data
content = content.replace(
  /const MOCK_USERS = \[[\s\S]*?\];/,
  `// Use recent users from API if available, else empty
  const usersList = data?.recentUsers || [];`
);

// Update map
content = content.replace(
  'MOCK_USERS.map((user)',
  'usersList.map((user: any)'
);

// Adjust rendering fields to match standard db schemas
content = content.replace(
  /user\.name/g,
  '(user.first_name || user.name || "Unknown")'
);

content = content.replace(
  /user\.username/g,
  '(user.username ? `@${user.username}` : "No username")'
);

content = content.replace(
  /user\.isPremium/g,
  '(user.is_premium || user.isPremium)'
);

content = content.replace(
  /user\.briefs/g,
  '(user.briefs_count || user.briefs || 0)'
);

// Adjust lastActive mock to map to real data or fallback
content = content.replace(
  /user\.lastActive/g,
  '(user.lastActive || "Recently")'
);


// Replace the hardcoded 18.4% with calculated from stats (premium / total)
content = content.replace(
  '<h4 className="text-[28px] font-black text-tg-text">18.4%</h4>',
  '<h4 className="text-[28px] font-black text-tg-text">{data?.totalUsers && data?.totalUsers > 0 ? Math.round((data.premiumUsers / data.totalUsers) * 100) : 0}%</h4>'
);

fs.writeFileSync(path, content);
console.log('Patched UsersTab.tsx');
