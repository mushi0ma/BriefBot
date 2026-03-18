const fs = require('fs');

let pagePath = './app/admin_bot/web/app/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');
pageContent = pageContent.replace(
  'const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string, initDataUnsafe?: { user?: any } } } }).Telegram?.WebApp;',
  'const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string, initDataUnsafe?: { user?: unknown } } } }).Telegram?.WebApp;'
);
fs.writeFileSync(pagePath, pageContent);

console.log('Fixed ESLint issues.');
