const fs = require('fs');

let adminPath = './app/admin_bot/web/src/shared/ui/states/AdminRestrictedState.tsx';
let adminContent = fs.readFileSync(adminPath, 'utf8');

adminContent = adminContent.replace(
  'window.Telegram.WebApp.openTelegramLink(supportUrl);',
  '(window.Telegram.WebApp as any).openTelegramLink(supportUrl);'
);

fs.writeFileSync(adminPath, adminContent);

console.log('Fixed TS build issue.');
