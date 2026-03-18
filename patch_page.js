const fs = require('fs');
const path = './app/admin_bot/web/app/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// Translations
content = content.replace(/"Dashboard"/g, '"Дашборд"');
content = content.replace(/"Users"/g, '"Пользователи"');
content = content.replace(/"Logs"/g, '"Логи"');
content = content.replace(/"Health"/g, '"Статус"');
content = content.replace(/"Analytics"/g, '"Аналитика"');
content = content.replace(/"User Analytics"/g, '"Аналитика пользователей"');
content = content.replace(/"System Logs"/g, '"Системные логи"');
content = content.replace(/"System Health"/g, '"Состояние системы"');
content = content.replace(/"Admin Panel"/g, '"Админ панель"');

fs.writeFileSync(path, content);
console.log('Patched page.tsx');
