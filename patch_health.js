const fs = require('fs');
const path = './app/admin_bot/web/src/widgets/health-tab/ui/HealthTab.tsx';

let content = fs.readFileSync(path, 'utf8');

// Translations
content = content.replace(/"All Systems Operational"/g, '"Все системы работают"');
content = content.replace(/"System Degraded"/g, '"Работа системы нарушена"');
content = content.replace(/>Updated just now</g, '>Обновлено только что<');

content = content.replace(/>Redis Cache Degraded Performance</g, '>Снижение производительности Redis Cache<');
content = content.replace(/>Experiencing elevated latency spikes during peak load. Auto-scaling initiated.</g, '>Наблюдаются скачки задержки во время пиковой нагрузки. Инициировано автомасштабирование.<');

content = content.replace(/>Core Services</g, '>Основные сервисы<');
content = content.replace(/>Uptime</g, '>Аптайм<');
content = content.replace(/>Latency</g, '>Задержка<');

fs.writeFileSync(path, content);
console.log('Patched HealthTab.tsx');
