const fs = require('fs');
const path = './app/admin_bot/web/src/widgets/users-tab/ui/UsersTab.tsx';

let content = fs.readFileSync(path, 'utf8');

// Translations
content = content.replace(/"Search users..."/g, '"Поиск пользователей..."');
content = content.replace(/>Premium Conversion</g, '>Конверсия в Premium<');
content = content.replace(/>Top Region</g, '>Топ регион<');
content = content.replace(/>Europe</g, '>Европа<');
content = content.replace(/>Recent Activity</g, '>Недавняя активность<');
content = content.replace(/>View All</g, '>Показать все<');
content = content.replace(/"Recently"/g, '"Недавно"');
content = content.replace(/"No username"/g, '"Нет username"');
content = content.replace(/briefs</g, 'брифов<');

fs.writeFileSync(path, content);
console.log('Patched UsersTab.tsx');
