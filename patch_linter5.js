const fs = require('fs');

let logsPath = './app/admin_bot/web/src/widgets/logs-tab/ui/LogsTab.tsx';
let logsContent = fs.readFileSync(logsPath, 'utf8');

if (!logsContent.includes('useTelegram')) {
   logsContent = "import { useTelegram } from '@/src/shared/lib/telegram';\n" + logsContent;
} else if (logsContent.indexOf('useTelegram') > 100) {
   // It was used but not imported
   logsContent = "import { useTelegram } from '@/src/shared/lib/telegram';\n" + logsContent;
}

fs.writeFileSync(logsPath, logsContent);

console.log('Fixed TS build issue.');
