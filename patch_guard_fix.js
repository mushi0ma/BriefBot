const fs = require('fs');
const path = './app/admin_bot/web/app/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// The injected code caused scope issues with initDataStr and tg
const badCode = `
    if (initDataStr || tg?.initDataUnsafe?.user) {
      setIsTelegram(true);
    } else {
      setIsTelegram(false);
    }
`;

const goodCode = `
    // Check if telegram context was found within the try block
    let isTgContext = false;
    if (typeof window !== 'undefined') {
       const tg = (window as any).Telegram?.WebApp;
       if (tg?.initData || tg?.initDataUnsafe?.user || sessionStorage.getItem('__telegram_init_data')) {
           isTgContext = true;
       }
    }

    if (isTgContext) {
      setIsTelegram(true);
    } else {
      setIsTelegram(false);
    }
`;

content = content.replace(badCode, goodCode);
fs.writeFileSync(path, content);
console.log('Fixed scope issue in verifyAdmin in page.tsx');
