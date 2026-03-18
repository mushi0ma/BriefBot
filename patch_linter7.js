const fs = require('fs');

let logsPath = './app/admin_bot/web/src/widgets/logs-tab/ui/LogsTab.tsx';
let logsContent = fs.readFileSync(logsPath, 'utf8');

// I accidentally removed the getLogIcon function along with MOCK_LOGS due to the regex logic earlier. Let's add it back.
const getLogIconCode = `
  const getLogIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return <span className="w-4 h-4 text-[#FF3B30] inline-block rounded-full bg-[#FF3B30] opacity-80" />; // Fallback dot if icons removed
      case 'warn': return <span className="w-4 h-4 text-[#FF9500] inline-block rounded-full bg-[#FF9500] opacity-80" />;
      case 'info': return <span className="w-4 h-4 text-[#34C759] inline-block rounded-full bg-[#34C759] opacity-80" />;
    }
  };
`;

logsContent = logsContent.replace("const filteredLogs =", getLogIconCode + "\n  const filteredLogs =");
fs.writeFileSync(logsPath, logsContent);

console.log('Fixed TS build issue.');
