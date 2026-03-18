const fs = require('fs');

function patchFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Replace old Open Telegram button with a standard <a> tag
  const oldButtonRegex = /<a\s+href="https:\/\/t\.me\/"\s+className="w-full bg-tg-button hover:opacity-90 text-tg-button-text font-bold py-4 rounded-xl transition-opacity flex items-center justify-center gap-2"\s*>\s*<span className="material-symbols-outlined text-xl">\s*rocket_launch\s*<\/span>\s*Открыть Telegram\s*<\/a>/;

  const newButton = `<a
            href={\`https://t.me/\${process.env.NEXT_PUBLIC_BOT_USERNAME || 'BriefKzBot'}\`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-tg-button hover:opacity-90 text-tg-button-text font-bold py-4 rounded-xl transition-opacity flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">
              rocket_launch
            </span>
            Открыть Telegram
          </a>`;

  content = content.replace(oldButtonRegex, newButton);
  fs.writeFileSync(path, content);
  console.log(`Patched ${path}`);
}

patchFile('./app/admin_bot/web/src/shared/ui/states/AccessDeniedState.tsx');
patchFile('./app/bot/web/src/shared/ui/states/AccessDeniedState.tsx');
