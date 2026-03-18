const fs = require('fs');

let logsPath = './app/admin_bot/web/src/widgets/logs-tab/ui/LogsTab.tsx';
let logsContent = fs.readFileSync(logsPath, 'utf8');

logsContent = logsContent.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");

fs.writeFileSync(logsPath, logsContent);

console.log('Fixed TS build issue.');
