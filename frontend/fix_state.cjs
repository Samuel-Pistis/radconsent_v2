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
const regex = new RegExp("(?<!\\\\.)\\\\b(" + vars.join("|") + ")\\\\b", "g");

for (const file of files) {
  let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  // In api.js, remove the let declarations of these variables first.
  if (file === 'api.js') {
    content = content.replace(/^(?:let|const)\s+(_sidebarOpen|ncState|mriScrState|safetyScrState|mmgScrState|consentDeclState|sigPadInstance|sigMode|sigUploadedDataUrl|sigTopazStatus|sigTopazPreviewUrl|recordsState|recordDetailState|stage2State|s2SigMode|s2SigPadInstance|s2SigUploadedDataUrl|s2SigTopazStatus|s2SigTopazPreviewUrl|stage3State|s3SigMode|s3SigPadInstance|s3SigUploadedDataUrl|s3SigTopazStatus|s3SigTopazPreviewUrl|radReviewState|rvSigMode|rvSigPadInstance|rvSigUploadedDataUrl|rvSigTopazStatus|rvSigTopazPreviewUrl|adminState|changePwdState|dashboardState|darkMode)\s*=/gm, 'gState.$1 =');
    // Also remove from export { ... }
    for (const v of vars) {
      content = content.replace(new RegExp(`\\b${v}\\b,?`, 'g'), '');
    }
  } else {
    // router.js and ui.js
    // modify import
    for (const v of vars) {
      content = content.replace(new RegExp(`\\s*\\b${v}\\b\\s*,?`, 'g'), '');
    }
    content = content.replace(/import\s+\{\s*\}\s*from\s+['"]\.\/api\.js['"];?/g, '');
    if (!content.includes('import {') && content.includes('./api.js')) {
        // if we emptied import { ... }, we might need to add it backing gState
    }
  }

  // replace all usages, but skip declarations if already matched (only api.js had declarations)
  // Actually, let's just do a blanket replace of usages
  let newContent = content.replace(regex, 'gState.$1');

  // Fix up the import/export in ui.js and router.js to include gState
  if (file !== 'api.js') {
    if (newContent.includes('import {') && newContent.includes('./api.js')) {
      newContent = newContent.replace(/(import\s+\{.*?)(\s*\}\s*from\s+['"]\.\/api\.js['"])/, '$1, gState$2');
    } else {
      newContent = `import { gState } from './api.js';\n` + newContent;
    }
  }

  // in api.js, make sure gState is defined at the top
  if (file === 'api.js') {
    // we need to inject 'export const gState = {};' before the first usage
    // and export gState
    newContent = newContent.replace('const state = {', 'export const gState = {};\nconst state = {');
    // clean up export { ... } to not have stray commas
    newContent = newContent.replace(/export\s+\{\s*,+/g, 'export { ');
    newContent = newContent.replace(/,\s*,/g, ',');
    newContent = newContent.replace(/,\s*\}/g, ' }');
  }

  fs.writeFileSync(path.join(srcDir, file), newContent);
}

console.log("Done");
