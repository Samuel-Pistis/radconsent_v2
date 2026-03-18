const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../frontend-dist/index.html');
const destDir = path.join(__dirname, 'src');

const html = fs.readFileSync(srcPath, 'utf8');

// 1. Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  fs.writeFileSync(path.join(destDir, 'styles/main.css'), styleMatch[1]);
  console.log('Extracted CSS');
}

// 2. Extract JS
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  fs.writeFileSync(path.join(destDir, 'main.js'), scriptMatch[1]);
  console.log('Extracted JS');
}

// 3. Extract HTML Body
const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
let cleanHtml = html
  .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/src/styles/main.css">')
  .replace(/<script>[\s\S]*?<\/script>/, '<script type="module" src="/src/main.js"></script>');

fs.writeFileSync(path.join(__dirname, 'index.html'), cleanHtml);
console.log('Generated index.html template');
