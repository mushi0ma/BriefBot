const fs = require('fs');
const path = './app/admin_bot/web/src/widgets/dashboard-tab/ui/DashboardTab.tsx';

let content = fs.readFileSync(path, 'utf8');

// Translations
content = content.replace(/"Total Briefs"/g, '"Всего брифов"');
content = content.replace(/"Total Users"/g, '"Всего пользователей"');
content = content.replace(/"Premium Users"/g, '"Premium пользователи"');
content = content.replace(/"All time"/g, '"За все время"');
content = content.replace(/"Registered accounts"/g, '"Зарегистрировано"');
content = content.replace(/"Active subscriptions"/g, '"Активные подписки"');

content = content.replace(/>Brief Generation Volume</g, '>Объем генераций брифов<');
content = content.replace(/>Last 7 days</g, '>За последние 7 дней<');

content = content.replace(/>Feature Adoption</g, '>Использование функций<');
content = content.replace(/>PDF Exports</g, '>Экспорт в PDF<');
content = content.replace(/>Saved Templates</g, '>Сохраненные шаблоны<');
content = content.replace(/>Avg. Gen Time</g, '>Ср. время генерации<');

content = content.replace(/\['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'\]/g, "['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']");

// Data mapping (remove mocked data)
// Replace [40, 70, 45, 90, 65, 80, 100].map
const mockedMapRegex = /\[40, 70, 45, 90, 65, 80, 100\]\.map\(\(height, i\) => \(/;
const actualMapCode = `(data?.weeklyStats || [0, 0, 0, 0, 0, 0, 0]).map((height: number, i: number) => (`;
content = content.replace(mockedMapRegex, actualMapCode);

fs.writeFileSync(path, content);
console.log('Patched DashboardTab.tsx');
