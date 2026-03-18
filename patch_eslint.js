const fs = require('fs');

// 1. Fix app/admin_bot/web/app/page.tsx - any type
let pagePath = './app/admin_bot/web/app/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');
pageContent = pageContent.replace('const tg = (window as any).Telegram?.WebApp;', 'const tg = (window as { Telegram?: { WebApp?: any } }).Telegram?.WebApp;');
fs.writeFileSync(pagePath, pageContent);

// 2. Fix LogsTab.tsx unused imports
let logsPath = './app/admin_bot/web/src/widgets/logs-tab/ui/LogsTab.tsx';
let logsContent = fs.readFileSync(logsPath, 'utf8');
logsContent = logsContent.replace('import { Terminal, Info, AlertTriangle, Search, Filter, RefreshCw, XCircle } from \'lucide-react\';', 'import { Terminal, Search, Filter, RefreshCw } from \'lucide-react\';');
logsContent = logsContent.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  if (loading) return null;');
fs.writeFileSync(logsPath, logsContent);

console.log('Fixed ESLint issues.');
