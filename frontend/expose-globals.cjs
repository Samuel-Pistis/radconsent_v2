const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/main.js');
let js = fs.readFileSync(srcPath, 'utf8');

// Find all function declarations: `function myFunc(...) {` or `async function myFunc(...) {`
const funcRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g;
let match;
const funcNames = new Set();
while ((match = funcRegex.exec(js)) !== null) {
  funcNames.add(match[1]);
}

let exportBlock = `\n/* --- EXPORT TO GLOBAL WINDOW (VITE COMPATIBILITY) --- */\n`;
for (const name of funcNames) {
  exportBlock += `window.${name} = ${name};\n`;
}

// Since init() is an IIFE at the very very end, insert before it if possible, else append
if (js.includes('(function init() {')) {
    js = js.replace('(function init() {', exportBlock + '\n(function init() {');
} else {
    js += exportBlock;
}

fs.writeFileSync(srcPath, js);
console.log('Successfully exposed ' + funcNames.size + ' functions to window.');
