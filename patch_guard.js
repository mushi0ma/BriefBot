const fs = require('fs');
const path = './app/admin_bot/web/app/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// The original import
if (!content.includes('AccessDeniedState')) {
  content = content.replace(
    "LoadingState, AdminRestrictedState } from \"@/src/shared/ui\";",
    "LoadingState, AdminRestrictedState, AccessDeniedState } from \"@/src/shared/ui\";"
  );
  if (!content.includes('AccessDeniedState')) {
     // fallback if import syntax is slightly different
     content = content.replace(
       /import {([^}]+)} from "@\/src\/shared\/ui";/,
       "import { $1, AccessDeniedState } from \"@/src/shared/ui\";"
     );
  }
}

// Add isTelegram tracking
if (!content.includes('const [isTelegram, setIsTelegram] = useState(false);')) {
  content = content.replace(
    'const [isAuthorized, setIsAuthorized] = useState(false);',
    'const [isAuthorized, setIsAuthorized] = useState(false);\n  const [isTelegram, setIsTelegram] = useState(false);'
  );
}

// Update verifyAdmin to set isTelegram
const verifyAdminCodeRegex = /if \(userId && MOCK_ADMIN_IDS\.includes\(userId\)\) \{\s*setIsAuthorized\(true\);\s*\} else \{\s*setIsAuthorized\(false\);\s*\}/;
const newVerifyAdminCode = `
    if (initDataStr || tg?.initDataUnsafe?.user) {
      setIsTelegram(true);
    } else {
      setIsTelegram(false);
    }

    if (userId && MOCK_ADMIN_IDS.includes(userId)) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
`;
content = content.replace(verifyAdminCodeRegex, newVerifyAdminCode);

// The exact return logic modification
const returnLogicRegex = /if \(!isAuthorized && process\.env\.NEXT_PUBLIC_ALLOW_OUTSIDE !== "true"\) \{\s*return <AdminRestrictedState \/>;\s*\}/;
const newReturnLogic = `
  if (process.env.NEXT_PUBLIC_ALLOW_OUTSIDE !== "true") {
    if (!isTelegram) {
      return <AccessDeniedState />;
    }
    if (!isAuthorized) {
      return <AdminRestrictedState />;
    }
  }
`;
content = content.replace(returnLogicRegex, newReturnLogic);

fs.writeFileSync(path, content);
console.log('Patched guard logic in page.tsx');
