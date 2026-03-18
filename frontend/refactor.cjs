const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getExports(code) {
  const ids = new Set();
  const fnRegex = /^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/gm;
  let m;
  while ((m = fnRegex.exec(code)) !== null) ids.add(m[1]);

  const varRegex = /^(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/gm;
  while ((m = varRegex.exec(code)) !== null) ids.add(m[1]);
  
  return Array.from(ids);
}

const apiCode = fs.readFileSync(path.join(srcDir, 'api.js'), 'utf8')
  .replace(/export \{[^}]+\};\n?/g, '')
  .replace(/^import .*;\n?/gm, '');
const routerCode = fs.readFileSync(path.join(srcDir, 'router.js'), 'utf8')
  .replace(/export \{[^}]+\};\n?/g, '')
  .replace(/^import .*;\n?/gm, '');
let uiCode = fs.readFileSync(path.join(srcDir, 'ui.js'), 'utf8')
  .replace(/export \{[^}]+\};\n?/g, '')
  .replace(/^import .*;\n?/gm, '');

// Convert init IIFE in ui.js to export function init()
uiCode = uiCode.replace(/\(function init\(\) \{/, 'function init() {');
uiCode = uiCode.replace(/\}\(\)\);[\s\S]*$/, '}');

const apiIds = getExports(apiCode);
const routerIds = getExports(routerCode);
const uiIds = getExports(uiCode);

// Inject Imports into API
const finalApi = `import { navigate } from './router.js';
import { render } from './ui.js';
${apiCode}
export { ${apiIds.join(', ')} };
`;

// Inject Imports into Router
const neededFromApiForRouter = apiIds.join(', ');
const finalRouter = `import { ${neededFromApiForRouter} } from './api.js';
import { render, resumeConsent } from './ui.js';
${routerCode}
export { ${routerIds.join(', ')} };
`;

// Inject Imports into UI
const neededFromApiForUI = apiIds.join(', ');
const finalUi = `import { ${neededFromApiForUI} } from './api.js';
import { navigate } from './router.js';
${uiCode}
export { ${uiIds.join(', ')} };
`;

const mainCode = `
import * as api from './api.js';
import * as router from './router.js';
import * as ui from './ui.js';

// Expose all to window for inline HTML onclick handlers
Object.assign(window, api);
Object.assign(window, router);
Object.assign(window, ui);

window.addEventListener('DOMContentLoaded', () => {
  ui.init();
});
`;

fs.writeFileSync(path.join(srcDir, 'api.js'), finalApi);
fs.writeFileSync(path.join(srcDir, 'router.js'), finalRouter);
fs.writeFileSync(path.join(srcDir, 'ui.js'), finalUi);
fs.writeFileSync(path.join(srcDir, 'main.js'), mainCode);

console.log('All modules re-assembled with strict ES imports.');
