const fs = require('fs');

// 1. Fix app/admin_bot/web/app/page.tsx - any type
let pagePath = './app/admin_bot/web/app/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');
pageContent = pageContent.replace('const tg = (window as { Telegram?: { WebApp?: any } }).Telegram?.WebApp;', 'const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string, initDataUnsafe?: { user?: any } } } }).Telegram?.WebApp;');
fs.writeFileSync(pagePath, pageContent);

// 2. Fix LogsTab.tsx React Hook "useEffect" is called conditionally.
let logsPath = './app/admin_bot/web/src/widgets/logs-tab/ui/LogsTab.tsx';
let logsContent = fs.readFileSync(logsPath, 'utf8');
logsContent = logsContent.replace('const [loading, setLoading] = useState(true);\n  if (loading) return null;', 'const [loading, setLoading] = useState(true);');
logsContent = logsContent.replace('const filteredLogs = activeFilter === \'all\'\n    ? logs\n    : logs.filter(log => log.level === activeFilter);', 'const filteredLogs = activeFilter === \'all\'\n    ? logs\n    : logs.filter(log => log.level === activeFilter);\n\n  if (loading) return null;');
fs.writeFileSync(logsPath, logsContent);

console.log('Fixed ESLint issues.');
