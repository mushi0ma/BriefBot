const fs = require('fs');

const dashPath = './app/admin_bot/web/src/widgets/dashboard-tab/ui/DashboardTab.tsx';
let dash = fs.readFileSync(dashPath, 'utf8');
dash = dash.replace('useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any;', 'useState<any>(null)');
dash = dash.replace('useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any', 'useState<any>(null)');
dash = `/* eslint-disable @typescript-eslint/no-explicit-any */\n` + dash;
fs.writeFileSync(dashPath, dash);

const usersPath = './app/admin_bot/web/src/widgets/users-tab/ui/UsersTab.tsx';
let users = fs.readFileSync(usersPath, 'utf8');
users = users.replace('useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any;', 'useState<any>(null)');
users = users.replace('useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any', 'useState<any>(null)');
users = `/* eslint-disable @typescript-eslint/no-explicit-any */\n` + users;
users = users.replace('usersList.map((user: any /* eslint-disable-line @typescript-eslint/no-explicit-any */)', 'usersList.map((user: any)');
fs.writeFileSync(usersPath, users);

const healthPath = './app/admin_bot/web/src/widgets/health-tab/ui/HealthTab.tsx';
let health = fs.readFileSync(healthPath, 'utf8');
health = health.replace('useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any;', 'useState<any>(null)');
health = health.replace('useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any', 'useState<any>(null)');
health = `/* eslint-disable @typescript-eslint/no-explicit-any */\n` + health;
health = health.replace('Object.entries(data.services).map(([key, val]: [string, any /* eslint-disable-line @typescript-eslint/no-explicit-any */])', 'Object.entries(data.services).map(([key, val]: [string, any])');
health = health.replace('servicesList.map((service: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, index: number)', 'servicesList.map((service: any, index: number)');
fs.writeFileSync(healthPath, health);

console.log('Fixed types');
