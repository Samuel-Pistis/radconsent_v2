const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const htmlSource = fs.readFileSync(path.join(__dirname, '../frontend-dist/index.html'), 'utf8');

const scriptMatches = [...htmlSource.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
const code = scriptMatches[1][1];

const routerIndex = code.indexOf('/* ═══════════════════════════════════════════════════════════════\n   ROUTER');
const uiIndex = code.indexOf('/* ═══════════════════════════════════════════════════════════════\n   UTILITY HELPERS');

let apiCode = code.substring(0, routerIndex);
let routerCode = code.substring(routerIndex, uiIndex);
let uiCode = code.substring(uiIndex);

if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

fs.writeFileSync(path.join(srcDir, 'api.js'), apiCode);
fs.writeFileSync(path.join(srcDir, 'router.js'), routerCode);
fs.writeFileSync(path.join(srcDir, 'ui.js'), uiCode);

console.log('Restored api.js, router.js, ui.js from monolithic index.html!');
