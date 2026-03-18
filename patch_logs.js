const fs = require('fs');
const path = './app/admin_bot/web/src/widgets/logs-tab/ui/LogsTab.tsx';

let content = fs.readFileSync(path, 'utf8');

// Translations
content = content.replace(/"Search logs..."/g, '"Поиск логов..."');
content = content.replace(/>System Output</g, '>Системные логи<');
content = content.replace(/>Refresh</g, '>Обновить<');
content = content.replace(/>Filters</g, '>Фильтры<');

// Since the instructions say to remove mock data if possible, but logs usually need a real API
// For now, I'll translate the mock strings if they stay, but the prompt says:
// "Ensure all data charts/tables map directly to the API response and remove mock data arrays (like `MOCK_LOGS` in LogsTab)"

// To remove MOCK_LOGS, I'll fetch them from an API or just make it empty if no data comes
// The component is currently not fetching from /api/logs. Let's add basic fetch logic similar to Dashboard Tab,
// or if we just want to remove the hardcoded array, we can set `const [logs, setLogs] = useState([])`

const fetchCode = `
  const { initData } = useTelegram();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/logs', {
          headers: { 'Authorization': \`Bearer \${initData || window.Telegram?.WebApp?.initData || ''}\` }
        });
        if (res.ok) {
          const json = await res.json();
          setLogs(json.logs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [initData]);

  const filteredLogs = activeFilter === 'all'
    ? logs
    : logs.filter(log => log.level === activeFilter);
`;

const mockLogsRegex = /const MOCK_LOGS: LogEntry\[\] = \[([\s\S]*?)\];[\s\S]*?const filteredLogs = [^;]+;/;
content = content.replace(mockLogsRegex, fetchCode);

// Ensure useTelegram is imported
if (!content.includes('useTelegram')) {
  content = content.replace(
    "import { Terminal",
    "import { useTelegram } from '@/src/shared/lib/telegram';\nimport { useEffect } from 'react';\nimport { Terminal"
  );
}

fs.writeFileSync(path, content);
console.log('Patched LogsTab.tsx');
