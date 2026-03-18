
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
