const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, 'src/main.js');
const js = fs.readFileSync(srcFile, 'utf8');

// Find sections by looking for the full block comment start
function extractSectionFull(startText, endText) {
  // Find the '/* ═══' that precedes the startText
  const textStartIdx = js.indexOf(startText);
  if (textStartIdx === -1) return '';
  
  let blockStartIdx = js.lastIndexOf('/*', textStartIdx);
  if (blockStartIdx === -1 || textStartIdx - blockStartIdx > 200) {
    blockStartIdx = textStartIdx; // fallback
  }

  if (!endText) {
    return js.substring(blockStartIdx);
  }

  const textEndIdx = js.indexOf(endText, blockStartIdx + 10);
  if (textEndIdx === -1) return js.substring(blockStartIdx);

  let blockEndIdx = js.lastIndexOf('/*', textEndIdx);
  if (blockEndIdx === -1 || textEndIdx - blockEndIdx > 200) {
    blockEndIdx = textEndIdx;
  }

  return js.substring(blockStartIdx, blockEndIdx);
}

const sConstants = extractSectionFull('CONSTANTS', 'STATE');
const sState     = extractSectionFull('STATE', 'API HELPER');
const sApi       = extractSectionFull('API HELPER', 'AUTH');
const sAuth      = extractSectionFull('AUTH', 'ROUTER');
const sRouter    = extractSectionFull('ROUTER', 'UTILITY HELPERS');
const sUtils     = extractSectionFull('UTILITY HELPERS', 'SVG ICONS');
const sIcons     = extractSectionFull('SVG ICONS', 'NAV CONFIG');
const sNav       = extractSectionFull('NAV CONFIG', 'RENDER');
const sRender    = extractSectionFull('RENDER', '/* --- EXPORT');
const sExport    = extractSectionFull('/* --- EXPORT', null);

fs.writeFileSync(path.join(__dirname, 'src/api.js'), sConstants + sState + sApi + sAuth);
fs.writeFileSync(path.join(__dirname, 'src/ui.js'), sUtils + sIcons + sNav + sRender);
fs.writeFileSync(path.join(__dirname, 'src/router.js'), sRouter);

console.log('Main file logically organized natively. Writing index.html wrapper...');

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>RadConsent — Radiology Consent Management</title>
  <link rel="stylesheet" href="/src/styles/main.css">
  <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js"></script>
</head>
<body>
  <div id="app"></div>
  <div id="modal-root"></div>

  <!-- Load split modules -->
  <script type="module" src="/src/api.js"></script>
  <script type="module" src="/src/router.js"></script>
  <script type="module" src="/src/ui.js"></script>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(__dirname, 'index.html'), indexHtml);
