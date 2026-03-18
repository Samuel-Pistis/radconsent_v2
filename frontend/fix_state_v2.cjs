const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const vars = [
  "_sidebarOpen", "ncState", "mriScrState", "safetyScrState", "mmgScrState", "consentDeclState",
  "sigPadInstance", "sigMode", "sigUploadedDataUrl", "sigTopazStatus", "sigTopazPreviewUrl",
  "recordsState", "recordDetailState",
  "stage2State", "s2SigMode", "s2SigPadInstance", "s2SigUploadedDataUrl", "s2SigTopazStatus", "s2SigTopazPreviewUrl",
  "stage3State", "s3SigMode", "s3SigPadInstance", "s3SigUploadedDataUrl", "s3SigTopazStatus", "s3SigTopazPreviewUrl",
  "radReviewState", "rvSigMode", "rvSigPadInstance", "rvSigUploadedDataUrl", "rvSigTopazStatus", "rvSigTopazPreviewUrl",
  "adminState", "changePwdState", "dashboardState", "darkMode"
];

const files = ['api.js', 'router.js', 'ui.js'];
// Safely matches variable names not preceded by a dot or word character, and not used as an object key
const regexStr = '(?<![\\w.])\\b(' + vars.join('|') + ')\\b(?!\\s*:)';
const regex = new RegExp(regexStr, 'g');

for (const file of files) {
  let content = fs.readFileSync(path.join(srcDir, file), 'utf8');

  if (file === 'api.js') {
    // 1. Transition let/const declarations to gState.properties
    for (const v of vars) {
      const declRegex = new RegExp('^(?:let|const|var)\\s+(' + v + ')\\s*=', 'gm');
      content = content.replace(declRegex, 'gState.$1 =');
    }

    // 2. Remove these variables from the ES module export { ... }
    const exportSetMatch = content.match(/export\s+\{([^}]+)\};/);
    if (exportSetMatch) {
      let exports = exportSetMatch[1].split(',').map(s => s.trim());
      exports = exports.filter(exp => !vars.includes(exp) && exp !== '');
      const newExport = `export { ${exports.join(', ')} };`;
      content = content.replace(exportSetMatch[0], newExport);
    }

    // 3. Blanket replace remaining usages in api.js with gState.$1
    content = content.replace(regex, 'gState.$1');

    // 4. Inject export const gState = {}; before state object
    content = content.replace('const state = {', 'export const gState = {};\nconst state = {');

    // Clean up empty commas in export { ... }
    content = content.replace(/export\s+\{\s*,+/g, 'export { ');
    content = content.replace(/,\s*,/g, ',');
    content = content.replace(/,\s*\}/g, ' }');

  } else {
    // file is router.js or ui.js
    
    // 1. Remove variables from the api.js import statement
    const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/api\.js['"];/);
    if (importMatch) {
      let importedVars = importMatch[1].split(',').map(s => s.trim());
      importedVars = importedVars.filter(imp => !vars.includes(imp) && imp !== '');
      if (!importedVars.includes('gState')) importedVars.push('gState');
      const newImport = `import { ${importedVars.join(', ')} } from './api.js';`;
      content = content.replace(importMatch[0], newImport);
    }
    
    // 2. Blanket replace usages with gState.$1
    content = content.replace(regex, 'gState.$1');
  }

  fs.writeFileSync(path.join(srcDir, file), content);
}

console.log("State variables cleanly transitioned to gState to fix ES module immutability bounds.");
