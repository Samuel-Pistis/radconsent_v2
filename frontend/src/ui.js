import { toggleSidebar, closeSidebar, toggleDark, api, doLogin, doLogout, validateSession, startExpiryTimer, API_BASE, MODALITY_LABELS, STATUS_LABELS, ROLE_LABELS, LANGUAGE_LABELS, DECISION_LABELS, state, gState } from './api.js';
import { navigate } from './router.js';
/* ═══════════════════════════════════════════════════════════════
   UTILITY HELPERS
═══════════════════════════════════════════════════════════════ */
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge badge-${esc(status)}">${esc(label)}</span>`;
}

function roleBadge(role) {
  return `<span class="badge badge-role-${esc(role)}">${esc(ROLE_LABELS[role] || role)}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function toast(msg, type = 'info', ms = 3500) {
  const id = `toast-${Date.now()}`;
  document.body.insertAdjacentHTML('beforeend',
    `<div id="${id}" class="toast toast-${type}">${esc(msg)}</div>`
  );
  setTimeout(() => { const el = document.getElementById(id); if (el) el.remove(); }, ms);
}

function openModal(html) { document.getElementById('modal-root').innerHTML = html; }
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS
═══════════════════════════════════════════════════════════════ */
const IC = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  records: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  flagged: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  admin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  medical: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  chevron_r: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  chevron_d: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
};

/* ═══════════════════════════════════════════════════════════════
   NAV CONFIG (role-aware)
═══════════════════════════════════════════════════════════════ */
function getNavItems(role) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: IC.dashboard },
    { id: 'consents', label: 'Consent Records', icon: IC.records },
  ];
  if (role === 'radiologist' || role === 'admin') {
    items.push({ id: 'flagged', label: 'Flagged Queue', icon: IC.flagged });
  }
  if (role === 'admin') {
    items.push({ id: 'admin', label: 'Admin Panel', icon: IC.admin });
  }
  return items;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — LOGIN PAGE
═══════════════════════════════════════════════════════════════ */
function renderLogin() {
  return `
    <div class="login-page">
      <!-- ── Hero panel (left) ── -->
      <div class="login-hero">
        <div class="login-hero-content">
          <div class="login-hero-badge">
            <span class="login-hero-badge-dot"></span>
            Clinical-Grade Consent Platform
          </div>
          <div class="login-hero-title">Patient Safety<br>Starts With Informed&nbsp;Consent</div>
          <div class="login-hero-sub">
            RadConsent streamlines radiology consent workflows across all imaging modalities, ensuring every step is documented, auditable, and compliant.
          </div>
          <div class="login-hero-features">
            <div class="login-hero-feat">
              <div class="login-hero-feat-icon">${IC.shield}</div>
              <span>MRI Safety<br>Screening</span>
            </div>
            <div class="login-hero-feat">
              <div class="login-hero-feat-icon">${IC.clipboard}</div>
              <span>Multi-modality<br>Consent Declaration</span>
            </div>
            <div class="login-hero-feat">
              <div class="login-hero-feat-icon">${IC.edit}</div>
              <span>Digital Consent<br>Signatures</span>
            </div>
            <div class="login-hero-feat">
              <div class="login-hero-feat-icon">${IC.medical}</div>
              <span>Tiered Review<br>Process</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Form panel (right) ── -->
      <div class="login-form-panel">
        <div class="login-form-inner">
          <div class="login-logo">
            <img src="logo-transparent.png" alt="RadConsent Logo" style="height: 120px; margin-bottom: 4px; display: block; margin-left: auto; margin-right: auto;">
            <div class="login-app-sub">Radiology Consent Management</div>
          </div>

          <div class="login-card">
            <h2>Welcome back</h2>
            <div class="login-card-sub">Sign in to continue to your dashboard</div>
            <div id="login-error" class="login-error"></div>
            <form id="login-form" autocomplete="on">
              <div class="form-group">
                <label class="form-label" for="login-email">Email address</label>
                <input class="form-control" type="email" id="login-email" name="email"
                  placeholder="name@example.com" autocomplete="email" required />
              </div>
              <div class="form-group" style="margin-bottom:20px">
                <label class="form-label" for="login-password">Password</label>
                <input class="form-control" type="password" id="login-password" name="password"
                  placeholder="••••••••" autocomplete="current-password" required />
              </div>
              <button type="submit" id="login-btn" class="btn btn-dark btn-lg btn-block">Sign In</button>
            </form>
          </div>

          <div class="demo-panel">
            <div class="demo-panel-title">Demo accounts — click to fill</div>
            <div class="demo-grid">
              <button class="demo-btn" onclick="fillDemo('radiographer@radconsent.demo')">
                <div class="demo-btn-role">Radiographer</div>
                <div class="demo-btn-name">Chidi Eze</div>
              </button>
              <button class="demo-btn" onclick="fillDemo('nurse@radconsent.demo')">
                <div class="demo-btn-role">Nurse</div>
                <div class="demo-btn-name">Amaka Obi</div>
              </button>
              <button class="demo-btn" onclick="fillDemo('radiologist@radconsent.demo')">
                <div class="demo-btn-role">Radiologist</div>
                <div class="demo-btn-name">Dr. Amara Okonkwo</div>
              </button>
              <button class="demo-btn" onclick="fillDemo('admin@radconsent.demo')">
                <div class="demo-btn-role">Admin</div>
                <div class="demo-btn-name">Admin User</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function fillDemo(email) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = 'demo1234';
  document.getElementById('login-email').focus();
}

function bindLoginEvents() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errBox = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>&nbsp;Signing in…`;
    errBox.textContent = '';
    errBox.classList.remove('show');

    try {
      const data = await api('POST', '/auth/login', { email, password });
      if (data) doLogin(data.user, data.token);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — APP SHELL
═══════════════════════════════════════════════════════════════ */
function renderShell(pageHtml) {
  const role = state.user?.role || '';
  const navItems = getNavItems(role);

  const navLinks = navItems.map(item => `
    <div class="nav-item${state.page === item.id ? ' active' : ''}" onclick="navigate('${item.id}')">
      ${item.icon}<span>${item.label}</span>
    </div>
  `).join('');

  return `
    <div class="mobile-header">
      <button class="mobile-hamburger" onclick="toggleSidebar()">${IC.menu}</button>
      <img src="logo-transparent.png" alt="RadConsent" style="height:48px;filter:brightness(0) invert(1);">
      <div class="mobile-header-right">
        <button class="mobile-dark-btn" onclick="toggleDark()">
          ${gState.darkMode ? IC.sun : IC.moon}
        </button>
        <button class="mobile-new-btn" onclick="navigate('new-consent')">
          ${IC.plus} New
        </button>
      </div>
    </div>

    <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="closeSidebar()"></div>

    <div class="app-shell">
      <aside class="sidebar" id="main-sidebar">
        <button class="sidebar-close-btn" onclick="closeSidebar()">${IC.close}</button>

        <div class="sidebar-logo" onclick="navigate('dashboard');closeSidebar()" style="cursor:pointer">
          <img src="logo-transparent.png" alt="RadConsent" style="height:82px;display:block;margin:0 auto 2px;filter:brightness(0) invert(1);">
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-label">Navigation</div>
          ${navLinks}
        </nav>

        <div class="sidebar-actions">
          <button class="sidebar-new-btn${state.page === 'new-consent' ? ' active' : ''}"
            onclick="navigate('new-consent');closeSidebar()">
            ${IC.plus} New Consent
          </button>
        </div>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-avatar">${initials(state.user?.name)}</div>
            <div>
              <div class="sidebar-user-name">${esc(state.user?.name)}</div>
              <div class="sidebar-user-role">${ROLE_LABELS[role] || role}</div>
            </div>
          </div>
          <button id="dark-toggle-btn" class="btn-dark-toggle" onclick="toggleDark()">
            ${gState.darkMode ? IC.sun + '<span>Light mode</span>' : IC.moon + '<span>Dark mode</span>'}
          </button>
          <button class="btn-dark-toggle" onclick="navigate('change-password')">
            ${IC.lock} <span>Change Password</span>
          </button>
          <button class="btn-signout" onclick="doLogout()">
            ${IC.logout} Sign Out
          </button>
        </div>
      </aside>

      <main class="main-content" style="position: relative;">
        ${window.gState?.settings?.center_logo ? `
          <div class="center-logo-topright">
            <img src="${window.gState.settings.center_logo}" alt="Center Logo" style="max-height: 48px; object-fit: contain;">
          </div>
        ` : ''}
        <div class="main-inner">${pageHtml}</div>
      </main>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — PAGE ROUTER
═══════════════════════════════════════════════════════════════ */
function renderPage() {
  const role = state.user?.role;

  // Role guards for restricted pages
  if (state.page === 'flagged' && role !== 'radiologist' && role !== 'admin') {
    state.page = 'dashboard';
  }
  if (state.page === 'admin' && role !== 'admin') {
    state.page = 'dashboard';
  }
  if (state.page === 'stage2-report' && role !== 'radiographer' && role !== 'admin') {
    toast('Only radiographers can file procedure reports.', 'error');
    state.page = 'consents';
  }
  if (state.page === 'stage3-vitals' && role !== 'nurse' && role !== 'admin') {
    toast('Only nurses can submit vitals checks.', 'error');
    state.page = 'consents';
  }
  if (state.page === 'rad-review' && role !== 'radiologist' && role !== 'admin') {
    toast('Only radiologists can review flagged records.', 'error');
    state.page = 'flagged';
  }

  switch (state.page) {
    case 'dashboard': return renderDashboard();
    case 'consents': return renderConsents();
    case 'flagged': return renderFlagged();
    case 'admin': return renderAdminPanel();
    case 'new-consent': return renderNewConsent();
    case 'record-detail': return renderRecordDetail();
    case 'mri-screening': return renderMriScreening();
    case 'safety-screening': return renderSafetyScreening();
    case 'mammography-screening': return renderMammographyScreening();
    case 'mammography-questionnaire': return renderMammographyQuestionnaire();
    case 'consent-declaration': return renderConsentDeclaration();
    case 'stage2-report': return renderStage2Report();
    case 'stage3-vitals': return renderStage3Vitals();
    case 'rad-review': return renderRadReview();
    case 'change-password': return renderChangePassword();
    default:
      return `<div class="empty-state">${IC.info}<h3>Page not found</h3>
        <button class="btn btn-primary mt-4" onclick="navigate('dashboard')">Go to Dashboard</button></div>`;
  }
}

/* ── Page placeholders (replaced in later steps) ── */
function renderDashboard() {
  if (!gState.dashboardState.records && !gState.dashboardState.loading) {
    gState.dashboardState.loading = true;
    api('GET', '/consents').then(data => {
      gState.dashboardState.records = data;
      gState.dashboardState.loading = false;
      if (state.page === 'dashboard') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.dashboardState.records = [];
      gState.dashboardState.loading = false;
      if (state.page === 'dashboard') render();
    });
  }

  const recs = gState.dashboardState.records;
  const role = state.user?.role || '';

  if (!recs) {
    return `<div class="page-header"><div>
      <div class="page-title">Dashboard</div>
      <div class="page-subtitle">Welcome back, ${esc(state.user?.name)}</div>
    </div></div>
    <div class="card"><div class="card-body"><div class="loading-state">
      <span class="spinner spinner-dark"></span>
      <span style="margin-left:10px;font-size:13px;color:var(--c-text-muted)">Loading…</span>
    </div></div></div>`;
  }

  // ── Counts ────────────────────────────────────────────────
  const total = recs.length;
  const closed = recs.filter(r => r.status === 'closed').length;
  const flagged = recs.filter(r => r.status === 'flagged_tier1' || r.status === 'pending_review').length;
  const inProgress = recs.filter(r => r.status === 'in_progress').length;

  const actionItems = recs.filter(r => {
    if (role === 'radiographer') return r.status === 'draft_stage1' || r.status === 'awaiting_signature';
    if (role === 'nurse') return r.status === 'draft_stage2' || r.status === 'awaiting_signature';
    if (role === 'radiologist') return r.status === 'pending_review' || r.status === 'flagged_tier1';
    if (role === 'admin') return ['draft_stage1', 'draft_stage2', 'pending_review', 'flagged_tier1', 'awaiting_signature'].includes(r.status);
    return false;
  });

  const actionLabel = {
    radiographer: 'Needs Attention',
    nurse: 'Needs Attention',
    radiologist: 'Awaiting Review',
    admin: 'Needs Attention',
  }[role] || 'Needs Action';

  // ── Stat cards ────────────────────────────────────────────
  const stats = `
    <div class="dash-stats">
      <div class="dash-stat accent-blue">
        <div class="dash-stat-num">${total}</div>
        <div class="dash-stat-label">Total Records</div>
      </div>
      <div class="dash-stat accent-amber">
        <div class="dash-stat-num">${actionItems.length}</div>
        <div class="dash-stat-label">${esc(actionLabel)}</div>
      </div>
      <div class="dash-stat accent-red">
        <div class="dash-stat-num">${flagged}</div>
        <div class="dash-stat-label">Flagged</div>
      </div>
      <div class="dash-stat accent-green">
        <div class="dash-stat-num">${closed}</div>
        <div class="dash-stat-label">Closed</div>
      </div>
    </div>`;

  // ── Pending actions card ──────────────────────────────────
  let actionRows = '';
  if (actionItems.length === 0) {
    actionRows = `<div style="padding:16px 0;text-align:center;color:var(--c-text-muted);font-size:13px">
      ${IC.check}&nbsp; No pending actions — you're all caught up.
    </div>`;
  } else {
    actionItems.slice(0, 8).forEach(r => {
      const act = getRecordAction(r, role);
      actionRows += `<div class="dash-action-row">
        <div>
          <div class="dash-action-info">${esc(r.patient?.name || '—')}</div>
          <div class="dash-action-sub">${esc(r.modality?.replace(/_/g, ' ') || '')} · ${fmtDate(r.createdAt)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span class="badge badge-${r.status}">${esc(STATUS_LABELS[r.status] || r.status)}</span>
          <button class="btn ${act.cls}" onclick="navigate('${act.page}',{id:'${r.id}'})">${esc(act.label)}</button>
        </div>
      </div>`;
    });
    if (actionItems.length > 8) {
      actionRows += `<div style="padding-top:10px;text-align:center">
        <button class="btn btn-ghost btn-sm" onclick="navigate('consents')">View all ${actionItems.length} →</button>
      </div>`;
    }
  }

  // ── Recent records card ───────────────────────────────────
  const recent = [...recs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  let recentRows = '';
  if (recent.length === 0) {
    recentRows = `<div style="padding:16px 0;text-align:center;color:var(--c-text-muted);font-size:13px">No records yet.</div>`;
  } else {
    recent.forEach(r => {
      recentRows += `<div class="dash-action-row" style="cursor:pointer" onclick="navigate('record-detail',{id:'${r.id}'})">
        <div>
          <div class="dash-action-info">${esc(r.patient?.name || '—')}</div>
          <div class="dash-action-sub">${esc(r.modality?.replace(/_/g, ' ') || '')} · ${fmtDate(r.createdAt)}</div>
        </div>
        <span class="badge badge-${r.status}">${esc(STATUS_LABELS[r.status] || r.status)}</span>
      </div>`;
    });
  }

  return `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Welcome back, ${esc(state.user?.name)}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="navigate('new-consent')">${IC.plus} New Consent</button>
    </div>

    ${stats}

    <div class="dash-charts" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px; margin-bottom: 20px;">
      <div class="card">
        <div class="card-header"><h3>Status Distribution</h3></div>
        <div class="card-body" style="position:relative; height:250px; padding:20px; display:flex; justify-content:center; align-items:center;">
          <canvas id="chart-status"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>By Modality</h3></div>
        <div class="card-body" style="position:relative; height:250px; padding:20px;">
          <canvas id="chart-modality"></canvas>
        </div>
      </div>
    </div>

    <div class="dash-split">
      <div class="card">
        <div class="card-header"><h3>${esc(actionLabel)}</h3></div>
        <div class="card-body" style="padding:0 20px">${actionRows}</div>
      </div>
      <div class="card">
        <div class="card-header" style="justify-content:space-between">
          <h3>Recent Records</h3>
          <button class="btn btn-ghost btn-sm" onclick="navigate('consents')">View all →</button>
        </div>
        <div class="card-body" style="padding:0 20px">${recentRows}</div>
      </div>
    </div>`;
}

/* ── Records helpers ──────────────────────────────────────── */
function highestTier(tierFlags) {
  if (!tierFlags) return null;
  if (tierFlags.tier1?.length) return 'tier1';
  if (tierFlags.tier2?.length) return 'tier2';
  if (tierFlags.tier3?.length) return 'tier3';
  return null;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const LANG_FLAG = { en: '🇬🇧', yo: '🟢', ig: '🔴', ha: '🔵' };

const STATUS_FILTER_OPTS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'draft_stage1', label: 'Awaiting Radiographer' },
  { value: 'draft_stage2', label: 'Awaiting Nurse' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'flagged_tier1', label: 'Tier 1 Flagged' },
  { value: 'awaiting_signature', label: 'Awaiting Signature' },
  { value: 'closed', label: 'Closed' },
  { value: 'declined', label: 'Declined' },
  { value: 'voided', label: 'Voided' },
];

/* ── Smart resume: fetch the record then route to the right page ─ */
async function resumeConsent(id) {
  try {
    const rec = await api('GET', `/consents/${id}`);
    if (!rec) return;

    // awaiting_signature = radiologist approved, now ready to sign
    if (rec.status === 'awaiting_signature') {
      navigate('consent-declaration', { consent: rec });
      return;
    }

    // in_progress with screening already saved → skip straight to declaration
    if (rec.status === 'in_progress' && rec.stage1?.screeningCompletedAt) {
      navigate('consent-declaration', { consent: rec });
      return;
    }

    // Otherwise resume screening (mriScrInit will restore answers)
    if (rec.modality?.startsWith('mri_')) {
      // Clear state so mriScrInit re-runs with fresh consent (answers restored inside)
      gState.mriScrState.consent = null;
      navigate('mri-screening', { consent: rec });
    } else if (rec.modality === 'mammography') {
      navigate('mammography-screening', { consent: rec });
    } else {
      navigate('safety-screening', { consent: rec });
    }
  } catch (err) {
    toast(err.message || 'Could not load consent record.', 'error');
  }
}

function getRecordAction(rec, role) {
  // In-progress (screening not yet done / interrupted)
  if (rec.status === 'in_progress' && (role === 'radiographer' || role === 'nurse' || role === 'admin'))
    return { label: 'Resume', cls: 'btn-primary btn-sm', page: 'resume' };
  if (rec.status === 'draft_stage1' && role === 'radiographer')
    return { label: 'File Report', cls: 'btn-primary btn-sm', page: 'stage2-report' };
  if (rec.status === 'draft_stage2' && role === 'nurse')
    return { label: 'Vitals Check', cls: 'btn-primary btn-sm', page: 'stage3-vitals' };
  if ((rec.status === 'pending_review' || rec.status === 'flagged_tier1') &&
    (role === 'radiologist' || role === 'admin'))
    return { label: 'Review', cls: 'btn-warning btn-sm', page: 'rad-review' };
  if (rec.status === 'awaiting_signature' && (role === 'radiographer' || role === 'nurse' || role === 'admin'))
    return { label: 'Sign Consent', cls: 'btn-primary btn-sm', page: 'sign-consent-resume' };
  return { label: 'View', cls: 'btn-secondary btn-sm', page: 'record-detail' };
}

function getFilteredRecords(extraStatusFilter) {
  let recs = gState.recordsState.records || [];
  const q = gState.recordsState.search.trim().toLowerCase();
  const sf = extraStatusFilter || gState.recordsState.statusFilter;
  if (q) recs = recs.filter(r =>
    (r.patient?.name || '').toLowerCase().includes(q) ||
    (r.patient?.hospitalNumber || '').toLowerCase().includes(q)
  );
  if (Array.isArray(sf)) {
    if (sf.length > 0) recs = recs.filter(r => sf.includes(r.status));
  } else if (sf && sf !== 'all') {
    recs = recs.filter(r => r.status === sf);
  }
  // ── Date range filter ──
  if (gState.recordsState.dateFrom) {
    const from = new Date(gState.recordsState.dateFrom + 'T00:00:00');
    recs = recs.filter(r => new Date(r.createdAt) >= from);
  }
  if (gState.recordsState.dateTo) {
    const to = new Date(gState.recordsState.dateTo + 'T23:59:59');
    recs = recs.filter(r => new Date(r.createdAt) <= to);
  }
  return recs;
}

function buildRecordsRows(extraStatusFilter) {
  const recs = getFilteredRecords(extraStatusFilter);
  const role = state.user?.role || '';

  if (!recs.length) {
    return `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--c-text-muted);font-size:13px">
      No records match your search.</td></tr>`;
  }

  return recs.map(rec => {
    const tier = highestTier(rec.tierFlags);
    const tierBadge = tier
      ? `<span class="badge badge-${tier}">${tier === 'tier1' ? 'T1' : tier === 'tier2' ? 'T2' : 'T3'}</span>`
      : `<span style="color:var(--c-text-muted)">—</span>`;
    const action = getRecordAction(rec, role);
    const t1Count = rec.tierFlags?.tier1?.length || 0;
    const t2Count = rec.tierFlags?.tier2?.length || 0;
    const t3Count = rec.tierFlags?.tier3?.length || 0;
    const flagTitle = [
      t1Count ? `${t1Count} Tier-1` : '',
      t2Count ? `${t2Count} Tier-2` : '',
      t3Count ? `${t3Count} Tier-3` : '',
    ].filter(Boolean).join(', ') || 'No flags';

    return `<tr class="clickable" onclick="navigate('record-detail',{id:'${rec.id}'})">
      <td>
        <div style="font-weight:500">${esc(rec.patient?.name || '—')}</div>
        ${rec.patient?.hospitalNumber ? `<div style="font-size:11px;color:var(--c-text-muted);margin-top:2px">${esc(rec.patient.hospitalNumber)}</div>` : ''}
      </td>
      <td style="font-size:12px;color:var(--c-text-sec)">${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</td>
      <td style="font-size:13px">${LANG_FLAG[rec.language] || ''}&nbsp;${esc(LANGUAGE_LABELS[rec.language] || rec.language)}</td>
      <td><span class="badge badge-${rec.status}">${esc(STATUS_LABELS[rec.status] || rec.status)}</span></td>
      <td title="${esc(flagTitle)}">${tierBadge}</td>
      <td style="font-size:12px;color:var(--c-text-sec);white-space:nowrap">${fmtDate(rec.createdAt)}</td>
      <td class="col-narrow" onclick="event.stopPropagation()">
        <button class="btn ${action.cls}" onclick="navigate('${action.page}',{id:'${rec.id}'})">${esc(action.label)}</button>
      </td>
    </tr>`;
  }).join('');
}

function recordsSearch(val) {
  gState.recordsState.search = val;
  const tbody = document.getElementById('records-tbody');
  if (tbody) tbody.innerHTML = buildRecordsRows();
}

function recordsToggleStatus(val, checked) {
  if (checked) {
    if (!gState.recordsState.statusFilter.includes(val)) gState.recordsState.statusFilter.push(val);
  } else {
    gState.recordsState.statusFilter = gState.recordsState.statusFilter.filter(v => v !== val);
  }
  const tbody = document.getElementById('records-tbody');
  if (tbody) tbody.innerHTML = buildRecordsRows();
  const btnText = document.getElementById('status-filter-text');
  if (btnText) {
    btnText.textContent = gState.recordsState.statusFilter.length === 0 ? 'All Statuses' : gState.recordsState.statusFilter.length + ' selected';
  }
}

function recordsFilterDate(field, val) {
  if (field === 'from') gState.recordsState.dateFrom = val;
  else gState.recordsState.dateTo = val;
  const tbody = document.getElementById('records-tbody');
  if (tbody) tbody.innerHTML = buildRecordsRows();
}

function recordsClearDates() {
  gState.recordsState.dateFrom = new Date().toISOString().slice(0, 10); // back to today
  gState.recordsState.dateTo = '';
  render(); // full re-render so date inputs reset
}

function renderRecordsTable(title, subtitle, extraStatusFilter, showFilters) {
  // Trigger async load if needed
  if (!gState.recordsState.records && !gState.recordsState.loading) {
    gState.recordsState.loading = true;
    api('GET', '/consents').then(data => {
      gState.recordsState.records = data || [];
      gState.recordsState.loading = false;
      if (state.page === 'consents' || state.page === 'flagged') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.recordsState.records = [];
      gState.recordsState.loading = false;
      if (state.page === 'consents' || state.page === 'flagged') render();
    });
  }

  // Status dropdown filter built in HTML template

  const body = gState.recordsState.loading || !gState.recordsState.records
    ? `<tr><td colspan="8"><div class="loading-state" style="padding:40px">
        <span class="spinner spinner-dark"></span>
        <span style="margin-left:10px;font-size:13px;color:var(--c-text-muted)">Loading records…</span>
       </div></td></tr>`
    : buildRecordsRows(extraStatusFilter);

  return `
    <div class="page-header">
      <div>
        <div class="page-title">${title}</div>
        <div class="page-subtitle">${subtitle}</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('new-consent')">${IC.plus}&nbsp;New Consent</button>
    </div>

    <div class="card">
      ${showFilters ? `
      <div class="card-header" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
        <!-- Search -->
        <div style="flex:1;min-width:180px;position:relative">
          <div style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--c-text-muted)">${IC.search.replace('viewBox', 'style="width:14px;height:14px" viewBox')}</div>
          <input class="form-control" type="search" placeholder="Search patient name or hospital number…"
            value="${esc(gState.recordsState.search)}"
            oninput="recordsSearch(this.value)"
            style="padding-left:32px" />
        </div>
        <!-- Status -->
        <details style="position:relative;flex:1;min-width:180px">
          <summary class="form-control" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:var(--c-bg);user-select:none;list-style:none">
            <span id="status-filter-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${gState.recordsState.statusFilter.length === 0 ? 'All Statuses' : gState.recordsState.statusFilter.length + ' selected'}
            </span>
            <span style="font-size:10px;color:var(--c-text-muted)">▼</span>
          </summary>
          <div style="position:absolute;top:100%;left:0;right:0;background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius);z-index:99;max-height:280px;overflow-y:auto;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);padding:6px;margin-top:4px">
            ${STATUS_FILTER_OPTS.filter(o => o.value !== 'all').map(o => `
              <label style="display:flex;align-items:center;padding:6px 8px;gap:8px;cursor:pointer;border-radius:4px" onmouseover="this.style.background='var(--c-bg)'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" value="${o.value}" ${gState.recordsState.statusFilter.includes(o.value) ? 'checked' : ''} onchange="recordsToggleStatus('${o.value}', this.checked)" style="accent-color:var(--c-accent)">
                <span style="font-size:13.5px">${esc(o.label)}</span>
              </label>
            `).join('')}
          </div>
        </details>
        <!-- Date from -->
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:140px">
          <label style="font-size:12px;color:var(--c-text-muted);white-space:nowrap;min-width:32px">From</label>
          <input class="form-control" type="date" id="rec-date-from"
            value="${gState.recordsState.dateFrom}"
            onchange="recordsFilterDate('from', this.value)"
            style="width:100%" />
        </div>
        <!-- Date to -->
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:140px">
          <label style="font-size:12px;color:var(--c-text-muted);white-space:nowrap;min-width:32px">To</label>
          <input class="form-control" type="date" id="rec-date-to"
            value="${gState.recordsState.dateTo}"
            onchange="recordsFilterDate('to', this.value)"
            style="width:100%" />
        </div>
        <!-- Clear -->
        <div style="width:100%;display:flex;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="recordsClearDates()" style="white-space:nowrap;padding:6px 10px">Clear dates</button>
        </div>
      </div>` : ''}
      <div class="consent-table-wrap table-wrap" style="border:none;border-radius:0">
        <table class="table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Modality</th>
              <th>Language</th>
              <th>Status</th>
              <th>Tier Flag</th>
              <th>Date</th>
              <th class="col-narrow col-right">Actions</th>
            </tr>
          </thead>
          <tbody id="records-tbody">${body}</tbody>
        </table>
      </div>
      ${(() => {
      /* Mobile card list — same data, card layout */
      const recs = (() => {
        if (gState.recordsState.loading || !gState.recordsState.records) return null;
        let list = [...gState.recordsState.records];
        if (gState.recordsState.search) {
          const q = gState.recordsState.search.toLowerCase();
          list = list.filter(r =>
            (r.patient?.name || '').toLowerCase().includes(q) ||
            (r.patient?.hospitalNumber || '').toLowerCase().includes(q)
          );
        }
        if (gState.recordsState.statusFilter) list = list.filter(r => r.status === gState.recordsState.statusFilter);
        return list;
      })();
      if (!recs) return `<div class="consent-card-list"><div class="loading-state" style="padding:32px"><span class="spinner spinner-dark"></span></div></div>`;
      if (!recs.length) return `<div class="consent-card-list"><div class="empty-state"><p>No records found.</p></div></div>`;
      const role = state.user?.role || '';
      const cards = recs.map(rec => {
        const action = (() => {
          switch (rec.status) {
            case 'draft': return { label: 'Continue', page: 'mri-screening', cls: 'btn-primary btn-sm' };
            case 'awaiting_signature': return { label: 'Sign Now', page: 'sign-consent', cls: 'btn-success btn-sm' };
            case 'pending_review': return role === 'radiologist' ? { label: 'Review', page: 'radiologist-review', cls: 'btn-warning btn-sm' } : { label: 'View', page: 'record-detail', cls: 'btn-secondary btn-sm' };
            default: return { label: 'View', page: 'record-detail', cls: 'btn-secondary btn-sm' };
          }
        })();
        return `
          <div class="consent-card" onclick="navigate('record-detail',{id:'${rec.id}'})">
            <div class="consent-card-head">
              <div class="consent-card-name">${esc(rec.patient?.name || '—')}</div>
              <span class="badge badge-${rec.status}">${esc(STATUS_LABELS[rec.status] || rec.status)}</span>
            </div>
            <div class="consent-card-meta">
              <span>${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</span>
              <span>${LANG_FLAG[rec.language] || ''}${esc(LANGUAGE_LABELS[rec.language] || rec.language || '')}</span>
              <span>${fmtDate(rec.createdAt)}</span>
            </div>
            <div class="consent-card-foot">
              <div></div>
              <button class="btn ${action.cls}" onclick="event.stopPropagation();navigate('${action.page}',{id:'${rec.id}'})">${esc(action.label)}</button>
            </div>
          </div>`;
      }).join('');
      return `<div class="consent-card-list" style="padding:12px">${cards}</div>`;
    })()}
    </div>`;
}

function renderConsents() {
  return renderRecordsTable(
    'Consent Records',
    'All patient consent sessions',
    null,
    true
  );
}

function renderFlagged() {
  if (!gState.recordsState.records && !gState.recordsState.loading) {
    gState.recordsState.loading = true;
    api('GET', '/consents').then(data => {
      gState.recordsState.records = data || [];
      gState.recordsState.loading = false;
      if (state.page === 'flagged') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.recordsState.records = [];
      gState.recordsState.loading = false;
      if (state.page === 'flagged') render();
    });
  }

  const recs = (gState.recordsState.records || []).filter(r =>
    r.status === 'pending_review' || r.status === 'flagged_tier1'
  );

  let content;
  if (gState.recordsState.loading || !gState.recordsState.records) {
    content = `<div class="card"><div class="card-body">
      <div class="loading-state" style="padding:40px">
        <span class="spinner spinner-dark"></span>
        <span style="margin-left:10px;font-size:13px;color:var(--c-text-muted)">Loading…</span>
      </div></div></div>`;
  } else if (!recs.length) {
    content = `<div class="card"><div class="card-body">
      <div class="empty-state" style="padding:40px 20px">
        ${IC.check.replace('stroke="currentColor"', 'stroke="#16A34A" stroke-width="2.5"')}
        <h3 style="margin-top:12px">No records pending review</h3>
        <p>All flagged cases have been reviewed.</p>
      </div></div></div>`;
  } else {
    content = recs.map(rec => buildFlaggedCard(rec)).join('');
  }

  const subtitle = recs.length
    ? `${recs.length} record${recs.length === 1 ? '' : 's'} awaiting radiologist review`
    : 'All cases reviewed';

  return `
    <div class="page-header">
      <div>
        <div class="page-title">Flagged Queue</div>
        <div class="page-subtitle">${subtitle}</div>
      </div>
    </div>
    ${content}`;
}

function buildFlaggedCard(rec) {
  const isTier1 = rec.status === 'flagged_tier1';
  const t1 = rec.tierFlags?.tier1 || [];
  const t2 = rec.tierFlags?.tier2 || [];
  const flagRows = [
    ...t1.map(f => `<div class="fq-flag-row">
      <span class="badge badge-tier1" style="flex-shrink:0">T1</span>
      <span>${esc(SCR_FLAG_LABELS[f] || f)}</span>
    </div>`),
    ...t2.map(f => `<div class="fq-flag-row">
      <span class="badge badge-tier2" style="flex-shrink:0">T2</span>
      <span>${esc(SCR_FLAG_LABELS[f] || f)}</span>
    </div>`),
  ].join('');
  return `
    <div class="fq-card">
      <div class="fq-accent ${isTier1 ? 't1' : 't2'}"></div>
      <div class="fq-body">
        <div class="fq-head">
          <div>
            <div class="fq-name">${esc(rec.patient?.name || '—')}</div>
            <div class="fq-sub">
              ${esc(MODALITY_LABELS[rec.modality] || rec.modality)}
              ${rec.patient?.hospitalNumber ? ' · ' + esc(rec.patient.hospitalNumber) : ''}
              · ${fmtDateTime(rec.createdAt)}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
            <span class="badge badge-${rec.status}">${esc(STATUS_LABELS[rec.status] || rec.status)}</span>
            <button class="btn btn-warning btn-sm"
              onclick="navigate('rad-review',{id:'${rec.id}'})">Review &amp; Sign Off</button>
            <button class="btn btn-ghost btn-sm"
              onclick="navigate('record-detail',{id:'${rec.id}'})">View Record</button>
          </div>
        </div>
        <div class="fq-flags">${flagRows}</div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   RADIOLOGIST REVIEW
═══════════════════════════════════════════════════════════════ */

/* Build per-domain positive-finding summary from structured screening object */
function scrDomainSummary(scr) {
  if (!scr) return [];
  const out = [];

  // Hearing
  const h = scr.hearing || {};
  if (h.hasHearingAid) {
    out.push({
      domain: 'Hearing', findings: [
        h.aidsRemoved === true ? 'Hearing aids — confirmed removed' :
          h.aidsRemoved === false ? 'Hearing aids — NOT confirmed removed' :
            'Hearing aids reported',
      ]
    });
  }

  // Implanted devices
  const im = scr.implants || {};
  const imF = [
    im.hasPacemakerICD && 'Cardiac pacemaker or ICD',
    im.hasHeartValve && 'Artificial heart valve or REVEAL device',
    im.hasAneurysmClip && 'Aneurysm clip (brain)',
    im.hasHydroShunt && 'Programmable hydrocephalus shunt',
    im.hasCochlearEarImplant && 'Cochlear or ear implant',
    im.hasStent && 'Stent in body',
    im.hasPainDrugDevice && 'Implanted pain control or drug infusion device',
    im.hasClipsPinsPlates && 'Clips, pins, plates, joint replacements or coils',
    im.recentSurgeryUnder6Weeks && 'Operation in last 6 weeks',
  ].filter(Boolean);
  if (imF.length) out.push({ domain: 'Implanted Devices', findings: imF });

  // Ocular
  const oc = scr.ocular || {};
  if (oc.hasMetalFragments) {
    out.push({
      domain: 'Metal in Eyes', findings: [
        oc.completelyRemoved === true ? 'Metal fragment in eyes — confirmed removed' :
          oc.completelyRemoved === false ? 'Metal fragment in eyes — NOT confirmed removed' :
            'Metal fragment in eyes — removal status unknown',
      ]
    });
  }

  // Surgical history
  const su = scr.surgicalHistory || {};
  if (su.hadOtherSurgery) out.push({ domain: 'Surgical History', findings: ['Prior surgery — possible undocumented implants'] });

  // Shrapnel
  const sh = scr.shrapnel || {};
  if (sh.hasShrapnelBlastInjury) out.push({ domain: 'Shrapnel / Blast Injuries', findings: ['Shrapnel or gunshot / bomb blast injury history'] });

  // Pregnancy / breastfeeding
  const pr = scr.pregnancy || {};
  const prF = [
    pr.isPossiblyPregnant && 'Possible pregnancy',
    pr.isBreastfeeding && 'Currently breastfeeding',
  ].filter(Boolean);
  if (prF.length) out.push({ domain: 'Pregnancy / Breastfeeding', findings: prF });

  // Medical conditions
  const co = scr.conditions || {};
  const coF = [
    co.epilepsy && 'Epilepsy',
    co.blackouts && 'Blackouts',
    co.angina && 'Angina',
    co.asthma && 'Asthma',
  ].filter(Boolean);
  if (coF.length) out.push({ domain: 'Medical Conditions', findings: coF });

  // Tattoos
  const ta = scr.tattoos || {};
  if (ta.hasTattoos) out.push({ domain: 'Tattoos', findings: ['Tattoos — possible metallic ink'] });

  return out;
}

function radReviewSelectDecision(val) {
  document.querySelectorAll('.decision-card').forEach(el => el.classList.remove('selected'));
  const card = document.getElementById('dc-' + val);
  if (card) {
    card.classList.add('selected');
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }
  radReviewCheckSubmit();
}

function radReviewCheckSubmit() {
  const decision = document.querySelector('input[name="rad-decision"]:checked')?.value;
  const notes = document.getElementById('rv-notes')?.value?.trim();
  const sigOk = gState.rvSigMode === 'upload' ? !!rvSigUploadedDataUrl
    : gState.rvSigMode === 'topaz' ? !!rvSigTopazPreviewUrl
      : (gState.rvSigPadInstance && !gState.rvSigPadInstance.isEmpty());
  const btn = document.getElementById('rv-submit-btn');
  if (btn) btn.disabled = !(decision && notes && sigOk);
}

async function radReviewSubmit() {
  const decision = document.querySelector('input[name="rad-decision"]:checked')?.value;
  const notes = document.getElementById('rv-notes')?.value?.trim();

  let radiologistSignatureImage = null;
  if (gState.rvSigMode === 'upload') {
    if (!gState.rvSigUploadedDataUrl) { toast('Please upload a signature image.', 'warning'); return; }
    radiologistSignatureImage = gState.rvSigUploadedDataUrl;
  } else if (gState.rvSigMode === 'topaz') {
    if (!gState.rvSigTopazPreviewUrl) { toast('Please capture a signature on the Topaz pad.', 'warning'); return; }
    radiologistSignatureImage = gState.rvSigTopazPreviewUrl;
  } else {
    if (!gState.rvSigPadInstance || gState.rvSigPadInstance.isEmpty()) { toast('Please draw your signature.', 'warning'); return; }
    radiologistSignatureImage = gState.rvSigPadInstance.toDataURL('image/png');
  }

  if (!decision || !notes) { toast('Please complete all required fields.', 'error'); return; }

  if (!gState.radReviewState.record?.id) { toast('Session error — please reload the page.', 'error'); return; }

  const btn = document.getElementById('rv-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>&nbsp;Submitting…`; }

  try {
    await api('PUT', `/consents/${gState.radReviewState.record.id}/review`, {
      decision,
      notes,
      radiologistSignature: state.user?.name || '',
      radiologistSignatureImage,
    });
    const id = gState.radReviewState.record.id;
    gState.radReviewState.record = null;
    if (decision === 'declined') {
      toast('Record declined and removed from queue.', 'success');
      navigate('flagged');
    } else {
      toast('Approved — patient may now sign the consent declaration.', 'success');
      navigate('record-detail', { id });
    }
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Decision'; }
  }
}

function renderRadReview() {
  const id = state.pageData.id;

  if (!gState.radReviewState.record && !gState.radReviewState.loading) {
    gState.radReviewState.loading = true;
    api('GET', `/consents/${id}`).then(data => {
      gState.radReviewState.record = data;
      gState.radReviewState.loading = false;
      if (state.page === 'rad-review') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.radReviewState.loading = false;
      navigate('flagged');
    });
  }

  const rec = gState.radReviewState.record;
  const back = `<button class="btn btn-ghost btn-sm" onclick="navigate('flagged')"
    style="margin-bottom:6px;margin-left:-6px">← Back to Flagged Queue</button>`;

  if (!rec) {
    return `<div class="page-header"><div>${back}
      <div class="page-title">Radiologist Review</div></div></div>
      <div class="card"><div class="card-body"><div class="loading-state">
        <span class="spinner spinner-dark"></span>
        <span style="margin-left:10px;font-size:13px;color:var(--c-text-muted)">Loading record…</span>
      </div></div></div>`;
  }

  const t1 = rec.tierFlags?.tier1 || [];
  const t2 = rec.tierFlags?.tier2 || [];
  const isTier1 = t1.length > 0;

  // ── Flags section ────────────────────────────────────────────
  const flagsHtml = [
    ...t1.map(f => `<div class="fq-flag-row" style="padding:8px 0;border-bottom:1px solid var(--c-border)">
      <span class="badge badge-tier1" style="flex-shrink:0;white-space:nowrap">T1 — Absolute contraindication</span>
      <span style="font-size:13.5px;font-weight:500">${esc(SCR_FLAG_LABELS[f] || f)}</span>
    </div>`),
    ...t2.map(f => `<div class="fq-flag-row" style="padding:8px 0;border-bottom:1px solid var(--c-border)">
      <span class="badge badge-tier2" style="flex-shrink:0;white-space:nowrap">T2 — Review required</span>
      <span style="font-size:13.5px;font-weight:500">${esc(SCR_FLAG_LABELS[f] || f)}</span>
    </div>`),
  ].join('');

  // ── Screening domain summary ──────────────────────────────────
  const scrDomains = scrDomainSummary(rec.stage1?.screening);
  const screeningHtml = scrDomains.length
    ? scrDomains.map(d => `
      <div class="scr-domain-block">
        <div class="scr-domain-name">${esc(d.domain)}</div>
        ${d.findings.map(f => `<div class="scr-domain-finding">• ${esc(f)}</div>`).join('')}
      </div>`).join('')
    : `<p style="color:var(--c-text-muted);font-size:13px;padding:8px 0">No structured screening data available.</p>`;

  // ── Decision cards ────────────────────────────────────────────
  const DECISIONS = [
    { value: 'approved', icon: '✅', label: 'Clear to proceed', desc: 'Procedure may go ahead as planned' },
    { value: 'proceed_with_modifications', icon: '🔄', label: 'Proceed with modifications', desc: 'Procedure may proceed under the conditions detailed in your notes' },
    { value: 'declined', icon: '⛔', label: 'Decline', desc: 'Procedure should not proceed — patient should be counselled accordingly' },
  ];
  const decisionsHtml = DECISIONS.map(d => `
    <label class="decision-card" id="dc-${d.value}" onclick="radReviewSelectDecision('${d.value}')">
      <input type="radio" name="rad-decision" value="${d.value}">
      <div style="font-size:20px;flex-shrink:0;line-height:1;margin-top:1px">${d.icon}</div>
      <div>
        <div class="decision-label">${d.label}</div>
        <div class="decision-desc">${d.desc}</div>
      </div>
    </label>`).join('');

  const userName = state.user?.name || '';
  const borderColor = isTier1 ? 'var(--c-danger)' : 'var(--c-warning)';

  return `
    <div class="page-header">
      <div>
        ${back}
        <div class="page-title">${esc(rec.patient?.name || 'Patient')}</div>
        <div class="page-subtitle">Radiologist Review · ${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</div>
      </div>
    </div>

    <!-- Flags requiring review -->
    <div class="card mb-4" style="border-left:4px solid ${borderColor}">
      <div class="card-header">
        <h3 style="display:flex;align-items:center;gap:8px">
          ${IC.warning.replace('stroke="currentColor"', `stroke="${isTier1 ? '#DC2626' : '#D97706'}"`)}&nbsp;
          ${isTier1 ? 'Tier 1 — Absolute Contraindication' : 'Tier 2 — Conditional Risk Factors'}
        </h3>
        <span class="badge badge-${rec.status}">${esc(STATUS_LABELS[rec.status] || rec.status)}</span>
      </div>
      <div class="card-body">${flagsHtml || '<p style="color:var(--c-text-muted);font-size:13px">No T1/T2 flags found.</p>'}</div>
    </div>

    <!-- Patient demographics -->
    <div class="card mb-4">
      <div class="card-header"><h3>${IC.users}&nbsp; Patient</h3></div>
      <div class="card-body">
        <div class="scr-meta-grid">
          ${rec.patient?.name ? `<div class="scr-meta-item"><div class="scr-meta-label">Full Name</div><div class="scr-meta-value">${esc(rec.patient.name)}</div></div>` : ''}
          ${rec.patient?.dob ? `<div class="scr-meta-item"><div class="scr-meta-label">Date of Birth</div><div class="scr-meta-value">${esc(rec.patient.dob)}</div></div>` : ''}
          ${rec.patient?.gender ? `<div class="scr-meta-item"><div class="scr-meta-label">Gender</div><div class="scr-meta-value">${esc(rec.patient.gender)}</div></div>` : ''}
          ${rec.patient?.hospitalNumber ? `<div class="scr-meta-item"><div class="scr-meta-label">Hospital Number</div><div class="scr-meta-value">${esc(rec.patient.hospitalNumber)}</div></div>` : ''}
          ${rec.patient?.phone ? `<div class="scr-meta-item"><div class="scr-meta-label">Phone</div><div class="scr-meta-value">${esc(rec.patient.phone)}</div></div>` : ''}
          ${rec.patient?.referringDoctor ? `<div class="scr-meta-item"><div class="scr-meta-label">Referring Doctor</div><div class="scr-meta-value">${esc(rec.patient.referringDoctor)}</div></div>` : ''}
          <div class="scr-meta-item"><div class="scr-meta-label">Modality</div><div class="scr-meta-value">${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</div></div>
          ${rec.bodyPart ? `<div class="scr-meta-item"><div class="scr-meta-label">Body Part</div><div class="scr-meta-value">${esc(rec.bodyPart)}</div></div>` : ''}
          <div class="scr-meta-item"><div class="scr-meta-label">Screened</div><div class="scr-meta-value">${fmtDateTime(rec.stage1?.screeningCompletedAt || rec.createdAt)}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">Signed</div><div class="scr-meta-value">${fmtDateTime(rec.stage1?.completedAt)}</div></div>
        </div>
      </div>
    </div>

    <!-- MRI screening positive findings -->
    <div class="card mb-4">
      <div class="card-header"><h3>MRI Safety Screening — Positive Findings</h3></div>
      <div class="card-body">${screeningHtml}</div>
    </div>

    <!-- Decision form -->
    <div class="card mb-4">
      <div class="card-header"><h3>Radiologist Decision</h3></div>
      <div class="card-body">
        <div class="section-label" style="margin-bottom:10px">Decision <span style="color:var(--c-danger)">*</span></div>
        ${decisionsHtml}
        <div class="divider"></div>
        <div class="form-group">
          <label class="form-label" for="rv-notes">
            Clinical Notes <span style="color:var(--c-danger)">*</span>
          </label>
          <textarea id="rv-notes" class="form-control" rows="5"
            placeholder="Document your clinical reasoning, any conditions placed on this consent, or grounds for declining…"
            oninput="radReviewCheckSubmit()"></textarea>
        </div>
        <div class="form-group mt-4">
          <label class="form-label">Radiologist Name</label>
          <input type="text" class="form-control mb-3"
            value="${esc(userName)}" readonly
            style="background:var(--c-bg);color:var(--c-text-sec);cursor:default;max-width:320px" />
          <div class="form-label">Radiologist Signature <span style="color:var(--c-danger)">*</span></div>
          <div class="sig-mode-tabs">
            <button id="rv-sig-tab-draw"   type="button" class="sig-mode-tab${gState.rvSigMode === 'draw' ? ' sig-tab-active' : ''}" onclick="rvSigSwitchMode('draw')">&#9998; Draw</button>
            <button id="rv-sig-tab-upload" type="button" class="sig-mode-tab${gState.rvSigMode === 'upload' ? ' sig-tab-active' : ''}" onclick="rvSigSwitchMode('upload')">&#8593; Upload image</button>
            <button id="rv-sig-tab-topaz"  type="button" class="sig-mode-tab${gState.rvSigMode === 'topaz' ? ' sig-tab-active' : ''}" onclick="rvSigSwitchMode('topaz')">&#128394; Topaz Pad</button>
          </div>
          <!-- Draw pane -->
          <div id="rv-sig-draw-pane"${gState.rvSigMode !== 'draw' ? ' style="display:none"' : ''}>
            <div class="sig-pad-wrap${gState.rvSigPadInstance && !gState.rvSigPadInstance?.isEmpty() ? ' sig-pad-filled' : ''}">
              <canvas id="rv-sigpad"></canvas>
              <div class="sig-pad-toolbar">
                <span class="sig-pad-hint">Sign using mouse, finger or stylus</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="rvSigClear()">Clear</button>
              </div>
            </div>
          </div>
          <!-- Upload pane -->
          <div id="rv-sig-upload-pane"${gState.rvSigMode !== 'upload' ? ' style="display:none"' : ''}>
            <label class="sig-upload-area" for="rv-sig-upload-input">
              <span style="font-size:22px">&#8593;</span>
              <span>Click to select a signature image</span>
              <span style="font-size:11px">JPG, PNG or GIF accepted</span>
            </label>
            <input type="file" id="rv-sig-upload-input" accept="image/*" style="display:none" onchange="rvSigHandleUpload(this)" />
            ${gState.rvSigUploadedDataUrl ? `<img id="rv-sig-upload-preview" class="sig-img" src="${gState.rvSigUploadedDataUrl}" alt="Uploaded signature" />` : `<img id="rv-sig-upload-preview" class="sig-img" style="display:none" alt="Uploaded signature" />`}
          </div>
          <!-- Topaz pane -->
          <div id="rv-sig-topaz-pane" class="sig-topaz-pane"${gState.rvSigMode !== 'topaz' ? ' style="display:none"' : ''}>
            <div class="sig-topaz-status">
              <span id="rv-sig-topaz-dot" class="sig-topaz-dot${gState.rvSigTopazStatus === 'capturing' ? ' dot-capturing' : gState.rvSigTopazStatus === 'captured' ? ' dot-captured' : gState.rvSigTopazStatus === 'error' ? ' dot-error' : ''}"></span>
              <span id="rv-sig-topaz-text">${gState.rvSigTopazStatus === 'capturing' ? 'Sign on the Topaz pad now\u2026' : gState.rvSigTopazStatus === 'captured' ? 'Signature captured successfully.' : gState.rvSigTopazStatus === 'error' ? 'SigPlusExtLite extension not detected. Install it in Chrome and reload.' : 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.'}</span>
            </div>
            <div class="sig-topaz-actions">
              <button type="button" class="btn btn-primary btn-sm" onclick="rvSigTopazSign()"${gState.rvSigTopazStatus === 'capturing' ? ' disabled' : ''}>Sign on Pad</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="rvSigTopazClear()"${gState.rvSigTopazStatus !== 'captured' ? ' disabled' : ''}>Clear</button>
            </div>
            ${gState.rvSigTopazPreviewUrl ? `<img id="rv-sig-topaz-preview" class="sig-img" src="${gState.rvSigTopazPreviewUrl}" alt="Radiologist signature" />` : `<img id="rv-sig-topaz-preview" class="sig-img" style="display:none" alt="Radiologist signature" />`}
            <div class="form-hint" style="margin-top:4px">Requires the <a href="https://chrome.google.com/webstore/detail/sigplusextlite/gjaebefdmgmhgheehpjpeclhplpkdpbi" target="_blank" rel="noopener">SigPlusExtLite Chrome extension</a> and the Topaz L460 pad connected via USB.</div>
          </div>
        </div>
        <button id="rv-submit-btn" class="btn btn-primary mt-4"
          onclick="radReviewSubmit()" disabled>
          Submit Decision
        </button>
      </div>
    </div>`;
}

function renderAdminPanel() {
  // Load consent records when on the records tab
  if (gState.adminState.tab === 'records' && !gState.adminState.records && !gState.adminState.loading) {
    gState.adminState.loading = true;
    api('GET', '/consents').then(data => {
      gState.adminState.records = data;
      gState.adminState.loading = false;
      if (state.page === 'admin') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.adminState.records = [];
      gState.adminState.loading = false;
      if (state.page === 'admin') render();
    });
  }

  // Load users when on the staff tab
  if (gState.adminState.tab === 'staff' && !gState.adminState.users && !gState.adminState.usersLoading) {
    gState.adminState.usersLoading = true;
    api('GET', '/users').then(data => {
      gState.adminState.users = data;
      gState.adminState.usersLoading = false;
      if (state.page === 'admin') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.adminState.users = [];
      gState.adminState.usersLoading = false;
      if (state.page === 'admin') render();
    });
  }

  // Load audit logs when on the audit tab
  if (gState.adminState.tab === 'audit' && !gState.adminState.auditLogs && !gState.adminState.auditLoading) {
    gState.adminState.auditLoading = true;
    api('GET', '/audit').then(data => {
      gState.adminState.auditLogs = data;
      gState.adminState.auditLoading = false;
      if (state.page === 'admin') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.adminState.auditLogs = [];
      gState.adminState.auditLoading = false;
      if (state.page === 'admin') render();
    });
  }

  const thStyle = 'padding:10px 16px;text-align:left;font-size:12px;color:var(--c-text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px';

  // ── Records tab ──────────────────────────────────────────────
  let recordsContent = '';
  if (gState.adminState.tab === 'records') {
    const recs = gState.adminState.records;
    const MODALITY_SHORT = {
      mri_without_contrast: 'MRI', mri_with_gadolinium: 'MRI+Gad',
      ct_without_contrast: 'CT', ct_with_iv_contrast: 'CT+IV', mammography: 'Mammo',
    };
    let tableBody = '';
    if (!recs) {
      tableBody = `<tr><td colspan="5" style="text-align:center;padding:24px"><span class="spinner spinner-dark"></span>&nbsp;Loading…</td></tr>`;
    } else if (recs.length === 0) {
      tableBody = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--c-text-muted)">No consent records found.</td></tr>`;
    } else {
      recs.forEach(r => {
        tableBody += `<tr>
          <td style="font-weight:500">${esc(r.patient?.name || '—')}</td>
          <td style="color:var(--c-text-sec)">${esc(MODALITY_SHORT[r.modality] || r.modality)}</td>
          <td><span class="badge badge-${r.status}">${esc(STATUS_LABELS[r.status] || r.status)}</span></td>
          <td style="color:var(--c-text-muted);font-size:12px">${fmtDate(r.createdAt)}</td>
          <td style="text-align:right;display:flex;gap:6px;justify-content:flex-end">
            ${r.status === 'declined' ? `<button class="btn btn-ghost btn-sm"
              onclick="adminRecallRecord('${r.id}','${esc(r.patient?.name || 'this record')}')">Recall</button>` : ''}
            <button class="btn btn-danger btn-sm"
              onclick="adminDeleteRecord('${r.id}','${esc(r.patient?.name || 'this record')}')">Delete</button>
          </td>
        </tr>`;
      });
    }
    const count = recs?.length ?? '…';
    recordsContent = `
      <div class="card mb-4">
        <div class="card-header" style="justify-content:space-between;align-items:center">
          <h3>Consent Records <span style="font-size:13px;font-weight:400;color:var(--c-text-muted)">(${count})</span></h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="adminLoadDemo()">Load Demo Data</button>
            <button class="btn btn-danger btn-sm" onclick="adminDeleteAll()"
              ${!recs || recs.length === 0 ? 'disabled' : ''}>Delete All Records</button>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:1px solid var(--c-border);background:var(--c-bg)">
                <th style="${thStyle}">Patient</th>
                <th style="${thStyle}">Procedure</th>
                <th style="${thStyle}">Status</th>
                <th style="${thStyle}">Created</th>
                <th style="padding:10px 16px"></th>
              </tr>
            </thead>
            <tbody style="font-size:13.5px">${tableBody}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Staff tab ────────────────────────────────────────────────
  let staffContent = '';
  if (gState.adminState.tab === 'staff') {
    const ROLE_BADGE = { radiographer: 'Radiographer', nurse: 'Nurse', radiologist: 'Radiologist', admin: 'Admin' };
    const ROLE_COLOR = { radiographer: '#2563eb', nurse: '#059669', radiologist: '#7c3aed', admin: '#b45309' };

    // Add / Edit form card
    let formCard = '';
    const sf = gState.adminState.staffForm;
    if (sf) {
      const isEdit = sf.mode === 'edit';
      formCard = `
        <div class="card mb-4" style="border:2px solid var(--c-primary)">
          <div class="card-header"><h3>${isEdit ? 'Edit Staff Account' : 'Add New Staff Account'}</h3></div>
          <div class="card-body">
            ${sf.error ? `<div class="alert alert-error mb-3">${esc(sf.error)}</div>` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input class="form-control" id="sf-name" value="${esc(sf.name || '')}" placeholder="e.g. Dr. Amara Okonkwo">
              </div>
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input class="form-control" id="sf-email" type="email" value="${esc(sf.email || '')}" placeholder="name@hospital.ng">
              </div>
              <div class="form-group">
                <label class="form-label">Role *</label>
                <select class="form-control" id="sf-role">
                  <option value="">— Select role —</option>
                  ${['radiographer', 'nurse', 'radiologist', 'admin'].map(r =>
        `<option value="${r}" ${sf.role === r ? 'selected' : ''}>${ROLE_BADGE[r]}</option>`).join('')}
                </select>
              </div>
              ${!isEdit ? `
              <div class="form-group">
                <label class="form-label">Initial Password *</label>
                <input class="form-control" id="sf-pwd" type="password" placeholder="Min. 8 characters">
              </div>` : '<div></div>'}
            </div>
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn btn-primary" onclick="staffFormSubmit()">${isEdit ? 'Save Changes' : 'Create Account'}</button>
              <button class="btn btn-ghost" onclick="staffFormCancel()">Cancel</button>
            </div>
          </div>
        </div>`;
    }

    // Password reset form
    let pwdCard = '';
    const pf = gState.adminState.pwdForm;
    if (pf) {
      pwdCard = `
        <div class="card mb-4" style="border:2px solid var(--c-warning,#f59e0b)">
          <div class="card-header"><h3>Reset Password — ${esc(pf.userName)}</h3></div>
          <div class="card-body">
            ${pf.error ? `<div class="alert alert-error mb-3">${esc(pf.error)}</div>` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group">
                <label class="form-label">New Password *</label>
                <input class="form-control" id="pf-new" type="password" placeholder="Min. 8 characters">
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Password *</label>
                <input class="form-control" id="pf-confirm" type="password" placeholder="Repeat new password">
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn btn-primary" onclick="staffPwdSubmit()">Set Password</button>
              <button class="btn btn-ghost" onclick="staffPwdCancel()">Cancel</button>
            </div>
          </div>
        </div>`;
    }

    // Users table
    const users = gState.adminState.users;
    let usersBody = '';
    if (!users) {
      usersBody = `<tr><td colspan="5" style="text-align:center;padding:24px"><span class="spinner spinner-dark"></span>&nbsp;Loading…</td></tr>`;
    } else if (users.length === 0) {
      usersBody = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--c-text-muted)">No staff accounts found.</td></tr>`;
    } else {
      users.forEach(u => {
        const isMe = u.id === state.user?.id;
        usersBody += `<tr>
          <td style="font-weight:500">${esc(u.name)}${isMe ? ' <span style="font-size:11px;color:var(--c-text-muted)">(you)</span>' : ''}</td>
          <td style="color:var(--c-text-sec);font-size:13px">${esc(u.email)}</td>
          <td><span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;background:${ROLE_COLOR[u.role]}22;color:${ROLE_COLOR[u.role]}">${esc(ROLE_BADGE[u.role] || u.role)}</span></td>
          <td style="color:var(--c-text-muted);font-size:12px">${fmtDate(u.createdAt)}</td>
          <td style="text-align:right">
            <div style="display:flex;gap:4px;justify-content:flex-end">
              <button class="btn btn-ghost btn-sm" onclick="staffEditStart('${u.id}','${esc(u.name)}','${esc(u.email)}','${u.role}')">${IC.edit}</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--c-warning,#d97706)" title="Reset password"
                onclick="staffPwdStart('${u.id}','${esc(u.name)}')">${IC.lock}</button>
              ${!isMe ? `<button class="btn btn-ghost btn-sm" style="color:var(--c-danger)"
                onclick="staffDelete('${u.id}','${esc(u.name)}')">${IC.trash}</button>` : ''}
            </div>
          </td>
        </tr>`;
      });
    }

    staffContent = `
      ${formCard}
      ${pwdCard}
      <div class="card mb-4">
        <div class="card-header" style="justify-content:space-between;align-items:center">
          <h3>Staff Accounts <span style="font-size:13px;font-weight:400;color:var(--c-text-muted)">(${users?.length ?? '…'})</span></h3>
          <button class="btn btn-primary btn-sm" onclick="staffFormNew()">${IC.plus} Add Staff</button>
        </div>
        <div class="card-body" style="padding:0">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:1px solid var(--c-border);background:var(--c-bg)">
                <th style="${thStyle}">Name</th>
                <th style="${thStyle}">Email</th>
                <th style="${thStyle}">Role</th>
                <th style="${thStyle}">Created</th>
                <th style="padding:10px 16px"></th>
              </tr>
            </thead>
            <tbody style="font-size:13.5px">${usersBody}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Audit Logs tab ───────────────────────────────────────────
  let auditContent = '';
  if (gState.adminState.tab === 'audit') {
    const logs = gState.adminState.auditLogs;
    let logsBody = '';
    if (!logs) {
      logsBody = `<tr><td colspan="6" style="text-align:center;padding:24px"><span class="spinner spinner-dark"></span>&nbsp;Loading…</td></tr>`;
    } else if (logs.length === 0) {
      logsBody = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--c-text-muted)">No audit logs found.</td></tr>`;
    } else {
      logs.forEach(L => {
        const detailsStr = typeof L.details === 'object' ? JSON.stringify(L.details) : L.details || '—';
        logsBody += `<tr>
          <td style="color:var(--c-text-muted);font-size:12px;white-space:nowrap">${new Date(L.timestamp).toLocaleString()}</td>
          <td style="font-weight:500;white-space:nowrap">${esc(L.userId)}</td>
          <td><span class="badge badge-default" style="font-size:11px">${esc(L.action)}</span></td>
          <td style="color:var(--c-text-sec);font-size:13px;white-space:nowrap">${esc(L.resourceType || '—')} / ${esc(L.resourceId || '—')}</td>
          <td style="font-size:12px;color:var(--c-text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(detailsStr)}">${esc(detailsStr)}</td>
          <td style="color:var(--c-text-muted);font-size:12px;white-space:nowrap">${esc(L.ipAddress || '—')}</td>
        </tr>`;
      });
    }

    auditContent = `
      <div class="card mb-4" style="overflow-x:auto">
        <div class="card-header" style="justify-content:space-between;align-items:center">
          <h3>System Audit Logs <span style="font-size:13px;font-weight:400;color:var(--c-text-muted)">(${logs?.length ?? '…'})</span></h3>
          <button class="btn btn-ghost btn-sm" onclick="adminRefreshAudit()">&#x21bb; Refresh</button>
        </div>
        <div class="card-body" style="padding:0">
          <table style="width:100%;border-collapse:collapse;min-width:700px">
            <thead>
              <tr style="border-bottom:1px solid var(--c-border);background:var(--c-bg)">
                <th style="${thStyle}">Time</th>
                <th style="${thStyle}">User</th>
                <th style="${thStyle}">Action</th>
                <th style="${thStyle}">Resource</th>
                <th style="${thStyle}">Details</th>
                <th style="${thStyle}">IP Address</th>
              </tr>
            </thead>
            <tbody style="font-size:13.5px">${logsBody}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Settings tab ─────────────────────────────────────────────
  let settingsContent = '';
  if (gState.adminState.tab === 'settings') {
    const currentLogo = window.gState?.settings?.center_logo || '';
    settingsContent = `
      <div class="card mb-4" style="max-width: 600px;">
        <div class="card-header">
          <h3>Center Branding</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Custom Login Logo</label>
            <div style="margin-bottom: 12px; font-size: 13px; color: var(--c-text-muted);">
              Upload your hospital or clinic logo to display on the login screen. Maximum 2MB. Rectangular or square images with transparent backgrounds work best.
            </div>
            ${currentLogo ? `
              <div style="margin-bottom: 16px; padding: 16px; border: 1px dashed var(--c-border); border-radius: 8px; text-align: center; background: #fff;">
                <img src="${currentLogo}" style="max-height: 80px; object-fit: contain;">
              </div>
            ` : ''}
            <input type="file" id="admin-logo-upload" class="form-control" accept="image/png, image/jpeg, image/svg+xml" onchange="adminHandleLogoUpload(event)">
          </div>
        </div>
      </div>
    `;
  }

  const tabBtn = (t, label, icon) => {
    const active = gState.adminState.tab === t;
    return `<button class="btn ${active ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="adminSwitchTab('${t}')">${icon} ${label}</button>`;
  };

  return `
    <div class="page-header">
      <div>
        <div class="page-title">Admin Panel</div>
        <div class="page-subtitle">${gState.adminState.tab === 'staff' ? 'Staff account management' : gState.adminState.tab === 'audit' ? 'System audit trail records' : 'Record management'}</div>
      </div>
      <div style="display:flex;gap:8px">
        ${tabBtn('records', 'Records', IC.records)}
        ${tabBtn('staff', 'Staff', IC.users)}
        ${tabBtn('audit', 'Audit Logs', '☷')}
        ${tabBtn('settings', 'Settings', '⚙')}
      </div>
    </div>
    ${recordsContent}
    ${staffContent}
    ${auditContent}
    ${settingsContent}`;
}

async function adminRecallRecord(id, name) {
  if (!confirm(`Recall the declined record for "${name}"? It will be returned to the active queue for re-evaluation.`)) return;
  try {
    const updated = await api('PUT', `/consents/${id}/recall`);
    toast(`Record recalled successfully.`, 'success');
    if (gState.adminState.records) {
      const idx = gState.adminState.records.findIndex(r => r.id === id);
      if (idx !== -1) gState.adminState.records[idx] = updated;
    }
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function adminDeleteRecord(id, name) {
  if (!confirm(`Delete the record for "${name}"? This cannot be undone.`)) return;
  try {
    await api('DELETE', `/consents/${id}`);
    toast(`Record deleted.`, 'success');
    gState.adminState.records = gState.adminState.records?.filter(r => r.id !== id) ?? null;
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function adminLoadDemo() {
  if (!confirm('Replace current records with demo data? This cannot be undone.')) return;
  try {
    const res = await api('POST', '/consents/seed-demo');
    toast(`Loaded ${res.loaded} demo records.`, 'success');
    gState.adminState.records = null;
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function adminDeleteAll() {
  const count = gState.adminState.records?.length ?? 0;
  if (!confirm(`Delete all ${count} consent record${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;
  try {
    await api('DELETE', '/consents');
    toast('All records deleted.', 'success');
    gState.adminState.records = [];
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ── Admin tab switching ────────────────────────────────────────

async function adminHandleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('Please select a valid image file.', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toast('Logo must be less than 2MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Str = e.target.result;
    try {
      toast('Updating logo...', 'info');
      await api('PUT', '/settings/center_logo', { value: base64Str });
      toast('Center logo updated successfully.', 'success');
      window.gState.settings = window.gState.settings || {};
      window.gState.settings.center_logo = base64Str;
      render();
    } catch (err) {
      toast(err.message || 'Failed to update logo.', 'error');
    }
  };
  reader.readAsDataURL(file);
}

function adminRefreshAudit() {
  gState.adminState.auditLogs = null;
  render();
}

function adminSwitchTab(tab) {
  gState.adminState.tab = tab;
  gState.adminState.staffForm = null;
  gState.adminState.pwdForm = null;
  // Trigger load on first visit to staff tab
  if (tab === 'staff' && !gState.adminState.users && !gState.adminState.usersLoading) {
    gState.adminState.users = null;
  }
  render();
}

// ── Staff CRUD ─────────────────────────────────────────────────
function staffFormNew() {
  gState.adminState.staffForm = { mode: 'add', name: '', email: '', role: '', error: null };
  gState.adminState.pwdForm = null;
  render();
}

function staffFormCancel() {
  gState.adminState.staffForm = null;
  render();
}

function staffEditStart(id, name, email, role) {
  gState.adminState.staffForm = { mode: 'edit', id, name, email, role, error: null };
  gState.adminState.pwdForm = null;
  render();
}

async function staffFormSubmit() {
  const sf = gState.adminState.staffForm;
  if (!sf) return;
  const name = document.getElementById('sf-name')?.value?.trim();
  const email = document.getElementById('sf-email')?.value?.trim();
  const role = document.getElementById('sf-role')?.value;
  const pwd = document.getElementById('sf-pwd')?.value;

  if (!name) { sf.error = 'Name is required.'; render(); return; }
  if (!email) { sf.error = 'Email is required.'; render(); return; }
  if (!role) { sf.error = 'Role is required.'; render(); return; }
  if (sf.mode === 'add' && !pwd) { sf.error = 'Initial password is required.'; render(); return; }

  try {
    if (sf.mode === 'add') {
      const created = await api('POST', '/users', { name, email, role, password: pwd });
      toast(`Account created for ${created.name}.`, 'success');
      gState.adminState.users = null; // reload
    } else {
      const updated = await api('PUT', `/users/${sf.id}`, { name, email, role });
      toast(`Account updated for ${updated.name}.`, 'success');
      gState.adminState.users = null; // reload list from server
    }
    gState.adminState.staffForm = null;
    render();
  } catch (err) {
    sf.error = err.message;
    render();
  }
}

function staffPwdStart(userId, userName) {
  gState.adminState.pwdForm = { userId, userName, error: null };
  gState.adminState.staffForm = null;
  render();
}

function staffPwdCancel() {
  gState.adminState.pwdForm = null;
  render();
}

async function staffPwdSubmit() {
  const pf = gState.adminState.pwdForm;
  if (!pf) return;
  const newPwd = document.getElementById('pf-new')?.value;
  const confirm2 = document.getElementById('pf-confirm')?.value;
  if (!newPwd) { pf.error = 'New password is required.'; render(); return; }
  if (newPwd.length < 8) { pf.error = 'Password must be at least 8 characters.'; render(); return; }
  if (newPwd !== confirm2) { pf.error = 'Passwords do not match.'; render(); return; }
  try {
    await api('PUT', `/users/${pf.userId}/password`, { newPassword: newPwd });
    toast(`Password reset for ${pf.userName}.`, 'success');
    gState.adminState.pwdForm = null;
    render();
  } catch (err) {
    pf.error = err.message;
    render();
  }
}

async function staffDelete(id, name) {
  if (!confirm(`Delete account for "${name}"? This cannot be undone.`)) return;
  try {
    await api('DELETE', `/users/${id}`);
    toast(`Account for ${name} deleted.`, 'success');
    gState.adminState.users = gState.adminState.users?.filter(u => u.id !== id) ?? null;
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ═══════════════════════════════════════════════════════════════
   CHANGE PASSWORD (all roles)
═══════════════════════════════════════════════════════════════ */
function renderChangePassword() {
  const s = gState.changePwdState;
  return `
    <div class="page-header">
      <div>
        <div class="page-title">Change Password</div>
        <div class="page-subtitle">Update your account password</div>
      </div>
    </div>
    <div class="card" style="max-width:480px">
      <div class="card-header"><h3>${IC.lock} Change Password</h3></div>
      <div class="card-body">
        ${s.error ? `<div class="alert alert-error mb-3">${esc(s.error)}</div>` : ''}
        ${s.success ? `<div class="alert alert-success mb-3">Password changed successfully.</div>` : ''}
        <div class="form-group">
          <label class="form-label">Current Password *</label>
          <input class="form-control" id="cp-current" type="password" placeholder="Your current password">
        </div>
        <div class="form-group">
          <label class="form-label">New Password *</label>
          <input class="form-control" id="cp-new" type="password" placeholder="Min. 8 characters">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password *</label>
          <input class="form-control" id="cp-confirm" type="password" placeholder="Repeat new password">
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary" onclick="changePasswordSubmit()">Update Password</button>
          <button class="btn btn-ghost" onclick="navigate('dashboard')">Cancel</button>
        </div>
      </div>
    </div>`;
}

async function changePasswordSubmit() {
  const current = document.getElementById('cp-current')?.value;
  const newPwd = document.getElementById('cp-new')?.value;
  const confirm2 = document.getElementById('cp-confirm')?.value;
  gState.changePwdState.error = null;
  gState.changePwdState.success = false;
  if (!current) { gState.changePwdState.error = 'Current password is required.'; render(); return; }
  if (!newPwd) { gState.changePwdState.error = 'New password is required.'; render(); return; }
  if (newPwd.length < 8) { gState.changePwdState.error = 'New password must be at least 8 characters.'; render(); return; }
  if (newPwd !== confirm2) { gState.changePwdState.error = 'Passwords do not match.'; render(); return; }
  try {
    await api('PUT', `/users/${state.user.id}/password`, { currentPassword: current, newPassword: newPwd });
    gState.changePwdState.success = true;
    render();
    // Clear fields after success
    setTimeout(() => {
      ['cp-current', 'cp-new', 'cp-confirm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }, 50);
  } catch (err) {
    gState.changePwdState.error = err.message;
    render();
  }
}

/* ═══════════════════════════════════════════════════════════════
   NEW CONSENT — STATE HELPERS
═══════════════════════════════════════════════════════════════ */
function selectModality(mod) {
  gState.ncState.modality = mod;
  document.querySelectorAll('.modality-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.mod === mod)
  );
  updateNcSubmit();
}

function selectLanguage(lang) {
  gState.ncState.language = lang;
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.lang === lang)
  );
}

function selectConsentMode(mode) {
  gState.ncState.consentMode = mode;
  document.querySelectorAll('.consent-mode-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.mode === mode)
  );
}

function selectSex(sex) {
  gState.ncState.sex = sex;
  document.querySelectorAll('.sex-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.sex === sex)
  );
  updateNcSubmit();
}

function updateNcSubmit() {
  const btn = document.getElementById('nc-submit-btn');
  if (!btn) return;
  const name = (document.getElementById('nc-name')?.value || '').trim();
  btn.disabled = !(name && gState.ncState.modality && gState.ncState.sex);
}

/* ═══════════════════════════════════════════════════════════════
   NEW CONSENT — SUBMIT
═══════════════════════════════════════════════════════════════ */
async function submitNewConsent() {
  const name = (document.getElementById('nc-name')?.value || '').trim();
  if (!name || !gState.ncState.modality || !gState.ncState.sex) return;

  const btn = document.getElementById('nc-submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>&nbsp;Creating record…`;

  // Extract clinical params
  const urea = (document.getElementById('nc-urea')?.value || '').trim();
  const creatinine = (document.getElementById('nc-creatinine')?.value || '').trim();
  const bpSys = (document.getElementById('nc-bp-sys')?.value || '').trim();
  const bpDia = (document.getElementById('nc-bp-dia')?.value || '').trim();
  const pulse = (document.getElementById('nc-pulse')?.value || '').trim();
  const spo2 = (document.getElementById('nc-spo2')?.value || '').trim();
  const temp = (document.getElementById('nc-temp')?.value || '').trim();
  const weight = (document.getElementById('nc-weight')?.value || '').trim();

  const hasVitals = bpSys || bpDia || pulse || spo2 || temp || weight;
  let vitalsPayload = null;

  if (hasVitals) {
    vitalsPayload = {};
    if (bpSys && bpDia) vitalsPayload.bp = `${bpSys}/${bpDia}`;
    else if (bpSys) vitalsPayload.bp = bpSys;

    if (pulse) vitalsPayload.pulse = pulse;
    if (spo2) vitalsPayload.spo2 = spo2;
    if (temp) vitalsPayload.temperature = temp;
    if (weight) vitalsPayload.weight = weight;
  }

  const payload = {
    patient: {
      name,
      hospitalNumber: (document.getElementById('nc-hosp-num')?.value || '').trim(),
      dob: (document.getElementById('nc-dob')?.value || ''),
      gender: gState.ncState.sex,
      phone: (document.getElementById('nc-phone')?.value || '').trim(),
      referringDoctor: (document.getElementById('nc-ref-doctor')?.value || '').trim(),
      urea: urea || null,
      creatinine: creatinine || null,
      vitals: vitalsPayload
    },
    modality: gState.ncState.modality,
    language: gState.ncState.language,
    consentMode: gState.ncState.consentMode,
    bodyPart: (document.getElementById('nc-body-part')?.value || '').trim(),
  };

  try {
    const data = await api('POST', '/consents/sessions', payload);
    if (!data) return;
    if (gState.ncState.modality.startsWith('mri_')) {
      navigate('mri-screening', { consent: data });
    } else if (gState.ncState.modality === 'mammography') {
      navigate('mammography-screening', { consent: data });
    } else {
      navigate('safety-screening', { consent: data });
    }
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Start Consent Workflow →';
    updateNcSubmit();
  }
}

/* ═══════════════════════════════════════════════════════════════
   RECORD DETAIL
═══════════════════════════════════════════════════════════════ */
function navigateToSignConsent() {
  const rec = gState.recordDetailState.record;
  if (!rec) return;
  navigate('consent-declaration', { consent: rec });
}

function downloadPDF(id) {
  const rec = gState.recordDetailState.record;
  if (!rec) { toast('Record not loaded.', 'error'); return; }

  const p = rec.patient || {};
  const s1 = rec.stage1 || {};
  const s2 = rec.stage2 || {};
  const s3 = rec.stage3 || {};
  const rv = rec.radiologistReview || null;
  const tf = rec.tierFlags || { tier1: [], tier2: [], tier3: [] };
  const scr = s1.screening || {};

  function fmtDt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  function v(val) { return (val == null || val === '') ? '—' : String(val); }
  function row(label, value) {
    return `<tr><td class="lbl">${label}</td><td>${v(value)}</td></tr>`;
  }
  function sec(title) {
    return `<tr class="sec-head"><td colspan="2">${title}</td></tr>`;
  }

  const MLABELS = {
    mri_without_contrast: 'MRI (no contrast)',
    mri_with_gadolinium: 'MRI + Gadolinium',
    ct_without_contrast: 'CT (no contrast)',
    ct_with_iv_contrast: 'CT + IV Contrast',
    mammography: 'Mammography',
  };

  const FLAG_LABELS = {
    pregnancy: 'Possible pregnancy', age_under_40: 'Patient under 40',
    breast_implant: 'Breast implant present', previous_surgery: 'Previous breast surgery',
    mastectomy: 'Mastectomy', non_mr_conditional_pacemaker: 'Pacemaker/ICD — NOT MR-conditional',
    cochlear_implant_unknown: 'Cochlear implant — type unknown',
    deep_brain_stimulator: 'Deep brain stimulator',
    aneurysm_clip_unknown: 'Aneurysm clip — type unknown',
    spinal_cord_stimulator: 'Spinal cord stimulator',
    metallic_ocular_foreign_body: 'Metallic ocular foreign body',
    on_dialysis: 'Currently on dialysis',
    prior_severe_contrast_reaction: 'Prior severe contrast reaction',
    ckd_reduced_renal_function: 'CKD / reduced renal function',
    claustrophobia: 'Severe claustrophobia',
  };

  // Mammography screening section
  const isMmg = rec.modality === 'mammography';
  const isMri = rec.modality?.startsWith('mri');
  let scrSection = '';

  if (isMmg && Object.keys(scr).length) {
    const yn = k => scr[k] === 'yes' ? 'Yes' : scr[k] === 'no' ? 'No' : v(scr[k]);
    const sideLabel = {
      none: 'None', right: 'Right', left: 'Left', both: 'Both',
      yes_right: 'Yes – Right', yes_left: 'Yes – Left', yes_both: 'Yes – Both'
    };
    scrSection = `
      <h3>Mammography Patient Questionnaire</h3>
      <table>
        ${sec('Safety')}
        ${row('Age 40 or above', yn('age_40_plus'))}
        ${row('Pregnancy / possible pregnancy', yn('pregnancy'))}
        ${row('Referral source', scr.referral_source === 'lasuth' ? 'LASUTH' : scr.referral_source === 'outside_hospital' ? 'Outside Hospital' : v(scr.referral_source))}
        ${sec('Gynaecological History')}
        ${row('Last Menstrual Period', v(scr.lmp_date))}
        ${row('Age at menarche', v(scr.menarche_age))}
        ${row('Age at first pregnancy', v(scr.first_pregnancy_age))}
        ${row('Number of pregnancies', v(scr.num_pregnancies))}
        ${row('Number of live births', v(scr.num_live_births))}
        ${row('Hormone drugs', yn('hormone_drugs'))}
        ${scr.hormone_drugs === 'yes' ? row('Hormone drug details', v(scr.hormone_drugs_details)) : ''}
        ${sec('Family History')}
        ${row('Family history of breast cancer', yn('family_history'))}
        ${scr.family_history === 'yes' ? row('Relatives affected', v((scr.family_relatives || []).join(', '))) : ''}
        ${sec('Breast History')}
        ${row('Previous breast surgery', yn('previous_surgery'))}
        ${scr.previous_surgery === 'yes' ? row('Surgery side', v(sideLabel[scr.surgery_side] || scr.surgery_side)) : ''}
        ${scr.previous_surgery === 'yes' ? row('Surgery details', v(scr.surgery_details)) : ''}
        ${row('Mastectomy', v(sideLabel[scr.mastectomy] || scr.mastectomy))}
        ${scr.biopsy_date ? row('Date of biopsy', v(scr.biopsy_date)) : ''}
        ${row('Breast implant present', yn('breast_implant'))}
        ${sec('Current Breast Symptoms')}
        ${row('Current complaints', v(scr.breast_complaints) || '—')}
        ${row('Nipple discharge', v(sideLabel[scr.nipple_discharge] || scr.nipple_discharge))}
        ${row('Breast tenderness', v(sideLabel[scr.breast_tenderness] || scr.breast_tenderness))}
        ${row('Breast lump / pain', v(sideLabel[scr.breast_lump_pain] || scr.breast_lump_pain))}
        ${sec('Lifestyle & Medications')}
        ${row('Caffeine consumption', yn('caffeine'))}
        ${scr.caffeine === 'yes' ? row('Last caffeine date', v(scr.caffeine_last_date)) : ''}
        ${scr.caffeine === 'yes' ? row('Daily caffeine intake', v(scr.caffeine_diet)) : ''}
        ${row('Breastfeeding', yn('breastfeeding'))}
        ${scr.breastfeeding === 'yes' ? row('Breastfeeding duration', v(scr.breastfeeding_duration)) : ''}
        ${row('Oral contraceptive pills', yn('oral_contraceptive'))}
        ${row('Hormone replacement therapy', yn('hrt'))}
        ${sec('Previous Breast Imaging')}
        ${row('Previous mammogram / MRI / USS', yn('previous_imaging'))}
        ${scr.previous_imaging === 'yes' ? row('Imaging date', v(scr.imaging_date)) : ''}
        ${scr.previous_imaging === 'yes' ? row('Imaging location', v(scr.imaging_location)) : ''}
        ${scr.previous_imaging === 'yes' ? row('Report summary', v(scr.imaging_report)) : ''}
        ${sec('Administrative')}
        ${row('Post-menopausal', yn('menopausal'))}
        ${row('Payment method', scr.payment_method === 'insurance' ? 'Insurance' : scr.payment_method === 'out_of_pocket' ? 'Out-of-Pocket' : v(scr.payment_method))}
        ${scr.referral_reason ? row('Reason for referral', v(scr.referral_reason)) : ''}
      </table>`;
  }

  // MRI / general safety flags
  let flagSection = '';
  const allFlags = [...(tf.tier1 || []), ...(tf.tier2 || []), ...(tf.tier3 || [])];
  if (allFlags.length) {
    const flagRows = [
      ...(tf.tier1 || []).map(f => `<tr><td>${FLAG_LABELS[f] || f}</td><td class="tier t1">Tier 1 — Contraindicated</td></tr>`),
      ...(tf.tier2 || []).map(f => `<tr><td>${FLAG_LABELS[f] || f}</td><td class="tier t2">Tier 2 — Review Required</td></tr>`),
      ...(tf.tier3 || []).map(f => `<tr><td>${FLAG_LABELS[f] || f}</td><td class="tier t3">Tier 3 — Awareness</td></tr>`),
    ].join('');
    flagSection = `
      <h3>Safety Flags</h3>
      <table><thead><tr><th>Flag</th><th>Classification</th></tr></thead>
      <tbody>${flagRows}</tbody></table>`;
  }

  // Radiologist review
  let rvSection = '';
  if (rv) {
    const decLabel = { approved: 'Approved', proceed_with_modifications: 'Proceed with Modifications', declined: 'Declined' };
    rvSection = `
      <h3>Radiologist Review</h3>
      <table>
        ${row('Decision', decLabel[rv.decision] || rv.decision)}
        ${row('Reviewed by', v(rv.reviewedByName))}
        ${row('Reviewed at', fmtDt(rv.reviewedAt))}
        ${rv.notes ? row('Notes', v(rv.notes)) : ''}
        ${row('Radiologist Signature', (rv.radiologistSignature || '') + (rv.radiologistSignatureImage ? `<br><img src="${rv.radiologistSignatureImage}" style="max-height:50px;max-width:200px;margin-top:6px;mix-blend-mode:multiply">` : ''))}
      </table>`;
  }

  // Signature image
  const sigHtml = s1.patientSignatureImage
    ? `<div class="sig-box"><img src="${s1.patientSignatureImage}" alt="Patient signature" style="max-height:80px;max-width:260px"></div>`
    : s1.patientSignature
      ? `<div class="sig-box sig-text">${esc(s1.patientSignature)}</div>`
      : '<div class="sig-box sig-empty">No signature captured</div>';

  const contentHtml = `
    <style>
      #pdf-export-wrap { font-family: Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 24px 32px; box-sizing: border-box; }
      #pdf-export-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
      #pdf-export-wrap h2, #pdf-export-wrap h3, #pdf-export-wrap table { page-break-inside: avoid !important; }
      #pdf-export-wrap .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1B6CA8; padding-bottom: 12px; margin-bottom: 20px; }
      #pdf-export-wrap .header-left .logo { font-size: 18pt; font-weight: 700; color: #1B6CA8; }
      #pdf-export-wrap .header-left .sub  { font-size: 9pt; color: #555; margin-top: 2px; }
      #pdf-export-wrap .header-right { text-align: right; font-size: 9pt; color: #555; }
      #pdf-export-wrap .header-right .rec-id { font-family: monospace; font-size: 8.5pt; color: #777; }
      #pdf-export-wrap .status-bar { background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 6px; padding: 8px 14px; margin-bottom: 18px; font-size: 9.5pt; color: #166534; font-weight: 600; }
      #pdf-export-wrap h2 { font-size: 12pt; font-weight: 700; color: #1B6CA8; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #DBEAFE; }
      #pdf-export-wrap h3 { font-size: 11pt; font-weight: 700; color: #1e3a5f; margin: 18px 0 6px; }
      #pdf-export-wrap table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5pt; }
      #pdf-export-wrap table thead th { background: #F1F5F9; padding: 6px 10px; text-align: left; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; border: 1px solid #CBD5E1; }
      #pdf-export-wrap table td { padding: 6px 10px; border: 1px solid #E2E8F0; vertical-align: top; }
      #pdf-export-wrap table tr.sec-head td { background: #F8FAFC; font-weight: 700; font-size: 9.5pt; color: #475569; text-transform: uppercase; letter-spacing: .5px; border-color: #CBD5E1; padding: 5px 10px; }
      #pdf-export-wrap td.lbl { width: 38%; color: #475569; font-weight: 600; }
      #pdf-export-wrap .tier { font-size: 9pt; font-weight: 700; }
      #pdf-export-wrap .t1 { color: #B91C1C; }
      #pdf-export-wrap .t2 { color: #B45309; }
      #pdf-export-wrap .t3 { color: #1D4ED8; }
      #pdf-export-wrap .sig-box { border: 1.5px solid #CBD5E1; border-radius: 6px; padding: 10px 14px; min-height: 70px; display: flex; align-items: center; justify-content: center; background: #F8FAFC; margin-top: 6px; }
      #pdf-export-wrap .sig-text { font-family: cursive; font-size: 16pt; color: #1B6CA8; }
      #pdf-export-wrap .sig-empty { color: #94A3B8; font-style: italic; font-size: 10pt; }
      #pdf-export-wrap .footer { margin-top: 28px; padding-top: 12px; border-top: 2px solid #E2E8F0; font-size: 8.5pt; color: #94A3B8; display: flex; justify-content: space-between; page-break-inside: avoid; }
    </style>
    <div id="pdf-export-wrap">
      <div class="header">
        <div class="header-left">
          <div class="logo">RadConsent</div>
          <div class="sub">Radiology Consent Management System</div>
        </div>
        <div class="header-right">
          <div><strong>CONSENT RECORD</strong></div>
          <div class="rec-id">${esc(rec.id)}</div>
          <div>Generated: ${fmtDt(new Date().toISOString())}</div>
        </div>
      </div>

      <div class="status-bar">&#10003; Record Status: CLOSED — All stages complete</div>

      <h2>Patient &amp; Procedure Details</h2>
      <table>
        ${row('Full Name', p.name)}
        ${row('Date of Birth', p.dob)}
        ${row('Gender', p.gender)}
        ${row('Hospital Number', p.hospitalNumber)}
        ${row('Phone', p.phone)}
        ${row('Referring Doctor', p.referringDoctor)}
        ${row('Procedure', MLABELS[rec.modality] || rec.modality)}
        ${row('Body Part / Region', rec.bodyPart)}
        ${row('Language', rec.language)}
        ${row('Consent Mode', rec.consentMode)}
        ${row('Record Created', fmtDt(rec.createdAt))}
        ${row('Record Closed', fmtDt(rec.closedAt))}
      </table>

      ${scrSection ? `<h2>Mammography Screening</h2>${scrSection}` : ''}
      ${flagSection ? `<h2>Safety Screening</h2>${flagSection}` : ''}
      ${rvSection ? `<h2>Radiologist Review</h2>${rvSection}` : ''}

      <h2>Stage 1 — Consent Declaration</h2>
      <table>
        ${row('Patient Name (printed)', p.name)}
        ${row('Witness', s1.witnessName)}
        ${row('Consent Version', s1.consentVersion)}
        ${row('Signed At', fmtDt(s1.completedAt))}
      </table>
      <div style="margin-top:8px;font-size:9.5pt;color:#475569;font-weight:600">Patient Signature</div>
      ${sigHtml}

      <h2>Stage 2 — Radiographer Report</h2>
      <table>
        ${row('Radiographer', s2.performedByName)}
        ${row('Procedure completed as planned', s2.completedAsPlanned)}
        ${row('Complications', s2.complications || '—')}
        ${s2.procedureNotes ? row('Procedure Notes', s2.procedureNotes) : ''}
        ${row('Radiographer Signature', (s2.radiographerSignature || '') + (s2.radiographerSignatureImage ? `<br><img src="\${s2.radiographerSignatureImage}" style="max-height:50px;max-width:200px;margin-top:6px;mix-blend-mode:multiply">` : ''))}
        ${row('Completed At', fmtDt(s2.completedAt))}
      </table>

      <h2>Stage 3 — Nurse Vitals</h2>
      <table>
        ${row('Nurse', s3.performedByName)}
        ${row('Blood Pressure', s3.vitals?.bp ? s3.vitals.bp + ' mmHg' : '—')}
        ${row('Pulse', s3.vitals?.pulse ? s3.vitals.pulse + ' bpm' : '—')}
        ${row('Patient Condition', s3.patientCondition)}
        ${row('Nurse Signature', (s3.nurseSignature || '') + (s3.nurseSignatureImage ? `<br><img src="\${s3.nurseSignatureImage}" style="max-height:50px;max-width:200px;margin-top:6px;mix-blend-mode:multiply">` : ''))}
        ${row('Completed At', fmtDt(s3.completedAt))}
      </table>

      <div class="footer">
        <span>RadConsent v1.0 — Legal Clinical Document</span>
        <span>Record: ${esc(rec.id)}</span>
      </div>
    </div>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>RadConsent-${rec.id}</title></head><body style="margin:0;padding:0">${contentHtml}</body></html>`);
  doc.close();
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 400);
}

function renderRecordDetail() {
  const id = state.pageData.id;

  // Load if needed
  if (!gState.recordDetailState.record && !gState.recordDetailState.loading) {
    gState.recordDetailState.loading = true;
    api('GET', `/consents/${id}`).then(data => {
      gState.recordDetailState.record = data;
      gState.recordDetailState.loading = false;
      if (state.page === 'record-detail') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.recordDetailState.loading = false;
      navigate('consents');
    });
  }

  const rec = gState.recordDetailState.record;
  const back = `<button class="btn btn-ghost btn-sm" onclick="navigate('consents')"
    style="margin-bottom:6px;margin-left:-6px">← Back to Records</button>`;

  if (!rec) {
    return `<div class="page-header"><div>${back}
      <div class="page-title">Record Detail</div></div></div>
      <div class="card"><div class="card-body"><div class="loading-state">
        <span class="spinner spinner-dark"></span>
        <span style="margin-left:10px;font-size:13px;color:var(--c-text-muted)">Loading record…</span>
      </div></div></div>`;
  }

  const tier = highestTier(rec.tierFlags);
  const t1 = rec.tierFlags?.tier1 || [];
  const t2 = rec.tierFlags?.tier2 || [];
  const t3 = rec.tierFlags?.tier3 || [];
  const role = state.user?.role || '';

  // ── Stage completion ────────────────────────────────────────
  const s1done = !!rec.stage1?.consentAcknowledged;
  const s2done = !!rec.stage2;
  const s3done = !!rec.stage3;
  const needsReview = rec.status === 'pending_review' || rec.status === 'flagged_tier1';
  const reviewDone = !!rec.radiologistReview?.decision;

  function stageIcon(done) {
    return done
      ? `<div style="width:28px;height:28px;border-radius:50%;background:var(--c-success-light);border:2px solid var(--c-success-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">${IC.check.replace('stroke="currentColor"', 'stroke="#16A34A" stroke-width="2.5"').replace(/<svg /, '<svg width="14" height="14" ')}</div>`
      : `<div style="width:28px;height:28px;border-radius:50%;background:var(--c-bg);border:2px solid var(--c-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--c-text-muted);font-size:11px;font-weight:600"></div>`;
  }

  function metaRow(label, value) {
    if (!value) return '';
    return `<div class="scr-meta-item"><div class="scr-meta-label">${label}</div><div class="scr-meta-value">${value}</div></div>`;
  }

  function pendingBanner(who, action, btn = '') {
    return `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--c-bg);border:1px dashed var(--c-border);border-radius:var(--radius-sm);font-size:12.5px;color:var(--c-text-sec)">
      ${IC.info.replace('stroke="currentColor"', 'stroke="var(--c-text-muted)"').replace(/<svg /, '<svg width="14" height="14" ')}
      <span>Waiting for: <strong>${esc(who)}</strong> — ${esc(action)}</span>
      ${btn ? `<div style="margin-left:auto;flex-shrink:0">${btn}</div>` : ''}
    </div>`;
  }

  // ── Stage timeline header ────────────────────────────────────
  const stages = [
    { num: '1', label: 'Consent Declaration', done: s1done },
    { num: '2', label: 'Radiographer Report', done: s2done },
    { num: '3', label: 'Nurse Vitals', done: s3done },
    ...(needsReview ? [{ num: '✓', label: 'Radiologist Review', done: reviewDone }] : []),
  ];
  const timeline = stages.map((st, i) => `
    <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
      ${i > 0 ? `<div style="height:2px;flex:1;background:${stages[i - 1].done ? 'var(--c-success)' : 'var(--c-border)'}"></div>` : ''}
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center">
        ${stageIcon(st.done)}
        <div style="font-size:10.5px;font-weight:600;color:${st.done ? 'var(--c-success)' : 'var(--c-text-muted)'};white-space:nowrap">${esc(st.label)}</div>
      </div>
    </div>`).join('');

  // ── Patient info ─────────────────────────────────────────────

  const pv = rec.patient?.vitals || {};
  const pb = rec.patient || {};
  const hasVitals = pb.urea || pb.creatinine || pv.bp || pv.pulse || pv.spo2 || pv.temperature || pv.weight;

  const patientCard = `
    <div class="card mb-4">
      <div class="card-header"><h3>${IC.users}&nbsp; Patient</h3></div>
      <div class="card-body">
        <div class="scr-meta-grid">
          ${metaRow('Full Name', esc(rec.patient?.name))}
          ${metaRow('Date of Birth', esc(rec.patient?.dob))}
          ${metaRow('Gender', esc(rec.patient?.gender))}
          ${metaRow('Phone', esc(rec.patient?.phone))}
          ${metaRow('Hospital Number', esc(rec.patient?.hospitalNumber))}
          ${metaRow('Referring Doctor', esc(rec.patient?.referringDoctor))}
        </div>
        
        ${hasVitals ? `
        <div class="divider" style="margin:20px 0"></div>
        <div class="section-label" style="margin-bottom:12px;font-size:12px;color:var(--c-text-muted)">Pre-Procedure Clinical Data</div>
        <div class="scr-meta-grid">
          ${pv.weight ? metaRow('Weight', pv.weight + ' kg') : ''}
          ${pb.urea ? metaRow('Urea', pb.urea + ' mmol/L') : ''}
          ${pb.creatinine ? metaRow('Creatinine', pb.creatinine + ' µmol/L') : ''}
          ${pv.bp ? metaRow('Blood Pressure', pv.bp + ' mmHg') : ''}
          ${pv.pulse ? metaRow('Heart Rate', pv.pulse + ' bpm') : ''}
          ${pv.spo2 ? metaRow('SpO2', pv.spo2 + ' %') : ''}
          ${pv.temperature ? metaRow('Temperature', pv.temperature + ' °C') : ''}
        </div>
        ` : ''}
      </div>
    </div>`;

  // ── Procedure card ───────────────────────────────────────────
  const tierBadgeDetail = tier
    ? `<span class="badge badge-${tier}">${tier === 'tier1' ? 'Tier 1' : tier === 'tier2' ? 'Tier 2' : 'Tier 3'}</span>`
    : `<span class="badge badge-green">No flags</span>`;

  const procedureCard = `
    <div class="card mb-4">
      <div class="card-header">
        <h3>${IC.medical}&nbsp; Procedure</h3>
        <span class="badge badge-${rec.status}">${esc(STATUS_LABELS[rec.status] || rec.status)}</span>
      </div>
      <div class="card-body">
        <div class="scr-meta-grid">
          ${metaRow('Modality', esc(MODALITY_LABELS[rec.modality] || rec.modality))}
          ${metaRow('Body Part', esc(rec.bodyPart))}
          ${metaRow('Language', (LANG_FLAG[rec.language] || '') + ' ' + esc(LANGUAGE_LABELS[rec.language] || rec.language))}
          ${metaRow('Consent Mode', esc(rec.consentMode))}
          ${metaRow('Created', fmtDateTime(rec.createdAt))}
          <div class="scr-meta-item"><div class="scr-meta-label">Highest Tier</div><div class="scr-meta-value">${tierBadgeDetail}</div></div>
        </div>
        ${(t1.length + t2.length + t3.length) > 0 ? `
        <div class="divider"></div>
        <div class="section-label">Safety Flags</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${t1.map(f => `<span class="badge badge-tier1">T1: ${esc(SCR_FLAG_LABELS[f] || f)}</span>`).join('')}
          ${t2.map(f => `<span class="badge badge-tier2">T2: ${esc(SCR_FLAG_LABELS[f] || f)}</span>`).join('')}
          ${t3.map(f => `<span class="badge badge-tier3">T3: ${esc(SCR_FLAG_LABELS[f] || f)}</span>`).join('')}
        </div>` : ''}
      </div>
    </div>`;

  // ── Stage 1 card ─────────────────────────────────────────────
  const s1 = rec.stage1;
  const isAwaitingSig = rec.status === 'awaiting_signature';
  const isPendingReview = rec.status === 'pending_review' || rec.status === 'flagged_tier1';
  const canSignNow = isAwaitingSig && (role === 'radiographer' || role === 'nurse' || role === 'admin');
  const signBtn = canSignNow
    ? `<button class="btn btn-primary btn-sm" onclick="navigateToSignConsent()">Sign Consent Now</button>`
    : '';

  let s1Body;
  if (s1done) {
    s1Body = `
      <div class="scr-meta-grid">
        ${metaRow('Patient Name (printed)', esc(s1.patientSignature))}
        ${metaRow('Signed', fmtDateTime(s1.completedAt))}
        ${metaRow('Witnessed By', esc(s1.witnessName))}
        ${metaRow('Consent Version', esc(s1.consentVersion))}
        ${metaRow('Screening Completed', s1.screeningCompletedAt ? fmtDateTime(s1.screeningCompletedAt) : null)}
        ${s1.patientSignatureImage ? `
        <div class="scr-meta-item" style="grid-column:1/-1">
          <div class="scr-meta-label">Drawn Signature</div>
          <img class="sig-img" src="${s1.patientSignatureImage}" alt="Patient signature" />
        </div>` : ''}
      </div>`;
  } else if (isAwaitingSig) {
    s1Body = `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:var(--radius-sm);font-size:12.5px;color:#15803D">
      ${IC.check.replace('stroke="currentColor"', 'stroke="#15803D"').replace(/<svg /, '<svg width="14" height="14" ')}
      <span><strong>Radiologist approved</strong> — patient may now sign the consent declaration.</span>
      ${signBtn ? `<div style="margin-left:auto;flex-shrink:0">${signBtn}</div>` : ''}
    </div>`;
  } else if (isPendingReview) {
    s1Body = pendingBanner('Radiologist', 'Safety flags detected — radiologist must review and approve before patient can sign');
  } else {
    s1Body = pendingBanner('Patient / Staff', 'Consent declaration signature required');
  }

  const stage1Card = `
    <div class="card mb-4">
      <div class="card-header">
        <h3 style="display:flex;align-items:center;gap:8px">${stageIcon(s1done)}&nbsp;Stage 1 — Consent Declaration</h3>
        ${s1done ? `<span class="badge badge-green">Complete</span>`
      : isAwaitingSig ? `<span class="badge badge-awaiting_signature">Approved — Awaiting Signature</span>`
        : isPendingReview ? `<span class="badge badge-pending_review">Awaiting Radiologist Review</span>`
          : `<span class="badge badge-gray">Pending</span>`}
      </div>
      <div class="card-body">${s1Body}</div>
    </div>`;

  // ── Stage 2 card ─────────────────────────────────────────────
  const s2 = rec.stage2;
  let stage2Card = '';
  if (s1done) {
    // Check if stage 2 is blocked (tier1 flag without radiologist sign-off)
    const blocked = rec.status === 'flagged_tier1' && !reviewDone;
    const s2Btn = (!s2done && !blocked && state.user?.role === 'radiographer')
      ? `<button class="btn btn-primary btn-sm" onclick="navigate('stage2-report',{id:'${rec.id}'})">File Report</button>`
      : '';
    stage2Card = `
      <div class="card mb-4">
        <div class="card-header">
          <h3 style="display:flex;align-items:center;gap:8px">${stageIcon(s2done)}&nbsp;Stage 2 — Radiographer Report</h3>
          ${s2done ? `<span class="badge badge-green">Complete</span>`
        : blocked ? `<span class="badge badge-flagged_tier1">Blocked — Awaiting Review</span>`
          : `<span class="badge badge-gray">Pending</span>`}
        </div>
        <div class="card-body">
          ${s2done ? `
            <div class="scr-meta-grid">
              ${metaRow('Performed By', esc(s2.performedByName))}
              ${metaRow('Completed', fmtDateTime(s2.completedAt))}
              ${metaRow('Contrast', s2.contrastAdministered ? `${esc(s2.contrastAgent || '—')} ${esc(s2.contrastVolume || '')}` : 'None')}
              ${metaRow('Complications', esc(s2.complications))}
              ${s2.radiographerSignatureImage ? `
              <div class="scr-meta-item" style="grid-column:1/-1">
                <div class="scr-meta-label">Radiographer Signature</div>
                <img class="sig-img" src="${s2.radiographerSignatureImage}" alt="Radiographer signature" />
              </div>` : ''}
            </div>
            ${s2.procedureNotes ? `<div class="divider"></div>
              <div class="section-label">Procedure Notes</div>
              <p style="font-size:13.5px;color:var(--c-text-sec);line-height:1.6">${esc(s2.procedureNotes)}</p>` : ''}
          ` : blocked
        ? pendingBanner('Radiologist', 'Radiologist sign-off required before procedure can proceed')
        : pendingBanner('Radiographer', 'File procedure report after scan is complete', s2Btn)}
        </div>
      </div>`;
  }

  // ── Radiologist review action button ─────────────────────────
  const reviewBtn = (needsReview && !reviewDone &&
    (state.user?.role === 'radiologist' || state.user?.role === 'admin'))
    ? `<button class="btn btn-warning btn-sm" onclick="navigate('rad-review',{id:'${rec.id}'})">Review &amp; Sign Off</button>`
    : '';

  // ── Stage 3 card ─────────────────────────────────────────────
  const s3 = rec.stage3;
  const s3Btn = (!s3done && s2done && state.user?.role === 'nurse')
    ? `<button class="btn btn-primary btn-sm" onclick="navigate('stage3-vitals',{id:'${rec.id}'})">Vitals Check</button>`
    : '';
  let stage3Card = '';
  if (s2done) {
    stage3Card = `
      <div class="card mb-4">
        <div class="card-header">
          <h3 style="display:flex;align-items:center;gap:8px">${stageIcon(s3done)}&nbsp;Stage 3 — Nurse Vitals Check</h3>
          ${s3done ? `<span class="badge badge-green">Complete</span>` : `<span class="badge badge-gray">Pending</span>`}
        </div>
        <div class="card-body">
          ${s3done ? `
            <div class="scr-meta-grid">
              ${metaRow('Performed By', esc(s3.performedByName))}
              ${metaRow('Completed', fmtDateTime(s3.completedAt))}
              ${s3.vitals?.bp ? metaRow('Blood Pressure', esc(s3.vitals.bp) + ' mmHg') : ''}
              ${s3.vitals?.pulse ? metaRow('Pulse', esc(s3.vitals.pulse) + ' bpm') : ''}
              ${s3.vitals?.spo2 ? metaRow('SpO₂', esc(s3.vitals.spo2) + '%') : ''}
              ${s3.vitals?.temperature ? metaRow('Temperature', esc(s3.vitals.temperature) + ' °C') : ''}
              ${s3.vitals?.rr ? metaRow('Resp. Rate', esc(s3.vitals.rr) + ' /min') : ''}
              ${s3.nurseSignatureImage ? `
              <div class="scr-meta-item" style="grid-column:1/-1">
                <div class="scr-meta-label">Nurse Signature</div>
                <img class="sig-img" src="${s3.nurseSignatureImage}" alt="Nurse signature" />
              </div>` : ''}
            </div>
            ${s3.patientCondition ? `<div class="divider"></div>
              <div class="section-label">Patient Condition</div>
              <p style="font-size:13.5px;color:var(--c-text-sec);line-height:1.6">${esc(s3.patientCondition)}</p>` : ''}
          ` : pendingBanner('Nurse', 'Post-procedure vitals check required', s3Btn)}
        </div>
      </div>`;
  }

  // ── Radiologist review card ───────────────────────────────────
  let reviewCard = '';
  if (needsReview) {
    const rv = rec.radiologistReview;
    reviewCard = `
      <div class="card mb-4">
        <div class="card-header">
          <h3 style="display:flex;align-items:center;gap:8px">${stageIcon(reviewDone)}&nbsp;Radiologist Review</h3>
          ${reviewDone
        ? `<span class="badge ${rv.decision === 'approved' ? 'badge-green' : rv.decision === 'declined' ? 'badge-red' : 'badge-amber'}">${esc(DECISION_LABELS[rv.decision] || rv.decision)}</span>`
        : `<span class="badge badge-${rec.status}">${esc(STATUS_LABELS[rec.status] || rec.status)}</span>`}
        </div>
        <div class="card-body">
          ${reviewDone ? `
            <div class="scr-meta-grid">
              ${metaRow('Reviewed By', esc(rv.reviewedByName))}
              ${metaRow('Decision', esc(DECISION_LABELS[rv.decision] || rv.decision))}
              ${metaRow('Reviewed', fmtDateTime(rv.reviewedAt))}
              ${rv.radiologistSignatureImage ? `
              <div class="scr-meta-item" style="grid-column:1/-1">
                <div class="scr-meta-label">Radiologist Signature</div>
                <img class="sig-img" src="${rv.radiologistSignatureImage}" alt="Radiologist signature" />
              </div>` : ''}
            </div>
            ${rv.notes ? `<div class="divider"></div>
              <div class="section-label">Notes</div>
              <p style="font-size:13.5px;color:var(--c-text-sec);line-height:1.6">${esc(rv.notes)}</p>` : ''}
          ` : pendingBanner('Radiologist', rec.status === 'flagged_tier1'
          ? 'Absolute contraindication identified — sign-off required before procedure can proceed'
          : 'Conditional risk factor identified — review and approve before procedure commences',
          reviewBtn)}
        </div>
      </div>`;
  }

  return `
    <div class="page-header">
      <div>
        ${back}
        <div class="page-title">${esc(rec.patient?.name || 'Patient')}</div>
        <div class="page-subtitle">${esc(MODALITY_LABELS[rec.modality] || rec.modality)} · <span style="font-family:monospace;font-size:11px">${esc(rec.id)}</span></div>
      </div>
      ${rec.status === 'closed' ? `
      <div style="display:flex;align-items:flex-end;padding-bottom:2px">
        <button class="btn btn-primary btn-sm" onclick="downloadPDF('${rec.id}')">
          ${IC.download}&nbsp; Download PDF
        </button>
      </div>` : ''}
    </div>

    <!-- Stage timeline -->
    <div class="card mb-4">
      <div class="card-body" style="padding:20px 24px">
        <div class="stage-bar-wrap">
          <div class="stage-bar" style="display:flex;align-items:flex-start;gap:0">${timeline}</div>
        </div>
      </div>
    </div>

    ${patientCard}
    ${procedureCard}
    ${stage1Card}
    ${stage2Card}
    ${stage3Card}
    ${reviewCard}`;
}

/* ═══════════════════════════════════════════════════════════════
   STAGE 2 — POST-PROCEDURE REPORT (RADIOGRAPHER)
═══════════════════════════════════════════════════════════════ */
function renderStage2Report() {
  const id = state.pageData.id;

  if (!gState.stage2State.record && !gState.stage2State.loading) {
    gState.stage2State.loading = true;
    api('GET', `/consents/${id}`).then(data => {
      gState.stage2State.record = data;
      gState.stage2State.loading = false;
      if (state.page === 'stage2-report') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.stage2State.loading = false;
      navigate('consents');
    });
  }

  const rec = gState.stage2State.record;
  const back = `<button class="btn btn-ghost btn-sm" onclick="navigate('consents')"
    style="margin-bottom:6px;margin-left:-6px">← Back to Records</button>`;

  if (!rec) return `
    <div class="page-header"><div>${back}<div class="page-title">File Procedure Report</div></div></div>
    <div class="card"><div class="card-body"><div class="loading-state">
      <span class="spinner spinner-dark"></span>
      <span style="margin-left:10px;font-size:13px;color:var(--c-text-muted)">Loading…</span>
    </div></div></div>`;

  const tier = highestTier(rec.tierFlags);
  const t1 = rec.tierFlags?.tier1 || [];
  const t2 = rec.tierFlags?.tier2 || [];
  const t3 = rec.tierFlags?.tier3 || [];
  const totalFlags = t1.length + t2.length + t3.length;

  const contextCard = `
    <div class="card mb-4">
      <div class="card-header"><h3>${IC.shield}&nbsp; Screening Summary</h3></div>
      <div class="card-body">
        <div class="scr-meta-grid mb-3">
          <div class="scr-meta-item"><div class="scr-meta-label">Patient</div><div class="scr-meta-value">${esc(rec.patient?.name)}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">Modality</div><div class="scr-meta-value">${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</div></div>
          ${rec.bodyPart ? `<div class="scr-meta-item"><div class="scr-meta-label">Body Part</div><div class="scr-meta-value">${esc(rec.bodyPart)}</div></div>` : ''}
          <div class="scr-meta-item"><div class="scr-meta-label">Safety Flags</div><div class="scr-meta-value">
            ${totalFlags === 0
      ? `<span class="badge badge-green">No flags</span>`
      : `${t1.length ? `<span class="badge badge-tier1 mr-1">T1: ${t1.length}</span>` : ''}${t2.length ? `<span class="badge badge-tier2 mr-1">T2: ${t2.length}</span>` : ''}${t3.length ? `<span class="badge badge-tier3">T3: ${t3.length}</span>` : ''}`}
          </div></div>
        </div>
        ${tier === 'tier1' ? `<div class="scr-alert scr-alert-tier1">${IC.warning}
          <div><div class="scr-alert-title">Tier 1 flag present</div>
          <div class="scr-alert-body">${t1.map(f => esc(SCR_FLAG_LABELS[f] || f)).join('; ')}</div></div></div>` : ''}
        ${tier === 'tier2' ? `<div class="scr-alert scr-alert-tier2">${IC.warning}
          <div><div class="scr-alert-title">Tier 2 flag present</div>
          <div class="scr-alert-body">${t2.map(f => esc(SCR_FLAG_LABELS[f] || f)).join('; ')}</div></div></div>` : ''}
      </div>
    </div>`;

  return `
    <div class="page-header">
      <div>
        ${back}
        <div class="page-title">Post-Procedure Report</div>
        <div class="page-subtitle">${esc(rec.patient?.name)} · ${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</div>
      </div>
    </div>

    ${contextCard}

    <div class="card">
      <div class="card-header"><h3>${IC.clipboard}&nbsp; Stage 2 — Radiographer Report</h3></div>
      <div class="card-body">

        <!-- Completion status -->
        <div class="mb-4">
          <div class="form-label">Was the procedure completed as planned? <span class="req">*</span></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
            ${[['yes', 'Yes — completed as planned'], ['partial', 'Partial — partially completed'], ['no', 'No — procedure not completed']].map(([v, l], i) => `
            <label style="display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--c-border);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;font-weight:500">
              <input type="radio" name="s2-completed" value="${v}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--c-accent)">
              ${esc(l)}
            </label>`).join('')}
          </div>
        </div>

        <!-- Procedure notes -->
        <div class="mb-4">
          <label class="form-label" for="s2-notes">Procedure Report <span class="req">*</span></label>
          <textarea class="form-control" id="s2-notes" rows="5"
            placeholder="Describe what was performed, any deviations from the planned procedure, and any intra-procedure observations."
            oninput="stage2CheckSubmit()" style="min-height:120px"></textarea>
        </div>

        <!-- Complications -->
        <div class="mb-4">
          <div class="form-label">Any complications or adverse events? <span class="req">*</span></div>
          <div style="display:flex;gap:16px;margin-top:8px">
            <label style="display:flex;align-items:center;gap:7px;font-size:13.5px;cursor:pointer">
              <input type="radio" name="s2-complications" value="no" checked
                onchange="stage2ToggleComplications(false)" style="accent-color:var(--c-accent)">
              No — none observed
            </label>
            <label style="display:flex;align-items:center;gap:7px;font-size:13.5px;cursor:pointer">
              <input type="radio" name="s2-complications" value="yes"
                onchange="stage2ToggleComplications(true)" style="accent-color:var(--c-accent)">
              Yes — describe below
            </label>
          </div>
          <div id="s2-complications-details" style="display:none;margin-top:10px">
            <textarea class="form-control" id="s2-complication-text" rows="3"
              placeholder="Describe the complication or adverse event and action taken."></textarea>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Radiographer signature -->
        <div class="form-row">
          <div>
            <label class="form-label" for="s2-performer">Radiographer Name</label>
            <input class="form-control" type="text" id="s2-performer"
              value="${esc(state.user?.name || '')}" readonly
              style="background:var(--c-bg);color:var(--c-text-sec);cursor:default;margin-bottom:12px" />
          </div>
          <div></div>
        </div>
        <div class="form-label">Radiographer Signature <span class="req">*</span></div>
        <div class="sig-mode-tabs">
          <button id="s2-sig-tab-draw"   type="button" class="sig-mode-tab${gState.s2SigMode === 'draw' ? ' sig-tab-active' : ''}" onclick="s2SigSwitchMode('draw')">&#9998; Draw</button>
          <button id="s2-sig-tab-upload" type="button" class="sig-mode-tab${gState.s2SigMode === 'upload' ? ' sig-tab-active' : ''}" onclick="s2SigSwitchMode('upload')">&#8593; Upload image</button>
          <button id="s2-sig-tab-topaz"  type="button" class="sig-mode-tab${gState.s2SigMode === 'topaz' ? ' sig-tab-active' : ''}" onclick="s2SigSwitchMode('topaz')">&#128394; Topaz Pad</button>
        </div>
        <!-- Draw pane -->
        <div id="s2-sig-draw-pane"${gState.s2SigMode !== 'draw' ? ' style="display:none"' : ''}>
          <div class="sig-pad-wrap${gState.s2SigPadInstance && !gState.s2SigPadInstance?.isEmpty() ? ' sig-pad-filled' : ''}">
            <canvas id="s2-sigpad"></canvas>
            <div class="sig-pad-toolbar">
              <span class="sig-pad-hint">Sign using mouse, finger or stylus</span>
              <button type="button" class="btn btn-ghost btn-sm" onclick="s2SigClear()">Clear</button>
            </div>
          </div>
        </div>
        <!-- Upload pane -->
        <div id="s2-sig-upload-pane"${gState.s2SigMode !== 'upload' ? ' style="display:none"' : ''}>
          <label class="sig-upload-area" for="s2-sig-upload-input">
            <span style="font-size:22px">&#8593;</span>
            <span>Click to select a signature image</span>
            <span style="font-size:11px">JPG, PNG or GIF accepted</span>
          </label>
          <input type="file" id="s2-sig-upload-input" accept="image/*" style="display:none" onchange="s2SigHandleUpload(this)" />
          ${gState.s2SigUploadedDataUrl ? `<img id="s2-sig-upload-preview" class="sig-img" src="${gState.s2SigUploadedDataUrl}" alt="Uploaded signature" />` : `<img id="s2-sig-upload-preview" class="sig-img" style="display:none" alt="Uploaded signature" />`}
        </div>
        <!-- Topaz pane -->
        <div id="s2-sig-topaz-pane" class="sig-topaz-pane"${gState.s2SigMode !== 'topaz' ? ' style="display:none"' : ''}>
          <div class="sig-topaz-status">
            <span id="s2-sig-topaz-dot" class="sig-topaz-dot${gState.s2SigTopazStatus === 'capturing' ? ' dot-capturing' : gState.s2SigTopazStatus === 'captured' ? ' dot-captured' : gState.s2SigTopazStatus === 'error' ? ' dot-error' : ''}"></span>
            <span id="s2-sig-topaz-text">${gState.s2SigTopazStatus === 'capturing' ? 'Sign on the Topaz pad now\u2026' : gState.s2SigTopazStatus === 'captured' ? 'Signature captured successfully.' : gState.s2SigTopazStatus === 'error' ? 'SigPlusExtLite extension not detected. Install it in Chrome and reload.' : 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.'}</span>
          </div>
          <div class="sig-topaz-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="s2SigTopazSign()"${gState.s2SigTopazStatus === 'capturing' ? ' disabled' : ''}>Sign on Pad</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="s2SigTopazClear()"${gState.s2SigTopazStatus !== 'captured' ? ' disabled' : ''}>Clear</button>
          </div>
          ${gState.s2SigTopazPreviewUrl ? `<img id="s2-sig-topaz-preview" class="sig-img" src="${gState.s2SigTopazPreviewUrl}" alt="Radiographer signature" />` : `<img id="s2-sig-topaz-preview" class="sig-img" style="display:none" alt="Radiographer signature" />`}
          <div class="form-hint" style="margin-top:4px">Requires the <a href="https://chrome.google.com/webstore/detail/sigplusextlite/gjaebefdmgmhgheehpjpeclhplpkdpbi" target="_blank" rel="noopener">SigPlusExtLite Chrome extension</a> and the Topaz L460 pad connected via USB.</div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-ghost btn-sm" onclick="navigate('consents')">Cancel</button>
        <button id="s2-submit-btn" class="btn btn-primary" onclick="stage2Submit()" disabled>
          Submit Report &amp; Sign Stage 2
        </button>
      </div>
    </div>`;
}

function stage2ToggleComplications(show) {
  const el = document.getElementById('s2-complications-details');
  if (el) el.style.display = show ? '' : 'none';
}

function stage2CheckSubmit() {
  const notes = (document.getElementById('s2-notes')?.value || '').trim();
  const sigOk = gState.s2SigMode === 'upload' ? !!s2SigUploadedDataUrl
    : gState.s2SigMode === 'topaz' ? !!s2SigTopazPreviewUrl
      : (gState.s2SigPadInstance && !gState.s2SigPadInstance.isEmpty());
  const btn = document.getElementById('s2-submit-btn');
  if (btn) btn.disabled = !(notes && sigOk);
}

async function stage2Submit() {
  const completedAsPlanned = document.querySelector('[name="s2-completed"]:checked')?.value || 'yes';
  const procedureNotes = (document.getElementById('s2-notes')?.value || '').trim();
  const hasComplications = document.querySelector('[name="s2-complications"]:checked')?.value === 'yes';
  const complicationDetails = (document.getElementById('s2-complication-text')?.value || '').trim();
  let radiographerSignatureImage = null;
  if (gState.s2SigMode === 'upload') {
    if (!gState.s2SigUploadedDataUrl) { toast('Please upload a signature image.', 'warning'); return; }
    radiographerSignatureImage = gState.s2SigUploadedDataUrl;
  } else if (gState.s2SigMode === 'topaz') {
    if (!gState.s2SigTopazPreviewUrl) { toast('Please capture a signature on the Topaz pad.', 'warning'); return; }
    radiographerSignatureImage = gState.s2SigTopazPreviewUrl;
  } else {
    if (!gState.s2SigPadInstance || gState.s2SigPadInstance.isEmpty()) { toast('Please draw your signature.', 'warning'); return; }
    radiographerSignatureImage = gState.s2SigPadInstance.toDataURL('image/png');
  }

  if (!procedureNotes) { toast('Procedure report is required.', 'warning'); return; }

  if (!gState.stage2State.record?.id) { toast('Session error — please reload the page.', 'error'); return; }

  const btn = document.getElementById('s2-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>&nbsp;Submitting…`; }

  try {
    await api('PUT', `/consents/${gState.stage2State.record.id}/stage2`, {
      completedAsPlanned,
      procedureNotes,
      hasComplications,
      complicationDetails: hasComplications ? complicationDetails : null,
      radiographerSignature: state.user?.name || '',
      radiographerSignatureImage,
    });
    toast('Stage 2 report filed.', 'success');
    gState.stage2State.record = null;
    navigate('consents');
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Report & Sign Stage 2'; }
  }
}

/* ═══════════════════════════════════════════════════════════════
   STAGE 3 — POST-PROCEDURE VITALS CHECK (NURSE)
═══════════════════════════════════════════════════════════════ */
function renderStage3Vitals() {
  const id = state.pageData.id;

  if (!gState.stage3State.record && !gState.stage3State.loading) {
    gState.stage3State.loading = true;
    api('GET', `/consents/${id}`).then(data => {
      gState.stage3State.record = data;
      gState.stage3State.loading = false;
      if (state.page === 'stage3-vitals') render();
    }).catch(err => {
      toast(err.message, 'error');
      gState.stage3State.loading = false;
      navigate('consents');
    });
  }

  const rec = gState.stage3State.record;
  const back = `<button class="btn btn-ghost btn-sm" onclick="navigate('consents')"
    style="margin-bottom:6px;margin-left:-6px">← Back to Records</button>`;

  if (!rec) return `
    <div class="page-header"><div>${back}<div class="page-title">Vitals Check</div></div></div>
    <div class="card"><div class="card-body"><div class="loading-state">
      <span class="spinner spinner-dark"></span>
      <span style="margin-left:10px;font-size:13px;color:var(--c-text-muted)">Loading…</span>
    </div></div></div>`;

  // ── Confirmation screen ──────────────────────────────────────
  if (gState.stage3State.confirmed && gState.stage3State.confirmedRecord) {
    const r = gState.stage3State.confirmedRecord;
    const ts = (label, iso) => iso
      ? `<div style="display:contents"><span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px">${label}</span><span style="font-size:13px;font-weight:500">${fmtDateTime(iso)}</span></div>`
      : '';
    return `
      <div class="page-header"><div>
        <div class="page-title">Vitals Check</div>
        <div class="page-subtitle">${esc(r.patient?.name)} · ${esc(MODALITY_LABELS[r.modality] || r.modality)}</div>
      </div></div>
      <div class="card">
        <div class="card-body" style="text-align:center;padding:52px 32px">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--c-success-light);border:2px solid var(--c-success-border);display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
            ${IC.check.replace('stroke="currentColor"', 'stroke="#16A34A" stroke-width="2.5"').replace(/<svg /, '<svg width="28" height="28" ')}
          </div>
          <div style="font-size:19px;font-weight:700;color:var(--c-text);margin-bottom:6px">Record Closed</div>
          <div style="font-size:13.5px;color:var(--c-text-sec);margin-bottom:28px">All three stages are complete. The consent record has been closed.</div>
          <div style="display:inline-grid;grid-template-columns:auto auto;gap:8px 28px;text-align:left;background:var(--c-bg);border:1px solid var(--c-border);border-radius:var(--radius);padding:18px 24px;margin-bottom:32px;min-width:340px">
            <span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px">Patient</span>
            <span style="font-size:13px;font-weight:600">${esc(r.patient?.name)}</span>
            ${ts('Stage 1 — Consent', r.stage1?.completedAt)}
            ${ts('Stage 2 — Radiographer', r.stage2?.completedAt)}
            ${ts('Stage 3 — Nurse Vitals', r.stage3?.completedAt)}
            <span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px">Status</span>
            <span class="badge badge-closed">Closed</span>
          </div>
          <button class="btn btn-primary btn-lg" onclick="navigate('dashboard')">Return to Dashboard</button>
        </div>
      </div>`;
  }

  // ── Stage not ready guard ────────────────────────────────────
  if (rec.status !== 'draft_stage2') {
    const statusMsg = {
      in_progress: 'Patient has not yet signed the consent declaration.',
      awaiting_signature: 'Radiologist approved — waiting for patient to sign consent before Stage 2 can proceed.',
      draft_stage1: 'The Radiographer has not yet filed their Stage 2 report.',
      pending_review: 'This record is awaiting radiologist review before the patient can sign.',
      flagged_tier1: 'This record has a Tier 1 flag and is awaiting radiologist review.',
      declined: 'This record was declined by the radiologist.',
      closed: 'This record is already closed.',
    }[rec.status] || `Current status: ${rec.status}`;
    return `
      <div class="page-header"><div>${back}<div class="page-title">Vitals Check</div>
        <div class="page-subtitle">${esc(rec.patient?.name)} · ${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</div>
      </div></div>
      <div class="card"><div class="card-body" style="text-align:center;padding:48px 32px">
        <div style="font-size:32px;margin-bottom:12px">⏳</div>
        <div style="font-size:17px;font-weight:600;margin-bottom:8px">Stage 3 Not Yet Available</div>
        <div style="font-size:13.5px;color:var(--c-text-sec);max-width:420px;margin:0 auto 24px">${statusMsg}</div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('consents')">← Back to Records</button>
      </div></div>`;
  }

  // ── Stage 2 context (read-only) ─────────────────────────────
  const s2 = rec.stage2;
  const contextCard = `
    <div class="card mb-4">
      <div class="card-header"><h3>${IC.clipboard}&nbsp; Stage 2 Report (Read-Only)</h3></div>
      <div class="card-body">
        <div class="scr-meta-grid mb-3">
          <div class="scr-meta-item"><div class="scr-meta-label">Patient</div><div class="scr-meta-value">${esc(rec.patient?.name)}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">Modality</div><div class="scr-meta-value">${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">Performed By</div><div class="scr-meta-value">${esc(s2?.performedByName || '—')}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">Completed</div><div class="scr-meta-value">${fmtDateTime(s2?.completedAt)}</div></div>
          <div class="scr-meta-item" style="grid-column:1/-1">
            <div class="scr-meta-label">Complications</div>
            <div class="scr-meta-value">${esc(s2?.complications || '—')}</div>
          </div>
        </div>
        ${s2?.procedureNotes ? `<div class="divider"></div>
          <div class="section-label">Procedure Notes</div>
          <div style="background:var(--c-bg);border:1px solid var(--c-border);border-radius:var(--radius-sm);padding:14px;font-size:13px;color:var(--c-text-sec);line-height:1.6">${esc(s2.procedureNotes)}</div>` : ''}
      </div>
    </div>`;

  return `
    <div class="page-header">
      <div>
        ${back}
        <div class="page-title">Post-Procedure Vitals Check</div>
        <div class="page-subtitle">${esc(rec.patient?.name)} · ${esc(MODALITY_LABELS[rec.modality] || rec.modality)}</div>
      </div>
    </div>

    ${contextCard}

    <div class="card">
      <div class="card-header"><h3>${IC.medical}&nbsp; Stage 3 — Nurse Vitals</h3></div>
      <div class="card-body">

        <!-- Blood pressure + pulse -->
        <div class="mb-4">
          <div class="form-label">Observations</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;align-items:flex-end">
            <div>
              <div style="font-size:11px;color:var(--c-text-muted);margin-bottom:4px">Systolic (mmHg)</div>
              <input class="form-control" type="number" id="s3-bp-sys" min="50" max="300"
                placeholder="e.g. 120" style="width:110px" />
            </div>
            <div style="padding-bottom:8px;color:var(--c-text-muted);font-size:18px;font-weight:300">/</div>
            <div>
              <div style="font-size:11px;color:var(--c-text-muted);margin-bottom:4px">Diastolic (mmHg)</div>
              <input class="form-control" type="number" id="s3-bp-dia" min="30" max="200"
                placeholder="e.g. 80" style="width:110px" />
            </div>
            <div style="width:1px;height:36px;background:var(--c-border);margin:0 4px;align-self:flex-end"></div>
            <div>
              <div style="font-size:11px;color:var(--c-text-muted);margin-bottom:4px">Pulse (bpm)</div>
              <input class="form-control" type="number" id="s3-pulse" min="20" max="300"
                placeholder="e.g. 72" style="width:110px" />
            </div>
          </div>
        </div>

        <!-- General condition -->
        <div class="mb-4">
          <div class="form-label">General Condition <span class="req">*</span></div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            ${[
      ['stable', '✅', 'Stable', 'Patient discharged in good condition', 'var(--c-success-light)', 'var(--c-success-border)', 'var(--c-success)'],
      ['monitoring', '⚠️', 'Requires Monitoring', 'Patient to be observed before discharge', 'var(--c-warning-light)', 'var(--c-warning-border)', 'var(--c-warning)'],
      ['referred', '🚨', 'Referred for Further Care', 'Patient referred or admitted for additional care', 'var(--c-danger-light)', 'var(--c-danger-border)', 'var(--c-danger)'],
    ].map(([v, emoji, label, desc, bg, border, textColor]) => `
            <label style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border:1px solid ${border};border-radius:var(--radius);background:${bg};cursor:pointer">
              <input type="radio" name="s3-condition" value="${v}" ${v === 'stable' ? 'checked' : ''}
                style="accent-color:var(--c-accent);margin-top:3px;flex-shrink:0">
              <div style="color:${textColor}">
                <div style="font-size:14px;font-weight:600">${emoji}&nbsp; ${esc(label)}</div>
                <div style="font-size:12px;margin-top:2px;opacity:0.9">${esc(desc)}</div>
              </div>
            </label>`).join('')}
          </div>
        </div>

        <!-- Additional notes -->
        <div class="mb-4">
          <label class="form-label" for="s3-notes">Additional Notes <span style="font-weight:400;color:var(--c-text-muted)">(optional)</span></label>
          <textarea class="form-control" id="s3-notes" rows="3"
            placeholder="Any additional observations, instructions given to the patient, or follow-up actions."></textarea>
        </div>

        <div class="divider"></div>

        <!-- Nurse signature -->
        <div class="mb-4">
          <label class="form-label" for="s3-performer">Nurse Name</label>
          <input class="form-control" type="text" id="s3-performer"
            value="${esc(state.user?.name || '')}" readonly
            style="background:var(--c-bg);color:var(--c-text-sec);cursor:default;max-width:320px" />
        </div>
        <div class="mb-4">
          <div class="form-label">Nurse Signature <span class="req">*</span></div>
          <div class="sig-mode-tabs">
            <button id="s3-sig-tab-draw"   type="button" class="sig-mode-tab${gState.s3SigMode === 'draw' ? ' sig-tab-active' : ''}" onclick="s3SigSwitchMode('draw')">&#9998; Draw</button>
            <button id="s3-sig-tab-upload" type="button" class="sig-mode-tab${gState.s3SigMode === 'upload' ? ' sig-tab-active' : ''}" onclick="s3SigSwitchMode('upload')">&#8593; Upload image</button>
            <button id="s3-sig-tab-topaz"  type="button" class="sig-mode-tab${gState.s3SigMode === 'topaz' ? ' sig-tab-active' : ''}" onclick="s3SigSwitchMode('topaz')">&#128394; Topaz Pad</button>
          </div>
          <!-- Draw pane -->
          <div id="s3-sig-draw-pane"${gState.s3SigMode !== 'draw' ? ' style="display:none"' : ''}>
            <div class="sig-pad-wrap${gState.s3SigPadInstance && !gState.s3SigPadInstance?.isEmpty() ? ' sig-pad-filled' : ''}">
              <canvas id="s3-sigpad"></canvas>
              <div class="sig-pad-toolbar">
                <span class="sig-pad-hint">Sign using mouse, finger or stylus</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="s3SigClear()">Clear</button>
              </div>
            </div>
          </div>
          <!-- Upload pane -->
          <div id="s3-sig-upload-pane"${gState.s3SigMode !== 'upload' ? ' style="display:none"' : ''}>
            <label class="sig-upload-area" for="s3-sig-upload-input">
              <span style="font-size:22px">&#8593;</span>
              <span>Click to select a signature image</span>
              <span style="font-size:11px">JPG, PNG or GIF accepted</span>
            </label>
            <input type="file" id="s3-sig-upload-input" accept="image/*" style="display:none" onchange="s3SigHandleUpload(this)" />
            ${gState.s3SigUploadedDataUrl ? `<img id="s3-sig-upload-preview" class="sig-img" src="${gState.s3SigUploadedDataUrl}" alt="Uploaded signature" />` : `<img id="s3-sig-upload-preview" class="sig-img" style="display:none" alt="Uploaded signature" />`}
          </div>
          <!-- Topaz pane -->
          <div id="s3-sig-topaz-pane" class="sig-topaz-pane"${gState.s3SigMode !== 'topaz' ? ' style="display:none"' : ''}>
            <div class="sig-topaz-status">
              <span id="s3-sig-topaz-dot" class="sig-topaz-dot${gState.s3SigTopazStatus === 'capturing' ? ' dot-capturing' : gState.s3SigTopazStatus === 'captured' ? ' dot-captured' : gState.s3SigTopazStatus === 'error' ? ' dot-error' : ''}"></span>
              <span id="s3-sig-topaz-text">${gState.s3SigTopazStatus === 'capturing' ? 'Sign on the Topaz pad now\u2026' : gState.s3SigTopazStatus === 'captured' ? 'Signature captured successfully.' : gState.s3SigTopazStatus === 'error' ? 'SigPlusExtLite extension not detected. Install it in Chrome and reload.' : 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.'}</span>
            </div>
            <div class="sig-topaz-actions">
              <button type="button" class="btn btn-primary btn-sm" onclick="s3SigTopazSign()"${gState.s3SigTopazStatus === 'capturing' ? ' disabled' : ''}>Sign on Pad</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="s3SigTopazClear()"${gState.s3SigTopazStatus !== 'captured' ? ' disabled' : ''}>Clear</button>
            </div>
            ${gState.s3SigTopazPreviewUrl ? `<img id="s3-sig-topaz-preview" class="sig-img" src="${gState.s3SigTopazPreviewUrl}" alt="Nurse signature" />` : `<img id="s3-sig-topaz-preview" class="sig-img" style="display:none" alt="Nurse signature" />`}
            <div class="form-hint" style="margin-top:4px">Requires the <a href="https://chrome.google.com/webstore/detail/sigplusextlite/gjaebefdmgmhgheehpjpeclhplpkdpbi" target="_blank" rel="noopener">SigPlusExtLite Chrome extension</a> and the Topaz L460 pad connected via USB.</div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-ghost btn-sm" onclick="navigate('consents')">Cancel</button>
        <button id="s3-submit-btn" class="btn btn-primary" onclick="stage3Submit()" disabled>
          Submit Vitals &amp; Close Record
        </button>
      </div>
    </div>`;
}

// ── Stage-3 signature helpers ─────────────────────────────────────────────────
function s3SigSwitchMode(mode) {
  gState.s3SigMode = mode;
  document.getElementById('s3-sig-draw-pane')?.style.setProperty('display', mode === 'draw' ? '' : 'none');
  document.getElementById('s3-sig-upload-pane')?.style.setProperty('display', mode === 'upload' ? '' : 'none');
  document.getElementById('s3-sig-topaz-pane')?.style.setProperty('display', mode === 'topaz' ? '' : 'none');
  document.getElementById('s3-sig-tab-draw')?.classList.toggle('sig-tab-active', mode === 'draw');
  document.getElementById('s3-sig-tab-upload')?.classList.toggle('sig-tab-active', mode === 'upload');
  document.getElementById('s3-sig-tab-topaz')?.classList.toggle('sig-tab-active', mode === 'topaz');
  if (mode === 'draw') s3InitSigPad();
  if (mode === 'topaz') s3SigLoadTopaz();
  stage3CheckSubmit();
}

function s3InitSigPad() {
  const canvas = document.getElementById('s3-sigpad');
  if (!canvas || typeof SignaturePad === 'undefined') return;
  if (gState.s3SigPadInstance) gState.s3SigPadInstance.off();
  // Ensure critical styles are applied inline (Vite CSS may load async)
  canvas.style.touchAction = 'none';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.cursor = 'crosshair';
  if (!canvas.style.height) canvas.style.height = '160px';
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = (canvas.offsetWidth || 600) * ratio;
  canvas.height = (canvas.offsetHeight || 160) * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  gState.s3SigPadInstance = new SignaturePad(canvas, { penColor: '#0F172A', backgroundColor: '#ffffff', minWidth: 0.5, maxWidth: 2.5 });
  gState.s3SigPadInstance.addEventListener('endStroke', () => {
    canvas.closest('.sig-pad-wrap')?.classList.add('sig-pad-filled');
    stage3CheckSubmit();
  });
}

function s3SigClear() {
  gState.s3SigPadInstance?.clear();
  document.getElementById('s3-sigpad')?.closest('.sig-pad-wrap')?.classList.remove('sig-pad-filled');
  stage3CheckSubmit();
}

function s3SigHandleUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    gState.s3SigUploadedDataUrl = e.target.result;
    const preview = document.getElementById('s3-sig-upload-preview');
    if (preview) { preview.src = gState.s3SigUploadedDataUrl; preview.style.display = 'block'; }
    stage3CheckSubmit();
  };
  reader.readAsDataURL(file);
}

function s3SigLoadTopaz() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    s3SigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  s3SigTopazRenderStatus('idle', 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.');
}

function s3SigTopazRenderStatus(status, msg) {
  gState.s3SigTopazStatus = status;
  const el = document.getElementById('s3-sig-topaz-text');
  const dot = document.getElementById('s3-sig-topaz-dot');
  if (el) el.textContent = msg;
  if (dot) {
    dot.className = 'sig-topaz-dot';
    if (status === 'capturing') dot.classList.add('dot-capturing');
    if (status === 'captured') dot.classList.add('dot-captured');
    if (status === 'error') dot.classList.add('dot-error');
  }
}

function s3SigTopazSign() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    s3SigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  s3SigTopazRenderStatus('capturing', 'Sign on the Topaz pad now\u2026');
  const msgEl = document.createElement('MyExtensionDataElement');
  msgEl.setAttribute('messageAttribute', JSON.stringify({
    firstName: '', lastName: '', eMail: '', location: '',
    imageFormat: 1, imageX: 500, imageY: 100,
    imageTransparency: false, imageScaling: false,
    maxUpScalePercent: 0.0, rawDataFormat: 'ENC', minSigPoints: 25
  }));
  document.documentElement.appendChild(msgEl);
  top.document.addEventListener('SignResponse', function handler(e) {
    top.document.removeEventListener('SignResponse', handler);
    msgEl.remove();
    const obj = JSON.parse(e.target.getAttribute('msgAttribute') || '{}');
    if (!obj.isSigned) {
      s3SigTopazRenderStatus('idle', 'Signature cancelled \u2014 click \u201cSign on Pad\u201d to try again.');
      return;
    }
    gState.s3SigTopazPreviewUrl = 'data:image/png;base64,' + obj.imageData;
    const preview = document.getElementById('s3-sig-topaz-preview');
    if (preview) { preview.src = gState.s3SigTopazPreviewUrl; preview.style.display = 'block'; }
    s3SigTopazRenderStatus('captured', 'Signature captured successfully.');
    stage3CheckSubmit();
  }, false);
  const evt = document.createEvent('Events');
  evt.initEvent('SignStartEvent', true, false);
  msgEl.dispatchEvent(evt);
}

function s3SigTopazClear() {
  gState.s3SigTopazPreviewUrl = null;
  const preview = document.getElementById('s3-sig-topaz-preview');
  if (preview) preview.style.display = 'none';
  s3SigTopazRenderStatus('idle', 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.');
  stage3CheckSubmit();
}

function stage3CheckSubmit() {
  const sigOk = gState.s3SigMode === 'upload' ? !!s3SigUploadedDataUrl
    : gState.s3SigMode === 'topaz' ? !!s3SigTopazPreviewUrl
      : (gState.s3SigPadInstance && !gState.s3SigPadInstance.isEmpty());
  const btn = document.getElementById('s3-submit-btn');
  if (btn) btn.disabled = !sigOk;
}

async function stage3Submit() {
  const condition = document.querySelector('[name="s3-condition"]:checked')?.value;
  const notes = (document.getElementById('s3-notes')?.value || '').trim();
  const bpSys = document.getElementById('s3-bp-sys')?.value;
  const bpDia = document.getElementById('s3-bp-dia')?.value;
  const pulse = document.getElementById('s3-pulse')?.value;

  let nurseSignatureImage = null;
  if (gState.s3SigMode === 'upload') {
    if (!gState.s3SigUploadedDataUrl) { toast('Please upload a signature image.', 'warning'); return; }
    nurseSignatureImage = gState.s3SigUploadedDataUrl;
  } else if (gState.s3SigMode === 'topaz') {
    if (!gState.s3SigTopazPreviewUrl) { toast('Please capture a signature on the Topaz pad.', 'warning'); return; }
    nurseSignatureImage = gState.s3SigTopazPreviewUrl;
  } else {
    if (!gState.s3SigPadInstance || gState.s3SigPadInstance.isEmpty()) { toast('Please draw your signature.', 'warning'); return; }
    nurseSignatureImage = gState.s3SigPadInstance.toDataURL('image/png');
  }

  if (!condition) { toast('Please select a patient condition.', 'warning'); return; }

  if (!gState.stage3State.record?.id) { toast('Session error — please reload the page.', 'error'); return; }

  const btn = document.getElementById('s3-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>&nbsp;Submitting…`; }

  const nurseName = (document.getElementById('s3-performer')?.value || '').trim() || state.user?.name || '';

  try {
    const result = await api('PUT', `/consents/${gState.stage3State.record.id}/stage3`, {
      bloodPressureSystolic: bpSys ? Number(bpSys) : null,
      bloodPressureDiastolic: bpDia ? Number(bpDia) : null,
      pulse: pulse ? Number(pulse) : null,
      condition,
      notes: notes || null,
      nurseSignature: nurseName,
      nurseSignatureImage,
    });
    if (!result) return;
    gState.stage3State.confirmed = true;
    gState.stage3State.confirmedRecord = result;
    render();
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Vitals & Close Record'; }
  }
}

/* ═══════════════════════════════════════════════════════════════
   STAGE 2 & RAD REVIEW — SIGNATURE HELPERS
═══════════════════════════════════════════════════════════════ */
// ── Stage-2 signature helpers ─────────────────────────────────────────────────
function s2SigSwitchMode(mode) {
  gState.s2SigMode = mode;
  document.getElementById('s2-sig-draw-pane')?.style.setProperty('display', mode === 'draw' ? '' : 'none');
  document.getElementById('s2-sig-upload-pane')?.style.setProperty('display', mode === 'upload' ? '' : 'none');
  document.getElementById('s2-sig-topaz-pane')?.style.setProperty('display', mode === 'topaz' ? '' : 'none');
  document.getElementById('s2-sig-tab-draw')?.classList.toggle('sig-tab-active', mode === 'draw');
  document.getElementById('s2-sig-tab-upload')?.classList.toggle('sig-tab-active', mode === 'upload');
  document.getElementById('s2-sig-tab-topaz')?.classList.toggle('sig-tab-active', mode === 'topaz');
  if (mode === 'draw') s2InitSigPad();
  if (mode === 'topaz') s2SigLoadTopaz();
  stage2CheckSubmit();
}

function s2InitSigPad() {
  const canvas = document.getElementById('s2-sigpad');
  if (!canvas || typeof SignaturePad === 'undefined') return;
  if (gState.s2SigPadInstance) gState.s2SigPadInstance.off();
  // Ensure critical styles are applied inline (Vite CSS may load async)
  canvas.style.touchAction = 'none';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.cursor = 'crosshair';
  if (!canvas.style.height) canvas.style.height = '160px';
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = (canvas.offsetWidth || 600) * ratio;
  canvas.height = (canvas.offsetHeight || 160) * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  gState.s2SigPadInstance = new SignaturePad(canvas, { penColor: '#0F172A', backgroundColor: '#ffffff', minWidth: 0.5, maxWidth: 2.5 });
  gState.s2SigPadInstance.addEventListener('endStroke', () => {
    canvas.closest('.sig-pad-wrap')?.classList.add('sig-pad-filled');
    stage2CheckSubmit();
  });
}

function s2SigClear() {
  gState.s2SigPadInstance?.clear();
  document.getElementById('s2-sigpad')?.closest('.sig-pad-wrap')?.classList.remove('sig-pad-filled');
  stage2CheckSubmit();
}

function s2SigHandleUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    gState.s2SigUploadedDataUrl = e.target.result;
    const preview = document.getElementById('s2-sig-upload-preview');
    if (preview) { preview.src = gState.s2SigUploadedDataUrl; preview.style.display = 'block'; }
    stage2CheckSubmit();
  };
  reader.readAsDataURL(file);
}

function s2SigLoadTopaz() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    s2SigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  s2SigTopazRenderStatus('idle', 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.');
}

function s2SigTopazRenderStatus(status, msg) {
  gState.s2SigTopazStatus = status;
  const el = document.getElementById('s2-sig-topaz-text');
  const dot = document.getElementById('s2-sig-topaz-dot');
  if (el) el.textContent = msg;
  if (dot) {
    dot.className = 'sig-topaz-dot';
    if (status === 'capturing') dot.classList.add('dot-capturing');
    if (status === 'captured') dot.classList.add('dot-captured');
    if (status === 'error') dot.classList.add('dot-error');
  }
}

function s2SigTopazSign() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    s2SigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  s2SigTopazRenderStatus('capturing', 'Sign on the Topaz pad now\u2026');
  const msgEl = document.createElement('MyExtensionDataElement');
  msgEl.setAttribute('messageAttribute', JSON.stringify({
    firstName: '', lastName: '', eMail: '', location: '',
    imageFormat: 1, imageX: 500, imageY: 100,
    imageTransparency: false, imageScaling: false,
    maxUpScalePercent: 0.0, rawDataFormat: 'ENC', minSigPoints: 25
  }));
  document.documentElement.appendChild(msgEl);
  top.document.addEventListener('SignResponse', function handler(e) {
    top.document.removeEventListener('SignResponse', handler);
    msgEl.remove();
    const obj = JSON.parse(e.target.getAttribute('msgAttribute') || '{}');
    if (!obj.isSigned) {
      s2SigTopazRenderStatus('idle', 'Signature cancelled \u2014 click \u201cSign on Pad\u201d to try again.');
      return;
    }
    gState.s2SigTopazPreviewUrl = 'data:image/png;base64,' + obj.imageData;
    const preview = document.getElementById('s2-sig-topaz-preview');
    if (preview) { preview.src = gState.s2SigTopazPreviewUrl; preview.style.display = 'block'; }
    s2SigTopazRenderStatus('captured', 'Signature captured successfully.');
    stage2CheckSubmit();
  }, false);
  const evt = document.createEvent('Events');
  evt.initEvent('SignStartEvent', true, false);
  msgEl.dispatchEvent(evt);
}

function s2SigTopazClear() {
  gState.s2SigTopazPreviewUrl = null;
  const preview = document.getElementById('s2-sig-topaz-preview');
  if (preview) preview.style.display = 'none';
  s2SigTopazRenderStatus('idle', 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.');
  stage2CheckSubmit();
}

// ── RadReview signature helpers ─────────────────────────────────────────────────
function rvSigSwitchMode(mode) {
  gState.rvSigMode = mode;
  document.getElementById('rv-sig-draw-pane')?.style.setProperty('display', mode === 'draw' ? '' : 'none');
  document.getElementById('rv-sig-upload-pane')?.style.setProperty('display', mode === 'upload' ? '' : 'none');
  document.getElementById('rv-sig-topaz-pane')?.style.setProperty('display', mode === 'topaz' ? '' : 'none');
  document.getElementById('rv-sig-tab-draw')?.classList.toggle('sig-tab-active', mode === 'draw');
  document.getElementById('rv-sig-tab-upload')?.classList.toggle('sig-tab-active', mode === 'upload');
  document.getElementById('rv-sig-tab-topaz')?.classList.toggle('sig-tab-active', mode === 'topaz');
  if (mode === 'draw') rvInitSigPad();
  if (mode === 'topaz') rvSigLoadTopaz();
  try { radReviewCheckSubmit(); } catch (e) { }
}

function rvInitSigPad() {
  const canvas = document.getElementById('rv-sigpad');
  if (!canvas || typeof SignaturePad === 'undefined') return;
  if (gState.rvSigPadInstance) gState.rvSigPadInstance.off();
  // Ensure critical styles are applied inline (Vite CSS may load async)
  canvas.style.touchAction = 'none';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.cursor = 'crosshair';
  if (!canvas.style.height) canvas.style.height = '160px';
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = (canvas.offsetWidth || 600) * ratio;
  canvas.height = (canvas.offsetHeight || 160) * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  gState.rvSigPadInstance = new SignaturePad(canvas, { penColor: '#0F172A', backgroundColor: '#ffffff', minWidth: 0.5, maxWidth: 2.5 });
  gState.rvSigPadInstance.addEventListener('endStroke', () => {
    canvas.closest('.sig-pad-wrap')?.classList.add('sig-pad-filled');
    radReviewCheckSubmit();
  });
}

function rvSigClear() {
  gState.rvSigPadInstance?.clear();
  document.getElementById('rv-sigpad')?.closest('.sig-pad-wrap')?.classList.remove('sig-pad-filled');
  radReviewCheckSubmit();
}

function rvSigHandleUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    gState.rvSigUploadedDataUrl = e.target.result;
    const preview = document.getElementById('rv-sig-upload-preview');
    if (preview) { preview.src = gState.rvSigUploadedDataUrl; preview.style.display = 'block'; }
    radReviewCheckSubmit();
  };
  reader.readAsDataURL(file);
}

function rvSigLoadTopaz() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    rvSigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  rvSigTopazRenderStatus('idle', 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.');
}

function rvSigTopazRenderStatus(status, msg) {
  gState.rvSigTopazStatus = status;
  const el = document.getElementById('rv-sig-topaz-text');
  const dot = document.getElementById('rv-sig-topaz-dot');
  if (el) el.textContent = msg;
  if (dot) {
    dot.className = 'sig-topaz-dot';
    if (status === 'capturing') dot.classList.add('dot-capturing');
    if (status === 'captured') dot.classList.add('dot-captured');
    if (status === 'error') dot.classList.add('dot-error');
  }
}

function rvSigTopazSign() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    rvSigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  rvSigTopazRenderStatus('capturing', 'Sign on the Topaz pad now\u2026');
  const msgEl = document.createElement('MyExtensionDataElement');
  msgEl.setAttribute('messageAttribute', JSON.stringify({
    firstName: '', lastName: '', eMail: '', location: '',
    imageFormat: 1, imageX: 500, imageY: 100,
    imageTransparency: false, imageScaling: false,
    maxUpScalePercent: 0.0, rawDataFormat: 'ENC', minSigPoints: 25
  }));
  document.documentElement.appendChild(msgEl);
  top.document.addEventListener('SignResponse', function handler(e) {
    top.document.removeEventListener('SignResponse', handler);
    msgEl.remove();
    const obj = JSON.parse(e.target.getAttribute('msgAttribute') || '{}');
    if (!obj.isSigned) {
      rvSigTopazRenderStatus('idle', 'Signature cancelled \u2014 click \u201cSign on Pad\u201d to try again.');
      return;
    }
    gState.rvSigTopazPreviewUrl = 'data:image/png;base64,' + obj.imageData;
    const preview = document.getElementById('rv-sig-topaz-preview');
    if (preview) { preview.src = gState.rvSigTopazPreviewUrl; preview.style.display = 'block'; }
    rvSigTopazRenderStatus('captured', 'Signature captured successfully.');
    radReviewCheckSubmit();
  }, false);
  const evt = document.createEvent('Events');
  evt.initEvent('SignStartEvent', true, false);
  msgEl.dispatchEvent(evt);
}

function rvSigTopazClear() {
  gState.rvSigTopazPreviewUrl = null;
  const preview = document.getElementById('rv-sig-topaz-preview');
  if (preview) preview.style.display = 'none';
  rvSigTopazRenderStatus('idle', 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.');
  radReviewCheckSubmit();
}

/* ═══════════════════════════════════════════════════════════════
   NEW CONSENT — RENDER
═══════════════════════════════════════════════════════════════ */
function renderNewConsent() {
  return `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('consents')"
          style="margin-bottom:6px;margin-left:-6px;gap:4px">
          ← Back to Records
        </button>
        <div class="page-title">New Consent Session</div>
        <div class="page-subtitle">Complete the form below to start the patient consent workflow</div>
      </div>
    </div>

    <!-- ── Section 1: Patient Details ── -->
    <div class="card mb-4">
      <div class="nc-section-header">
        <div class="nc-section-num">1</div>
        <div class="nc-section-title">Patient Details</div>
      </div>
      <div class="nc-section-body">
        <div class="form-row mb-3">
          <div class="form-group">
            <label class="form-label" for="nc-name">Full Name <span class="req">*</span></label>
            <input class="form-control" type="text" id="nc-name"
              placeholder="e.g. Emeka Nwosu" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="nc-hosp-num">Hospital Number / Patient ID</label>
            <input class="form-control" type="text" id="nc-hosp-num"
              placeholder="e.g. HN/2025/00123" />
          </div>
        </div>
        <div class="form-row mb-3">
          <div class="form-group">
            <label class="form-label" for="nc-dob">Date of Birth</label>
            <input class="form-control" type="date" id="nc-dob" />
          </div>
          <div class="form-group">
            <label class="form-label">Sex <span class="req">*</span></label>
            <div class="sex-btn-group">
              <button class="sex-btn" data-sex="male"   onclick="selectSex('male')">Male</button>
              <button class="sex-btn" data-sex="female" onclick="selectSex('female')">Female</button>
              <button class="sex-btn" data-sex="other"  onclick="selectSex('other')">Other</button>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="nc-phone">Phone Number</label>
            <input class="form-control" type="tel" id="nc-phone"
              placeholder="e.g. 08012345678" />
          </div>
          <div class="form-group">
            <label class="form-label" for="nc-ref-doctor">Referring Doctor</label>
            <input class="form-control" type="text" id="nc-ref-doctor"
              placeholder="e.g. Dr. Adeyemi" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Section 2: Procedure & Modality ── -->
    <div class="card mb-4">
      <div class="nc-section-header">
        <div class="nc-section-num">2</div>
        <div class="nc-section-title">Procedure &amp; Modality <span class="req">*</span></div>
      </div>
      <div class="nc-section-body">
        <div class="modality-grid mb-4">

          <div class="modality-card" data-mod="mri_without_contrast"
            onclick="selectModality('mri_without_contrast')">
            <div class="modality-check">${IC.check}</div>
            <div class="modality-icon mi-mri">MRI</div>
            <div class="modality-name">MRI</div>
            <div class="modality-desc">Without contrast agent</div>
            <span class="modality-tag">Safety screening</span>
          </div>

          <div class="modality-card" data-mod="mri_with_gadolinium"
            onclick="selectModality('mri_with_gadolinium')">
            <div class="modality-check">${IC.check}</div>
            <div class="modality-icon mi-mri">MRI<sup>+</sup></div>
            <div class="modality-name">MRI + Gadolinium</div>
            <div class="modality-desc">With gadolinium contrast</div>
            <span class="modality-tag">Safety screening</span>
          </div>

          <div class="modality-card" data-mod="ct_without_contrast"
            onclick="selectModality('ct_without_contrast')">
            <div class="modality-check">${IC.check}</div>
            <div class="modality-icon mi-ct">CT</div>
            <div class="modality-name">CT Scan</div>
            <div class="modality-desc">Without contrast agent</div>
          </div>

          <div class="modality-card" data-mod="ct_with_iv_contrast"
            onclick="selectModality('ct_with_iv_contrast')">
            <div class="modality-check">${IC.check}</div>
            <div class="modality-icon mi-ct">CT<sup>+</sup></div>
            <div class="modality-name">CT + IV Contrast</div>
            <div class="modality-desc">With intravenous contrast</div>
          </div>

          <div class="modality-card" data-mod="mammography"
            onclick="selectModality('mammography')">
            <div class="modality-check">${IC.check}</div>
            <div class="modality-icon mi-mmg">MMG</div>
            <div class="modality-name">Mammography</div>
            <div class="modality-desc">Breast X-ray imaging</div>
          </div>

        </div>
        <div class="form-group" style="max-width:500px">
          <label class="form-label" for="nc-body-part">Body Part / Region</label>
          <input class="form-control" type="text" id="nc-body-part"
            placeholder="e.g. Brain, Lumbar spine, Right knee, Abdomen &amp; pelvis" />
        </div>
      </div>
    </div>

    <!-- ── Section 3: Pre-Procedure Clinical Data ── -->
    <!-- Hidden by default, toggled via selectModality() if CT or MRI -->
    <div class="card mb-4" id="nc-clinical-params" style="display: none;">
      <div class="nc-section-header">
        <div class="nc-section-num">3</div>
        <div class="nc-section-title">Pre-Procedure Clinical Data <span class="text-sm font-normal text-muted">(Optional)</span></div>
      </div>
      <div class="nc-section-body">
        <div style="font-size:13px;color:var(--c-text-sec);margin-bottom:16px">
          Enter latest relevant laboratory results and pre-procedure vitals for CT and MRI patients.
        </div>
        
        <div class="form-row mb-3">
          <div class="form-group">
            <label class="form-label" for="nc-urea">Urea <span class="text-muted">(mmol/L)</span></label>
            <input class="form-control" type="number" step="0.1" id="nc-urea" placeholder="e.g. 5.1" />
          </div>
          <div class="form-group">
            <label class="form-label" for="nc-creatinine">Creatinine <span class="text-muted">(µmol/L)</span></label>
            <input class="form-control" type="number" step="1" id="nc-creatinine" placeholder="e.g. 85" />
          </div>
        </div>

        <div class="form-row mb-3">
          <div class="form-group">
            <label class="form-label">Blood Pressure <span class="text-muted">(mmHg)</span></label>
            <div style="display:flex;align-items:center;gap:8px">
              <input class="form-control" type="number" id="nc-bp-sys" placeholder="Sys" style="flex:1" />
              <span style="color:var(--c-border)">/</span>
              <input class="form-control" type="number" id="nc-bp-dia" placeholder="Dia" style="flex:1" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="nc-pulse">Heart Rate <span class="text-muted">(bpm)</span></label>
            <input class="form-control" type="number" id="nc-pulse" placeholder="e.g. 72" />
          </div>
        </div>

        <div class="form-row mb-3">
          <div class="form-group">
            <label class="form-label" for="nc-spo2">SpO2 <span class="text-muted">(%)</span></label>
            <input class="form-control" type="number" id="nc-spo2" placeholder="e.g. 98" />
          </div>
          <div class="form-group">
            <label class="form-label" for="nc-temp">Temperature <span class="text-muted">(°C)</span></label>
            <input class="form-control" type="number" step="0.1" id="nc-temp" placeholder="e.g. 36.6" />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group" style="max-width:300px">
            <label class="form-label" for="nc-weight">Weight <span class="text-muted">(kg)</span></label>
            <input class="form-control" type="number" step="0.1" id="nc-weight" placeholder="e.g. 75.5" />
          </div>
        </div>

      </div>
    </div>

    <!-- ── Section 4: Preferred Language ── -->
    <div class="card mb-4">
      <div class="nc-section-header">
        <div class="nc-section-num">4</div>
        <div class="nc-section-title">Patient's Preferred Language</div>
      </div>
      <div class="nc-section-body">
        <div class="lang-btn-group">
          <button class="lang-btn selected" data-lang="en" onclick="selectLanguage('en')">
            <span class="lang-flag">🇬🇧</span>
            <span class="lang-code">English</span>
          </button>
          <button class="lang-btn" data-lang="yo" onclick="selectLanguage('yo')">
            <span class="lang-flag">🟢</span>
            <span class="lang-code">Yorùbá</span>
            <span class="lang-phase">EN only</span>
          </button>
          <button class="lang-btn" data-lang="ig" onclick="selectLanguage('ig')">
            <span class="lang-flag">🔴</span>
            <span class="lang-code">Igbo</span>
            <span class="lang-phase">EN only</span>
          </button>
          <button class="lang-btn" data-lang="ha" onclick="selectLanguage('ha')">
            <span class="lang-flag">🔵</span>
            <span class="lang-code">Hausa</span>
            <span class="lang-phase">EN only</span>
          </button>
        </div>
        <p class="form-hint mt-3">
          The selected language is recorded on the consent record.
          All Phase 1 content is displayed in English.
        </p>
      </div>
    </div>

    <!-- ── Section 5: Consent Mode ── -->
    <div class="card mb-6">
      <div class="nc-section-header">
        <div class="nc-section-num">5</div>
        <div class="nc-section-title">Consent Mode</div>
      </div>
      <div class="nc-section-body">
        <div class="consent-mode-grid">

          <div class="consent-mode-card selected" data-mode="assisted"
            onclick="selectConsentMode('assisted')">
            <div class="consent-mode-default">Default</div>
            <div class="consent-mode-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="consent-mode-name">Staff-Assisted</div>
            <div class="consent-mode-desc">
              A radiographer or nurse guides the patient through the form.
              Recommended for most patients.
            </div>
          </div>

          <div class="consent-mode-card" data-mode="self-service"
            onclick="selectConsentMode('self-service')">
            <div class="consent-mode-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="consent-mode-name">Patient Self-Service</div>
            <div class="consent-mode-desc">
              The patient completes the form independently on a tablet or screen.
              Suitable for tech-comfortable patients.
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ── Submit ── -->
    <div class="nc-submit-row">
      <p class="text-muted text-sm">
        Fields marked <span class="text-danger font-semibold">*</span> are required to continue
      </p>
      <button id="nc-submit-btn" class="btn btn-primary btn-lg" disabled
        onclick="submitNewConsent()">
        Start Consent Workflow →
      </button>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   MRI SAFETY SCREENING — STEP MACHINE
═══════════════════════════════════════════════════════════════ */

/* ── Step definitions ─────────────────────────────────────── */
const SCR_STEPS = [

  // Info — remove metal items before scan
  {
    id: 'info_metal', domain: 0, domainName: 'Important Information', type: 'info',
    title: 'Before your MRI scan',
    body: 'Prior to your MRI scan you will be asked to remove any metal items from your body. This will include such items as hearing aids, jewellery, tinted contact lenses, removable metal dentures, body piercings, false eye, skin patches (nicotine, angina, hormone etc.), artificial limbs and calipers.',
    showIf: null,
  },

  // Q1 — Hearing aids
  {
    id: 'q1_hearing', domain: 1, domainName: 'Hearing', type: 'yesno',
    question: 'Do you wear hearing aids or do you have hearing difficulties?',
    showIf: null,
  },
  {
    id: 'q1_removed', domain: 1, domainName: 'Hearing', type: 'yesno',
    question: 'Have your hearing aids been removed?',
    showIf: (a) => a.q1_hearing === 'yes',
  },

  // Q2 — Implants
  {
    id: 'q2_implants', domain: 2, domainName: 'Implanted Devices', type: 'multicheck',
    question: 'Do you have any of the following implants?',
    hint: 'Select all that apply. Choose "None of the above" if none apply.',
    showIf: null,
    options: [
      { id: 'pacemaker_icd', label: 'Cardiac (heart) pacemaker and/or internal cardiac defibrillator', tierLabel: 'Tier 1 — Absolute contraindication' },
      { id: 'heart_valve', label: 'Artificial heart valve or REVEAL device', tierLabel: 'Tier 2 — Review required' },
      { id: 'aneurysm_clip', label: 'Aneurysm clips in your brain', tierLabel: 'Tier 1 — Absolute contraindication' },
      { id: 'hydro_shunt', label: 'Programmable hydrocephalus shunt', tierLabel: 'Tier 2 — Review required' },
      { id: 'cochlear_ear', label: 'Cochlear or other ear implant', tierLabel: 'Tier 1 — Absolute contraindication' },
      { id: 'stent', label: 'A stent inserted in any part of your body', tierLabel: 'Tier 2 — Review required' },
      { id: 'pain_drug_device', label: 'Implanted pain control or drug infusion device', tierLabel: 'Tier 2 — Review required' },
      { id: 'clips_pins_plates', label: 'Clips, pins, plates, joint replacements or embolisation coils', tierLabel: 'Tier 2 — Review required' },
      { id: 'none', label: 'None of the above', tierLabel: '' },
    ],
  },
  {
    id: 'q2_surgery_6wks', domain: 2, domainName: 'Implanted Devices', type: 'yesno',
    question: 'Have you had any operations in the last 6 weeks?',
    showIf: null,
  },

  // Q3 — Metal in eyes
  {
    id: 'q3_metal_eyes', domain: 3, domainName: 'Metal in Eyes', type: 'yesno',
    question: 'Have you ever had any metal fragments go into your eyes?',
    showIf: null,
  },
  {
    id: 'q3_medical_advice', domain: 3, domainName: 'Metal in Eyes', type: 'yesno',
    question: 'Did you receive medical advice from a Doctor?',
    showIf: (a) => a.q3_metal_eyes === 'yes',
  },
  {
    id: 'q3_removed', domain: 3, domainName: 'Metal in Eyes', type: 'yesno',
    question: 'Was everything completely removed?',
    showIf: (a) => a.q3_metal_eyes === 'yes',
  },

  // Q4 — Other surgery
  {
    id: 'q4_surgery', domain: 4, domainName: 'Surgical History', type: 'yesno',
    question: 'Have you ever had any other surgery?',
    hint: 'Includes any surgical procedure not already mentioned above.',
    showIf: null,
  },
  {
    id: 'q4_surgery_details', domain: 4, domainName: 'Surgical History', type: 'text',
    question: 'Please state the type of surgery:',
    showIf: (a) => a.q4_surgery === 'yes',
  },

  // Q5 — Shrapnel / blast
  {
    id: 'q5_shrapnel', domain: 5, domainName: 'Shrapnel / Blast Injuries', type: 'yesno',
    question: 'Have you had any shrapnel or gunshot / bomb blast injuries?',
    showIf: null,
  },

  // Q6 — Pregnancy (female only)
  {
    id: 'q6_pregnant', domain: 6, domainName: 'Pregnancy', type: 'yesno',
    question: 'Are you, or could you be pregnant?',
    hint: 'MRI is generally avoided in early pregnancy unless the benefit outweighs the risk.',
    showIf: (_, c) => c.patient?.gender === 'female',
  },

  // Q7 — Breastfeeding (female only)
  {
    id: 'q7_breastfeeding', domain: 7, domainName: 'Breastfeeding', type: 'yesno',
    question: 'Are you breastfeeding?',
    showIf: (_, c) => c.patient?.gender === 'female',
  },

  // Q8 — Medical conditions
  {
    id: 'q8_conditions', domain: 8, domainName: 'Medical Conditions', type: 'multicheck',
    question: 'Do you have any of the following conditions?',
    hint: 'Select all that apply. Choose "None of the above" if none apply.',
    showIf: null,
    options: [
      { id: 'epilepsy', label: 'Epilepsy', tierLabel: 'Tier 2 — Review required' },
      { id: 'blackouts', label: 'Blackouts', tierLabel: 'Tier 2 — Review required' },
      { id: 'angina', label: 'Angina', tierLabel: 'Tier 2 — Review required' },
      { id: 'asthma', label: 'Asthma', tierLabel: 'Tier 3 — Awareness' },
      { id: 'none', label: 'None of the above', tierLabel: '' },
    ],
  },

  // Q9 — Tattoos
  {
    id: 'q9_tattoos', domain: 9, domainName: 'Tattoos', type: 'yesno',
    question: 'Do you have any tattoos?',
    hint: 'Some tattoo inks contain metallic pigments that can react to MRI fields.',
    showIf: null,
  },
];

/* ── Yoruba translations for MRI screening steps ──────────── */
const SCR_STEPS_YO = [
  {
    id: 'info_metal', domain: 0, domainName: 'Àlàyé Pàtàkì', type: 'info',
    title: 'Ṣáájú àyẹ̀wò MRI rẹ',
    body: 'Ṣáájú àyẹ̀wò MRI rẹ, a ó béèrè pé kí o yọ gbogbo ohun irin kúrò lára rẹ. Èyí pẹ̀lú ohun bíi ẹ̀rọ ìgbọ́ránṣé, aṣọ ìṣọ́, lẹ́ǹsì tí ó ní àwọ̀, eyín irin tí a lè yọ, ohun ọ̀ṣọ́ ara, ojú irọ́, àwọ̀ ara (tábà, angina, hormone àti bẹ́ẹ̀ bẹ́ẹ̀ lọ), ẹsẹ̀ àti ọwọ́ arọ.',
    showIf: null,
  },
  {
    id: 'q1_hearing', domain: 1, domainName: 'Ìgbọ́ràn', type: 'yesno',
    question: 'Ṣé o ń lo ẹ̀rọ ìgbọ́ránṣé tàbí o ní ìṣòro ìgbọ́ràn?',
    showIf: null,
  },
  {
    id: 'q1_removed', domain: 1, domainName: 'Ìgbọ́ràn', type: 'yesno',
    question: 'Ṣé o ti yọ ẹ̀rọ ìgbọ́ránṣé rẹ kúrò?',
    showIf: (a) => a.q1_hearing === 'yes',
  },
  {
    id: 'q2_implants', domain: 2, domainName: 'Ohun tí a fi Sínú Ara', type: 'multicheck',
    question: 'Ṣé o ní èyíkéyìí nínú àwọn ohun wọ̀nyí nínú ara rẹ?',
    hint: 'Yan gbogbo èyí tí ó bá kan ọ́. Yan "Kò sí èyíkéyìí nínú àwọn yìí" bí kò bá kan ọ́.',
    showIf: null,
    options: [
      { id: 'pacemaker_icd', label: 'Ẹ̀rọ ìṣàkóso ọkàn (pacemaker) àti/tàbí ẹ̀rọ ìmúpadà ọkàn sí ipò', tierLabel: 'Ìpele 1 — Ewu àìṣeéṣe' },
      { id: 'heart_valve', label: 'Fáàfù ọkàn arọ tàbí ẹ̀rọ REVEAL', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'aneurysm_clip', label: 'Àwọn clips aneurysm nínú ọpọlọ rẹ', tierLabel: 'Ìpele 1 — Ewu àìṣeéṣe' },
      { id: 'hydro_shunt', label: 'Shunt hydrocephalus tí a lè ṣètò', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'cochlear_ear', label: 'Ẹ̀rọ cochlear tàbí ẹ̀rọ etí mìíràn', tierLabel: 'Ìpele 1 — Ewu àìṣeéṣe' },
      { id: 'stent', label: 'Stent tí a fi sí apá kankan nínú ara rẹ', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'pain_drug_device', label: 'Ẹ̀rọ ìdènà ìrora tàbí ẹ̀rọ ìfúnni ní oògùn tí a fi sínú ara', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'clips_pins_plates', label: 'Clips, pins, plates, ìṣẹ̀rọ̀pò ẹ̀yà-ara tàbí embolisation coils', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'none', label: 'Kò sí èyíkéyìí nínú àwọn yìí', tierLabel: '' },
    ],
  },
  {
    id: 'q2_surgery_6wks', domain: 2, domainName: 'Ohun tí a fi Sínú Ara', type: 'yesno',
    question: 'Ṣé o ti ṣe iṣẹ́ abẹ kankan nínú ọ̀sẹ̀ mẹ́fà sẹ́yìn?',
    showIf: null,
  },
  {
    id: 'q3_metal_eyes', domain: 3, domainName: 'Irin nínú Ojú', type: 'yesno',
    question: 'Ṣé irin tí ó fọ́ ti wọ ojú rẹ rí?',
    showIf: null,
  },
  {
    id: 'q3_medical_advice', domain: 3, domainName: 'Irin nínú Ojú', type: 'yesno',
    question: 'Ṣé dókítà fún ọ ní ìmọ̀ràn?',
    showIf: (a) => a.q3_metal_eyes === 'yes',
  },
  {
    id: 'q3_removed', domain: 3, domainName: 'Irin nínú Ojú', type: 'yesno',
    question: 'Ṣé wọ́n yọ ohun gbogbo kúrò pátápátá?',
    showIf: (a) => a.q3_metal_eyes === 'yes',
  },
  {
    id: 'q4_surgery', domain: 4, domainName: 'Ìtàn Iṣẹ́ Abẹ', type: 'yesno',
    question: 'Ṣé o ti ṣe iṣẹ́ abẹ mìíràn rí?',
    hint: 'Èyí pẹ̀lú iṣẹ́ abẹ èyíkéyìí tí a kò ti dárúkọ lókè yìí.',
    showIf: null,
  },
  {
    id: 'q4_surgery_details', domain: 4, domainName: 'Ìtàn Iṣẹ́ Abẹ', type: 'text',
    question: 'Jọ̀wọ́ sọ irú iṣẹ́ abẹ náà:',
    showIf: (a) => a.q4_surgery === 'yes',
  },
  {
    id: 'q5_shrapnel', domain: 5, domainName: 'Ọgbẹ́ Ìbọn / Bọ́ǹbù', type: 'yesno',
    question: 'Ṣé o ti ní ọgbẹ́ ìbọn, shrapnel tàbí ọgbẹ́ bọ́ǹbù?',
    showIf: null,
  },
  {
    id: 'q6_pregnant', domain: 6, domainName: 'Oyún', type: 'yesno',
    question: 'Ṣé o lóyún, tàbí ṣé ó ṣeéṣe kí o lóyún?',
    hint: 'A sábà máa ń yẹra fún MRI ní ìbẹ̀rẹ̀ oyún àyàfi bí àǹfààní bá pọ̀ ju ewu lọ.',
    showIf: (_, c) => c.patient?.gender === 'female',
  },
  {
    id: 'q7_breastfeeding', domain: 7, domainName: 'Ìfọ́mọ Lọ́yàn', type: 'yesno',
    question: 'Ṣé o ń fọ ọmọ lọ́yàn?',
    showIf: (_, c) => c.patient?.gender === 'female',
  },
  {
    id: 'q8_conditions', domain: 8, domainName: 'Àwọn Àìsàn', type: 'multicheck',
    question: 'Ṣé o ní èyíkéyìí nínú àwọn àìsàn wọ̀nyí?',
    hint: 'Yan gbogbo èyí tí ó bá kan ọ́. Yan "Kò sí èyíkéyìí nínú àwọn yìí" bí kò bá kan ọ́.',
    showIf: null,
    options: [
      { id: 'epilepsy', label: 'Wàràpá (Epilepsy)', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'blackouts', label: 'Ìdákú', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'angina', label: 'Ìrora àyà (Angina)', tierLabel: 'Ìpele 2 — Àtúnyẹ̀wò ní láti ṣe' },
      { id: 'asthma', label: 'Ikọ́-fèé (Asthma)', tierLabel: 'Ìpele 3 — Àmọ̀ye' },
      { id: 'none', label: 'Kò sí èyíkéyìí nínú àwọn yìí', tierLabel: '' },
    ],
  },
  {
    id: 'q9_tattoos', domain: 9, domainName: 'Àmì Ara (Tattoo)', type: 'yesno',
    question: 'Ṣé o ní àmì (tattoo) kankan lára rẹ?',
    hint: 'Àwọn inki tattoo kan ní irin tí ó lè dahùn sí agbára MRI.',
    showIf: null,
  },
];

/* ── Screening UI labels for each language ───────────────── */
const SCR_UI_LABELS = {
  en: {
    yes: 'Yes', no: 'No', next: 'Next →', prev: '← Previous',
    finish: 'View Results →', proceed: 'Proceed to Consent Declaration →',
    back: '← Back', step: 'Step', of: 'of',
    scrResults: 'Screening Results',
    safetyFlags: 'Safety Flags', total: 'total',
    summary: 'Summary', patient: 'Patient', modality: 'Modality',
    screened: 'Screened', totalFlags: 'Total Flags',
    clear: 'Clear — No flags',
    tier1Label: 'Tier 1 — Absolute Contraindication',
    tier2Label: 'Tier 2 — Radiologist Review Required',
    tier3Label: 'Tier 3 — Awareness Flags Only',
    tier1Alert: 'Procedure cannot proceed without radiologist sign-off',
    tier1Body: 'One or more absolute contraindications were identified. The MRI scan must not proceed until a radiologist has reviewed this record and provided written authorisation.',
    tier2Alert: 'Radiologist review required before procedure commences',
    tier2Body: 'One or more conditional risk factors were identified. The radiologist must review and approve this record before the procedure may proceed.',
    clearAlert: 'No safety concerns identified',
    clearBody: 'The patient has no identified MRI safety flags. The procedure may proceed.',
    awareness: 'Awareness flags noted — no contraindications',
    awarenessBody: 'The flagged items are noted for awareness. No contraindication to MRI was identified.',
    noFlags: 'No flags raised.',
    tier1Flags: 'Tier 1 Flags', tier2Flags: 'Tier 2 Flags', tier3Flags: 'Tier 3 Flags',
  },
  yo: {
    yes: 'Bẹ́ẹ̀ni', no: 'Rárá', next: 'Tẹ̀síwájú →', prev: '← Padàsẹ́yìn',
    finish: 'Wo Èsì →', proceed: 'Tẹ̀síwájú sí Ìwé Ìfohùnsí →',
    back: '← Padà', step: 'Ìgbésẹ̀', of: 'nínú',
    scrResults: 'Èsì Àyẹ̀wò Ààbò',
    safetyFlags: 'Àmì Ààbò', total: 'àpapọ̀',
    summary: 'Àkópọ̀', patient: 'Aláìsàn', modality: 'Irú Àyẹ̀wò',
    screened: 'Àkókò Àyẹ̀wò', totalFlags: 'Àpapọ̀ Àmì',
    clear: 'Mímọ́ — Kò sí àmì',
    tier1Label: 'Ìpele 1 — Ewu Àìṣeéṣe',
    tier2Label: 'Ìpele 2 — Àtúnyẹ̀wò Dọ́kítà Pàtàkì',
    tier3Label: 'Ìpele 3 — Àmì Àmọ̀ye',
    tier1Alert: 'Ìlànà kò lè tẹ̀síwájú láìsí ìfọwọ́sí dọ́kítà',
    tier1Body: 'A ti rí ọ̀kan tàbí ju bẹ́ẹ̀ lọ ewu pàtàkì. Àyẹ̀wò MRI kò gbọdọ̀ tẹ̀síwájú títí dọ́kítà yóò fi ṣàtúnyẹ̀wò àkọsílẹ̀ yìí.',
    tier2Alert: 'Àtúnyẹ̀wò dọ́kítà nílò ṣáájú ìlànà',
    tier2Body: 'A ti rí ọ̀kan tàbí ju bẹ́ẹ̀ lọ ewu tí ó nílò àtúnyẹ̀wò. Dọ́kítà gbọdọ̀ ṣàtúnyẹ̀wò àti fọwọ́sí ṣáájú ìlànà.',
    clearAlert: 'Kò sí ewu ààbò tí a rí',
    clearBody: 'Aláìsàn kò ní ewu ààbò MRI kankan tí a mọ̀. Ìlànà lè tẹ̀síwájú.',
    awareness: 'A ti ṣàkíyèsí àwọn àmì — kò sí ewu',
    awarenessBody: 'A ti ṣàkíyèsí àwọn àmì fún ìmọ̀. Kò sí ewu sí MRI tí a rí.',
    noFlags: 'Kò sí àmì kankan.',
    tier1Flags: 'Àmì Ìpele 1', tier2Flags: 'Àmì Ìpele 2', tier3Flags: 'Àmì Ìpele 3',
  },
};

/* ── Helper: get steps for current language ──────────────── */
function getScrSteps() {
  return gState.consentDeclState.lang === 'yo' ? SCR_STEPS_YO : SCR_STEPS;
}

function getScrLabels() {
  return SCR_UI_LABELS[gState.consentDeclState.lang] || SCR_UI_LABELS.en;
}

/* ── Switch screening language mid-flow ──────────────────── */
function scrSwitchLang(lang) {
  gState.consentDeclState.lang = lang;
  // Rebuild steps list with the new language, preserving answers and position
  if (gState.mriScrState.consent) {
    gState.mriScrState.steps = mriScrBuildSteps(gState.mriScrState.consent, gState.mriScrState.answers);
  }
  render();
}

/* ── Build active step list for this consent ──────────────── */
function mriScrBuildSteps(consent, answers) {
  const steps = getScrSteps();
  return steps.filter(s => !s.showIf || s.showIf(answers, consent));
}

/* ── Initialise / reset for a new consent session ──────────── */
function mriScrInit(consent) {
  if (gState.mriScrState.consent?.id === consent.id) return; // already initialised
  // Restore any previously saved raw answers (resume flow)
  const savedAnswers = consent.stage1?.screening?.rawAnswers || {};
  gState.mriScrState = {
    consent,
    answers: savedAnswers,
    stepIdx: 0,
    steps: mriScrBuildSteps(consent, savedAnswers),
  };
  // If answers exist, fast-forward stepIdx to the first unanswered step
  if (Object.keys(savedAnswers).length > 0) {
    const steps = gState.mriScrState.steps;
    let resumeIdx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (savedAnswers[steps[i].id] !== undefined) resumeIdx = i + 1;
    }
    gState.mriScrState.stepIdx = Math.min(resumeIdx, steps.length - 1);
  }
}

/* ── Recompute active steps after each answer ──────────────── */
function mriScrRefreshSteps() {
  const { consent, answers, stepIdx, steps } = gState.mriScrState;
  const newSteps = mriScrBuildSteps(consent, answers);
  // Preserve current position: find index of current step id in new list
  const curId = steps[stepIdx]?.id;
  const newIdx = curId ? Math.max(0, newSteps.findIndex(s => s.id === curId)) : stepIdx;
  gState.mriScrState.steps = newSteps;
  gState.mriScrState.stepIdx = Math.min(newIdx, newSteps.length - 1);
}

/* ── Multicheck mutual-exclusion: 'none' vs everything else ── */
function scrMultiToggle(stepId, changedVal, el) {
  const all = [...document.querySelectorAll(`[data-scr-check="${stepId}"]`)];
  const noneBox = all.find(b => b.value === 'none');
  if (changedVal === 'none') {
    if (el.checked) {
      // Uncheck and visually disable all non-none options
      all.forEach(b => {
        if (b.value !== 'none') {
          b.checked = false;
          b.disabled = true;
          const row = b.closest('.scr-check-option');
          if (row) { row.style.opacity = '0.4'; row.style.pointerEvents = 'none'; }
        }
      });
    } else {
      // Re-enable non-none options
      all.forEach(b => {
        if (b.value !== 'none') {
          b.disabled = false;
          const row = b.closest('.scr-check-option');
          if (row) { row.style.opacity = ''; row.style.pointerEvents = ''; }
        }
      });
    }
  } else if (el.checked && noneBox && noneBox.checked) {
    // A real option was checked — clear 'none'
    noneBox.checked = false;
    all.forEach(b => {
      b.disabled = false;
      const row = b.closest('.scr-check-option');
      if (row) { row.style.opacity = ''; row.style.pointerEvents = ''; }
    });
  }
}

/* ── Record answer ONLY ─────────────────────────────── */
function mriScrAnswer(stepId, value) {
  gState.mriScrState.answers[stepId] = value;
  mriScrRefreshSteps();
  render();
}

function mriScrNext(stepId, isMulti) {
  if (isMulti) {
    const boxes = document.querySelectorAll(`[data-scr-check="${stepId}"]:checked`);
    const vals = Array.from(boxes).map(b => b.value);
    if (vals.length === 0) { toast('Please select at least one option, or choose "None of the above".', 'warning'); return; }
    gState.mriScrState.answers[stepId] = vals.includes('none') ? [] : vals;
    mriScrRefreshSteps();
  } else {
    const step = gState.mriScrState.steps[gState.mriScrState.stepIdx];
    if (step.type === 'info') {
      gState.mriScrState.answers[stepId] = 'acknowledged';
    } else {
      if (gState.mriScrState.answers[stepId] === undefined) {
        toast('Please answer this step to proceed.', 'warning');
        return;
      }
    }
  }
  gState.mriScrState.stepIdx++;
  render();
}

/* ── Go back one step ──────────────────────────────────────── */
function mriScrBack() {
  if (gState.mriScrState.stepIdx > 0) {
    gState.mriScrState.stepIdx--;
    render();
  } else {
    navigate('new-consent');
  }
}

/* ── Compute tier flags + structured screening object ─────── */
function mriScrComputeResults() {
  const { answers, consent } = gState.mriScrState;
  const tier1 = [], tier2 = [], tier3 = [];

  function flag(tier, key) {
    if (tier === 'tier1') tier1.push(key);
    else if (tier === 'tier2') tier2.push(key);
    else tier3.push(key);
  }

  // Q1 — Hearing aids
  const q1hearing = answers.q1_hearing === 'yes';
  const q1removed = answers.q1_removed === 'yes';
  if (q1hearing && !q1removed) flag('tier2', 'hearing_aid_not_removed');
  const hearing = {
    hasHearingAid: q1hearing,
    aidsRemoved: q1hearing ? q1removed : null,
  };

  // Q2 — Implants (filter out 'none' sentinel)
  const implants = (answers.q2_implants || []).filter(v => v !== 'none');
  if (implants.includes('pacemaker_icd')) flag('tier1', 'pacemaker_icd');
  if (implants.includes('heart_valve')) flag('tier2', 'heart_valve');
  if (implants.includes('aneurysm_clip')) flag('tier1', 'aneurysm_clip');
  if (implants.includes('hydro_shunt')) flag('tier2', 'hydro_shunt');
  if (implants.includes('cochlear_ear')) flag('tier1', 'cochlear_ear_implant');
  if (implants.includes('stent')) flag('tier2', 'body_stent');
  if (implants.includes('pain_drug_device')) flag('tier2', 'pain_drug_device');
  if (implants.includes('clips_pins_plates')) flag('tier2', 'clips_pins_plates');
  if (answers.q2_surgery_6wks === 'yes') flag('tier2', 'recent_surgery_under_6wks');

  const implantData = {
    hasPacemakerICD: implants.includes('pacemaker_icd'),
    hasHeartValve: implants.includes('heart_valve'),
    hasAneurysmClip: implants.includes('aneurysm_clip'),
    hasHydroShunt: implants.includes('hydro_shunt'),
    hasCochlearEarImplant: implants.includes('cochlear_ear'),
    hasStent: implants.includes('stent'),
    hasPainDrugDevice: implants.includes('pain_drug_device'),
    hasClipsPinsPlates: implants.includes('clips_pins_plates'),
    recentSurgeryUnder6Weeks: answers.q2_surgery_6wks === 'yes',
  };

  // Q3 — Metal in eyes
  const q3eyes = answers.q3_metal_eyes === 'yes';
  const q3removed = answers.q3_removed;
  if (q3eyes) {
    if (q3removed === 'yes') flag('tier3', 'metallic_ocular_fragment_cleared');
    else flag('tier1', 'metallic_ocular_fragment_unremoved');
  }
  const ocular = {
    hasMetalFragments: q3eyes,
    receivedMedicalAdvice: q3eyes ? (answers.q3_medical_advice === 'yes') : null,
    completelyRemoved: q3eyes ? (q3removed === 'yes') : null,
  };

  // Q4 — Other surgery
  if (answers.q4_surgery === 'yes') flag('tier3', 'prior_other_surgery');
  const surgicalHistory = {
    hadOtherSurgery: answers.q4_surgery === 'yes',
    otherSurgeryDetails: answers.q4_surgery === 'yes' ? (answers.q4_surgery_details || null) : null,
  };

  // Q5 — Shrapnel / blast
  if (answers.q5_shrapnel === 'yes') flag('tier1', 'shrapnel_blast_injury');
  const shrapnel = { hasShrapnelBlastInjury: answers.q5_shrapnel === 'yes' };

  // Q6 — Pregnancy (female only)
  const isFemale = consent.patient?.gender === 'female';
  if (isFemale && answers.q6_pregnant === 'yes') flag('tier2', 'pregnancy');

  // Q7 — Breastfeeding (female only)
  if (isFemale && answers.q7_breastfeeding === 'yes') flag('tier2', 'breastfeeding');

  const pregnancy = {
    isPossiblyPregnant: isFemale ? (answers.q6_pregnant === 'yes') : null,
    isBreastfeeding: isFemale ? (answers.q7_breastfeeding === 'yes') : null,
  };

  // Q8 — Medical conditions (filter out 'none')
  const conditions = (answers.q8_conditions || []).filter(v => v !== 'none');
  if (conditions.includes('epilepsy')) flag('tier2', 'epilepsy');
  if (conditions.includes('blackouts')) flag('tier2', 'blackouts');
  if (conditions.includes('angina')) flag('tier2', 'angina');
  if (conditions.includes('asthma')) flag('tier3', 'asthma');
  const conditionsData = {
    epilepsy: conditions.includes('epilepsy'),
    blackouts: conditions.includes('blackouts'),
    angina: conditions.includes('angina'),
    asthma: conditions.includes('asthma'),
  };

  // Q9 — Tattoos
  if (answers.q9_tattoos === 'yes') flag('tier3', 'tattoos');
  const tattoos = { hasTattoos: answers.q9_tattoos === 'yes' };

  const screening = { hearing, implants: implantData, ocular, surgicalHistory, shrapnel, pregnancy, conditions: conditionsData, tattoos };
  return { tier1, tier2, tier3, screening };
}

/* ── Human-readable flag labels ──────────────────────────────  */
const SCR_FLAG_LABELS = {
  // T1
  pacemaker_icd: 'Cardiac pacemaker or ICD',
  aneurysm_clip: 'Aneurysm clip (brain)',
  cochlear_ear_implant: 'Cochlear or ear implant',
  shrapnel_blast_injury: 'Shrapnel / gunshot / bomb blast injury',
  metallic_ocular_fragment_unremoved: 'Metal fragment in eyes — not confirmed removed',
  // T2
  heart_valve: 'Artificial heart valve or REVEAL device',
  hydro_shunt: 'Programmable hydrocephalus shunt',
  body_stent: 'Stent in body',
  pain_drug_device: 'Implanted pain control or drug infusion device',
  clips_pins_plates: 'Clips, pins, plates, joint replacements or coils',
  recent_surgery_under_6wks: 'Operation in last 6 weeks',
  pregnancy: 'Possible pregnancy',
  breastfeeding: 'Currently breastfeeding',
  epilepsy: 'Epilepsy',
  blackouts: 'Blackouts',
  angina: 'Angina',
  hearing_aid_not_removed: 'Hearing aids not confirmed removed',
  // T3
  metallic_ocular_fragment_cleared: 'Metal fragment in eyes — confirmed removed',
  prior_other_surgery: 'Prior surgical history — possible undocumented implants',
  asthma: 'Asthma',
  tattoos: 'Tattoos (possible metallic ink)',
};

/* ── Submit screening results to backend ─────────────────────  */
async function mriScrSubmit() {
  const consent = gState.mriScrState.consent || state.pageData?.consent;
  if (!consent?.id) {
    toast('Session lost — please start a new consent from the beginning.', 'error');
    navigate('new-consent');
    return;
  }

  const btn = document.getElementById('scr-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>&nbsp;Saving…`; }

  const { screening, tier1, tier2, tier3 } = mriScrComputeResults();

  try {
    const updated = await api('PUT', `/consents/${consent.id}/screening`, {
      screening: { ...screening, rawAnswers: gState.mriScrState.answers },
      tierFlags: { tier1, tier2, tier3 },
    });
    if (!updated) return;
    gState.mriScrState.consent = null;
    if (updated.status === 'flagged_tier1' || updated.status === 'pending_review') {
      navigate('record-detail', { id: updated.id });
      toast('Safety flags detected — a radiologist must review and approve before the patient can sign.', 'warning');
    } else {
      navigate('consent-declaration', { consent: updated });
    }
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Consent Declaration →'; }
  }
}

/* ── Render helper: one question step ────────────────────────  */
function renderMriStep(step, stepNum, totalSteps) {
  const pct = Math.round((stepNum / totalSteps) * 100);
  const SL = getScrLabels();

  const curLang = gState.consentDeclState.lang || 'en';
  const langToggle = `
    <div style="display:flex;gap:6px;justify-content:flex-end;margin-bottom:8px">
      <button class="btn btn-ghost btn-sm${curLang === 'en' ? ' btn-primary' : ''}" style="padding:4px 10px;font-size:11px" onclick="scrSwitchLang('en')">🇬🇧 EN</button>
      <button class="btn btn-ghost btn-sm${curLang === 'yo' ? ' btn-primary' : ''}" style="padding:4px 10px;font-size:11px" onclick="scrSwitchLang('yo')">🟢 YO</button>
    </div>`;

  const progressBar = `
    ${langToggle}
    <div class="scr-progress-wrap">
      <div class="scr-step-label">
        <span>${esc(step.domainName)}</span>
        <span>${SL.step} ${stepNum} ${SL.of} ${totalSteps}</span>
      </div>
      <div class="scr-progress-bar"><div class="scr-progress-fill" style="width:${pct}%"></div></div>
    </div>`;

  let body = '';
  const ans = gState.mriScrState.answers[step.id];

  if (step.type === 'info') {
    body = `
      <div style="text-align:center;padding:8px 0 20px">
        <div style="font-size:22px;font-weight:700;color:var(--c-text);margin-bottom:14px">${esc(step.title)}</div>
        <div style="font-size:14.5px;line-height:1.75;color:var(--c-text-sec);max-width:560px;margin:0 auto">${esc(step.body)}</div>
      </div>`;

  } else if (step.type === 'yesno') {
    body = `
      <div class="scr-question">${esc(step.question)}</div>
      ${step.hint ? `<div class="scr-question-hint">${esc(step.hint)}</div>` : ''}
      <div class="scr-choice-grid two-col">
        <button class="scr-choice-btn ${ans === 'yes' ? 'selected' : ''}" onclick="mriScrAnswer('${step.id}','yes')">
          <span class="scr-choice-label">${SL.yes}</span>
        </button>
        <button class="scr-choice-btn ${ans === 'no' ? 'selected' : ''}" onclick="mriScrAnswer('${step.id}','no')">
          <span class="scr-choice-label">${SL.no}</span>
        </button>
      </div>`;

  } else if (step.type === 'radio') {
    const opts = step.options.map(o => `
      <button class="scr-choice-btn ${ans === o.id ? 'selected' : ''}" onclick="mriScrAnswer('${step.id}','${o.id}')">
        <span class="scr-choice-label">${esc(o.label)}</span>
        ${o.desc ? `<span class="scr-choice-desc">${esc(o.desc)}</span>` : ''}
        <span class="scr-choice-desc" style="margin-top:4px">${esc(o.tierLabel)}</span>
      </button>`).join('');
    body = `
      <div class="scr-question">${esc(step.question)}</div>
      ${step.hint ? `<div class="scr-question-hint">${esc(step.hint)}</div>` : ''}
      <div class="scr-choice-grid">${opts}</div>`;

  } else if (step.type === 'multicheck') {
    const checkedVals = Array.isArray(ans) ? ans : [];
    const opts = step.options.map(o => {
      const isChecked = checkedVals.includes(o.id) ? 'checked' : '';
      return `
      <label class="scr-check-option">
        <input type="checkbox" value="${o.id}" data-scr-check="${step.id}" ${isChecked} onchange="scrMultiToggle('${step.id}','${o.id}',this)">
        <div class="scr-check-option-text">
          <div class="scr-check-label">${esc(o.label)}</div>
          ${o.tierLabel ? `<div class="scr-check-tier">${esc(o.tierLabel)}</div>` : ''}
        </div>
      </label>`;
    }).join('');
    body = `
      <div class="scr-question">${esc(step.question)}</div>
      ${step.hint ? `<div class="scr-question-hint">${esc(step.hint)}</div>` : ''}
      <div class="scr-check-list">${opts}</div>`;
  }

  const isMulti = step.type === 'multicheck';
  const hasAnswer = (isMulti && ans && ans.length > 0) || (!isMulti && ans !== undefined);

  return `${progressBar}
    <div class="card">
      <div class="card-body" style="padding:28px">${body}</div>
      <div class="card-footer" style="padding:16px 24px;display:flex;justify-content:space-between">
        ${stepNum === 1
      ? '<div></div>'
      : `<button class="btn btn-secondary btn-sm" onclick="mriScrBack()">${SL.prev}</button>`}
        ${stepNum === totalSteps
      ? `<button class="btn btn-primary" onclick="mriScrNext('${step.id}', ${isMulti})" ${(!isMulti && step.type !== 'info') && !hasAnswer ? 'disabled' : ''}>${SL.finish}</button>`
      : `<button class="btn btn-primary" onclick="mriScrNext('${step.id}', ${isMulti})" ${(!isMulti && step.type !== 'info') && !hasAnswer ? 'disabled' : ''}>${SL.next}</button>`}
      </div>
    </div>`;
}

/* ── Render results page ─────────────────────────────────────  */
function renderMriResults() {
  const { tier1, tier2, tier3, screening } = mriScrComputeResults();
  const consent = gState.mriScrState.consent;
  const SL = getScrLabels();

  // Overall tier
  const overallTier = tier1.length > 0 ? 1 : tier2.length > 0 ? 2 : tier3.length > 0 ? 3 : 0;
  const overallBadge = overallTier === 0 ? `<span class="badge badge-green">${SL.clear}</span>`
    : overallTier === 1 ? `<span class="badge badge-tier1">${SL.tier1Label}</span>`
      : overallTier === 2 ? `<span class="badge badge-tier2">${SL.tier2Label}</span>`
        : `<span class="badge badge-tier3">${SL.tier3Label}</span>`;

  // Alert banner
  let alertHtml = '';
  if (overallTier === 1) {
    alertHtml = `<div class="scr-alert scr-alert-tier1">${IC.warning}
      <div><div class="scr-alert-title">${SL.tier1Alert}</div>
      <div class="scr-alert-body">${SL.tier1Body}</div>
      </div></div>`;
  } else if (overallTier === 2) {
    alertHtml = `<div class="scr-alert scr-alert-tier2">${IC.warning}
      <div><div class="scr-alert-title">${SL.tier2Alert}</div>
      <div class="scr-alert-body">${SL.tier2Body}</div>
      </div></div>`;
  } else {
    alertHtml = `<div class="scr-alert scr-alert-clear">${IC.check}
      <div><div class="scr-alert-title">${overallTier === 0 ? SL.clearAlert : SL.awareness}</div>
      <div class="scr-alert-body">${overallTier === 0 ? SL.clearBody : SL.awarenessBody}</div>
      </div></div>`;
  }

  // Flag list
  function flagGroup(tierKey, tierNum, label) {
    const arr = tierKey === 'tier1' ? tier1 : tierKey === 'tier2' ? tier2 : tier3;
    if (!arr.length) return '';
    const items = arr.map(f => `
      <div class="scr-flag-item">
        <span class="badge badge-tier${tierNum}" style="flex-shrink:0">${label}</span>
        ${esc(SCR_FLAG_LABELS[f] || f)}
      </div>`).join('');
    return `<div class="scr-flag-group">
      <div class="scr-flag-group-title">${label === 'Tier 1' ? SL.tier1Flags : label === 'Tier 2' ? SL.tier2Flags : SL.tier3Flags}</div>
      ${items}
    </div>`;
  }

  const flagsHtml = (tier1.length + tier2.length + tier3.length) === 0
    ? `<p class="text-sm" style="color:var(--c-text-muted);padding:8px 0">${SL.noFlags}</p>`
    : flagGroup('tier1', 1, 'Tier 1') + flagGroup('tier2', 2, 'Tier 2') + flagGroup('tier3', 3, 'Tier 3');

  const totalFlags = tier1.length + tier2.length + tier3.length;
  const now = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `
    <div class="card mb-4">
      <div class="card-header">
        <h3>${IC.shield}&nbsp; ${SL.scrResults}</h3>
        ${overallBadge}
      </div>
      <div class="card-body">
        ${alertHtml}
        <div class="divider"></div>
        <div class="section-label">${SL.safetyFlags} (${totalFlags} ${SL.total})</div>
        ${flagsHtml}
        <div class="divider"></div>
        <div class="section-label">${SL.summary}</div>
        <div class="scr-meta-grid">
          <div class="scr-meta-item"><div class="scr-meta-label">${SL.patient}</div><div class="scr-meta-value">${esc(consent.patient?.name)}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">${SL.modality}</div><div class="scr-meta-value">${esc(MODALITY_LABELS[consent.modality] || consent.modality)}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">${SL.screened}</div><div class="scr-meta-value">${now}</div></div>
          <div class="scr-meta-item"><div class="scr-meta-label">${SL.totalFlags}</div><div class="scr-meta-value">${totalFlags} (${tier1.length} T1 · ${tier2.length} T2 · ${tier3.length} T3)</div></div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-secondary btn-sm" onclick="mriScrBack()">${SL.back}</button>
        <button id="scr-submit-btn" class="btn btn-primary" onclick="mriScrSubmit()">
          ${SL.proceed}
        </button>
      </div>
    </div>`;
}

/* ── Main render function ─────────────────────────────────────  */
/* ═══════════════════════════════════════════════════════════════
   MAMMOGRAPHY SCREENING
═══════════════════════════════════════════════════════════════ */
function mmgScrAnswer(key, value) {
  gState.mmgScrState.answers[key] = value;
  render();
}

function renderMammographyScreening() {
  const consent = gState.mmgScrState.consent;
  const subtitle = consent
    ? esc(consent.patient?.name) + ' · Mammography'
    : '';
  const a = gState.mmgScrState.answers;
  const answered = a.age_40_plus !== undefined && a.pregnancy !== undefined;

  function yesno(key, name) {
    return `<div style="display:flex;gap:24px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px">
        <input type="radio" name="${name}" value="yes" ${a[key] === 'yes' ? 'checked' : ''}
          onchange="mmgScrAnswer('${key}','yes')" style="accent-color:var(--c-accent)"> Yes
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px">
        <input type="radio" name="${name}" value="no" ${a[key] === 'no' ? 'checked' : ''}
          onchange="mmgScrAnswer('${key}','no')" style="accent-color:var(--c-accent)"> No
      </label>
    </div>`;
  }

  return `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('new-consent')" style="margin-bottom:6px;margin-left:-6px">← Back</button>
        <div class="page-title">Mammography Safety Screening</div>
        <div class="page-subtitle">${subtitle}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>${IC.medical}&nbsp; Pre-Procedure Safety Check</h3></div>
      <div class="card-body">
        <p style="font-size:13.5px;color:var(--c-text-sec);margin-bottom:20px">
          Please answer all questions before proceeding.
        </p>

        <div class="mb-4" style="padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface)">
          <div style="font-size:14px;font-weight:500;color:var(--c-text);margin-bottom:10px">1. Is the patient 40 years of age or above?</div>
          ${yesno('age_40_plus', 'mmg-age')}
          ${a.age_40_plus === 'no' ? `<div class="alert alert-warning mt-3" style="font-size:13px">
            ${IC.warning}&nbsp; Routine mammography is recommended from age 40. This record will be flagged for radiologist review before proceeding.
          </div>` : ''}
        </div>

        <div class="mb-4" style="padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface)">
          <div style="font-size:14px;font-weight:500;color:var(--c-text);margin-bottom:10px">2. Is the patient currently pregnant, or is pregnancy possible?</div>
          ${yesno('pregnancy', 'mmg-pregnancy')}
          ${a.pregnancy === 'yes' ? `<div class="alert alert-danger mt-3" style="font-size:13px">
            ${IC.warning}&nbsp; <strong>Mammography is contraindicated in pregnancy.</strong> This record will be flagged for radiologist review before proceeding.
          </div>` : ''}
        </div>

      </div>
      <div class="card-footer">
        <button class="btn btn-ghost btn-sm" onclick="navigate('new-consent')">Cancel</button>
        <button class="btn btn-primary" onclick="mmgScrSubmit()" ${answered ? '' : 'disabled'}>
          Continue to Questionnaire →
        </button>
      </div>
    </div>`;
}

function mmgScrSubmit() {
  const consent = gState.mmgScrState.consent || state.pageData?.consent;
  if (!consent?.id) {
    toast('Session lost — please start a new consent from the beginning.', 'error');
    navigate('new-consent');
    return;
  }
  // Safety answers stored in gState.mmgScrState.answers; proceed to questionnaire
  navigate('mammography-questionnaire', { consent }, { skipHistory: false });
}

/* ═══════════════════════════════════════════════════════════════
   MAMMOGRAPHY QUESTIONNAIRE (patient info — step 2)
═══════════════════════════════════════════════════════════════ */
const MMG_SECTION_KEYS = [
  ['hormone_drugs', 'family_history'],
  ['previous_surgery', 'mastectomy', 'breast_implant', 'nipple_discharge', 'breast_tenderness', 'breast_lump_pain'],
  ['caffeine', 'breastfeeding', 'oral_contraceptive', 'hrt', 'previous_imaging'],
  ['menopausal', 'payment_method', 'referral_source']
];

function mmgQuestAnswer(key, value) {
  gState.mmgScrState.answers[key] = value;
  render();
}

function mmgQuestToggleRelative(rel) {
  const rels = gState.mmgScrState.answers.family_relatives || [];
  const i = rels.indexOf(rel);
  if (i >= 0) rels.splice(i, 1); else rels.push(rel);
  gState.mmgScrState.answers.family_relatives = [...rels];
}

function mmgQuestBack() {
  if (gState.mmgScrState.stepIdx > 0) {
    gState.mmgScrState.stepIdx--;
    render();
  } else {
    navigate('mammography-screening', { consent: gState.mmgScrState.consent });
  }
}

function mmgQuestNext() {
  const reqKeys = MMG_SECTION_KEYS[gState.mmgScrState.stepIdx] || [];
  const missing = reqKeys.filter(k => gState.mmgScrState.answers[k] === undefined);
  if (missing.length > 0) {
    toast('Please complete all required fields.', 'warning');
    return;
  }

  if (gState.mmgScrState.stepIdx < MMG_SECTION_KEYS.length - 1) {
    gState.mmgScrState.stepIdx++;
    render();
  } else {
    mmgQuestSubmit();
  }
}

function renderMammographyQuestionnaire() {
  const consent = gState.mmgScrState.consent || state.pageData?.consent;
  const subtitle = consent
    ? esc(consent.patient?.name) + ' · Mammography Questionnaire'
    : '';
  const a = gState.mmgScrState.answers;
  const rels = a.family_relatives || [];
  const stepIdx = gState.mmgScrState.stepIdx || 0;

  const reqKeys = MMG_SECTION_KEYS[stepIdx] || [];
  const sectionDone = reqKeys.every(k => a[k] !== undefined);
  const isLast = stepIdx === MMG_SECTION_KEYS.length - 1;

  function yesno(key) {
    return `<div style="display:flex;gap:24px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px">
        <input type="radio" name="mmgq-${key}" value="yes" ${a[key] === 'yes' ? 'checked' : ''}
          onchange="mmgQuestAnswer('${key}','yes')" style="accent-color:var(--c-accent)"> Yes
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px">
        <input type="radio" name="mmgq-${key}" value="no" ${a[key] === 'no' ? 'checked' : ''}
          onchange="mmgQuestAnswer('${key}','no')" style="accent-color:var(--c-accent)"> No
      </label>
    </div>`;
  }

  function sideOpts(key, opts) {
    return `<div style="display:flex;gap:16px;flex-wrap:wrap">
      ${opts.map(([v, l]) => `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px">
        <input type="radio" name="mmgq-${key}" value="${v}" ${a[key] === v ? 'checked' : ''}
          onchange="mmgQuestAnswer('${key}','${v}')" style="accent-color:var(--c-accent)"> ${l}
      </label>`).join('')}
    </div>`;
  }

  function qBlock(label, content, required = true) {
    return `<div class="mb-4" style="padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface)">
      <div style="font-size:14px;font-weight:500;color:var(--c-text);margin-bottom:10px">${label}${required ? ' <span style="color:var(--c-danger);font-size:11px">*</span>' : ''}</div>
      ${content}
    </div>`;
  }

  function secHead(title) {
    return `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--c-text-sec);margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--c-border)">${title}</div>`;
  }

  function textIn(key, placeholder = '', type = 'text') {
    return `<input type="${type}" value="${esc(a[key] || '')}" oninput="gState.mmgScrState.answers['${key}']=this.value"
      placeholder="${placeholder}"
      style="width:100%;padding:8px 10px;border:1px solid var(--c-border);border-radius:6px;font-size:13.5px;background:var(--c-bg);color:var(--c-text)">`;
  }

  function textAr(key, placeholder = '') {
    return `<textarea rows="2" oninput="gState.mmgScrState.answers['${key}']=this.value"
      placeholder="${placeholder}"
      style="width:100%;padding:8px 10px;border:1px solid var(--c-border);border-radius:6px;font-size:13.5px;background:var(--c-bg);color:var(--c-text);resize:vertical">${esc(a[key] || '')}</textarea>`;
  }

  const sectionsHtml = [
    // Step 0
    `
        ${secHead('Gynaecological History')}
        ${qBlock('Last Menstrual Period (LMP)', textIn('lmp_date', 'DD/MM/YYYY'), false)}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" class="mb-4">
          <div style="padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface)">
            <div style="font-size:14px;font-weight:500;color:var(--c-text);margin-bottom:10px">Age at first menstrual period</div>
            ${textIn('menarche_age', 'e.g. 13', 'number')}
          </div>
          <div style="padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface)">
            <div style="font-size:14px;font-weight:500;color:var(--c-text);margin-bottom:10px">Age at first pregnancy <span style="font-weight:400;color:var(--c-text-sec)">(if applicable)</span></div>
            ${textIn('first_pregnancy_age', 'e.g. 24 or N/A')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" class="mb-4">
          <div style="padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface)">
            <div style="font-size:14px;font-weight:500;color:var(--c-text);margin-bottom:10px">Number of pregnancies</div>
            ${textIn('num_pregnancies', 'e.g. 2', 'number')}
          </div>
          <div style="padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface)">
            <div style="font-size:14px;font-weight:500;color:var(--c-text);margin-bottom:10px">Number of live births</div>
            ${textIn('num_live_births', 'e.g. 2', 'number')}
          </div>
        </div>

        ${qBlock('Hormone drugs taken?', `
          ${yesno('hormone_drugs')}
          ${a.hormone_drugs === 'yes' ? `<div style="margin-top:10px">${textIn('hormone_drugs_details', 'Specify drug(s) and duration…')}</div>` : ''}
        `)}

        ${secHead('Family History')}

        ${qBlock('Family history of breast cancer?', `
          ${yesno('family_history')}
          ${a.family_history === 'yes' ? `
            <div style="margin-top:10px">
              <div style="font-size:13px;color:var(--c-text-sec);margin-bottom:8px">Which relatives? (select all that apply)</div>
              <div style="display:flex;flex-wrap:wrap;gap:12px">
                ${['Mother', 'Sister', 'Daughter', 'Grandmother', 'Cousin', 'Aunty'].map(r => `
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13.5px">
                    <input type="checkbox" ${rels.includes(r) ? 'checked' : ''} onchange="mmgQuestToggleRelative('${r}')" style="accent-color:var(--c-accent)"> ${r}
                  </label>`).join('')}
              </div>
            </div>` : ''}
        `)}
    `,
    // Step 1
    `
        ${secHead('Breast History')}
        ${qBlock('Previous breast surgery?', `
          ${yesno('previous_surgery')}
          ${a.previous_surgery === 'yes' ? `
            <div style="margin-top:10px">
              <div style="font-size:13px;color:var(--c-text-sec);margin-bottom:6px">Which breast?</div>
              ${sideOpts('surgery_side', [['right', 'Right'], ['left', 'Left'], ['both', 'Both']])}
              <div style="margin-top:10px">${textAr('surgery_details', 'Describe the surgery and date…')}</div>
            </div>` : ''}
        `)}

        ${qBlock('Mastectomy', sideOpts('mastectomy', [['none', 'None'], ['right', 'Right'], ['left', 'Left'], ['both', 'Both']]))}
        ${qBlock('Date of biopsy <span style="font-weight:400;color:var(--c-text-sec)">(if applicable)</span>', textIn('biopsy_date', 'DD/MM/YYYY'), false)}
        ${qBlock('Breast implant present?', yesno('breast_implant'))}

        ${secHead('Current Breast Symptoms')}
        ${qBlock('Current breast complaints', textAr('breast_complaints', 'Describe any current complaints…'), false)}
        ${qBlock('Nipple discharge', sideOpts('nipple_discharge', [['none', 'None'], ['yes_right', 'Yes – Right'], ['yes_left', 'Yes – Left'], ['yes_both', 'Yes – Both']]))}
        ${qBlock('Breast tenderness', sideOpts('breast_tenderness', [['none', 'None'], ['yes_right', 'Yes – Right'], ['yes_left', 'Yes – Left'], ['yes_both', 'Yes – Both']]))}
        ${qBlock('Breast lump / pain', sideOpts('breast_lump_pain', [['none', 'None'], ['yes_right', 'Yes – Right'], ['yes_left', 'Yes – Left'], ['yes_both', 'Yes – Both']]))}
    `,
    // Step 2
    `
        ${secHead('Lifestyle & Medications')}
        ${qBlock('Caffeine consumption?', `
          ${yesno('caffeine')}
          ${a.caffeine === 'yes' ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
              <div>
                <div style="font-size:12px;color:var(--c-text-sec);margin-bottom:4px">Last caffeine intake date</div>
                ${textIn('caffeine_last_date', 'DD/MM/YYYY')}
              </div>
              <div>
                <div style="font-size:12px;color:var(--c-text-sec);margin-bottom:4px">Daily caffeine intake / dietary history</div>
                ${textIn('caffeine_diet', 'e.g. 3 cups/day')}
              </div>
            </div>` : ''}
        `)}

        ${qBlock('Currently breastfeeding?', `
          ${yesno('breastfeeding')}
          ${a.breastfeeding === 'yes' ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
              <div>
                <div style="font-size:12px;color:var(--c-text-sec);margin-bottom:4px">Duration</div>
                ${textIn('breastfeeding_duration', 'e.g. 6 months')}
              </div>
              <div>
                <div style="font-size:12px;color:var(--c-text-sec);margin-bottom:4px">Last breastfeeding date</div>
                ${textIn('breastfeeding_last_date', 'DD/MM/YYYY')}
              </div>
            </div>` : ''}
        `)}

        ${qBlock('Oral contraceptive pills (OCP)?', yesno('oral_contraceptive'))}
        ${qBlock('Hormone replacement therapy (HRT)?', yesno('hrt'))}

        ${secHead('Previous Breast Imaging')}
        ${qBlock('Previous breast mammogram, MRI, or ultrasound?', `
          ${yesno('previous_imaging')}
          ${a.previous_imaging === 'yes' ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
              <div>
                <div style="font-size:12px;color:var(--c-text-sec);margin-bottom:4px">Date of previous imaging</div>
                ${textIn('imaging_date', 'DD/MM/YYYY')}
              </div>
              <div>
                <div style="font-size:12px;color:var(--c-text-sec);margin-bottom:4px">Location / Institution</div>
                ${textIn('imaging_location', 'e.g. LASUTH')}
              </div>
            </div>
            <div style="margin-top:10px">
              <div style="font-size:12px;color:var(--c-text-sec);margin-bottom:4px">Summary of previous report</div>
              ${textAr('imaging_report', 'Describe key findings…')}
            </div>` : ''}
        `)}
    `,
    // Step 3
    `
        ${secHead('Menopausal Status')}
        ${qBlock('Post-menopausal?', yesno('menopausal'))}

        ${secHead('Administrative')}
        ${qBlock('Payment method', sideOpts('payment_method', [['insurance', 'Insurance'], ['out_of_pocket', 'Out-of-Pocket']]))}
        ${qBlock('Referral source', sideOpts('referral_source', [['lasuth', 'LASUTH'], ['outside_hospital', 'Outside Hospital']]))}
        ${qBlock('Reason for referral by doctor', textAr('referral_reason', 'State the clinical indication for this examination…'), false)}
    `
  ];

  const pct = Math.round(((stepIdx + 1) / MMG_SECTION_KEYS.length) * 100);

  const progressBar = `
    <div class="scr-progress-wrap">
      <div class="scr-step-label">
        <span>Questionnaire Section</span>
        <span>Step ${stepIdx + 1} of ${MMG_SECTION_KEYS.length}</span>
      </div>
      <div class="scr-progress-bar"><div class="scr-progress-fill" style="width:${pct}%"></div></div>
    </div>`;

  return `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="mmgQuestBack()" style="margin-bottom:6px;margin-left:-6px">← Back</button>
        <div class="page-title">Mammography Patient Questionnaire</div>
        <div class="page-subtitle">${subtitle}</div>
      </div>
    </div>
    ${progressBar}
    <div class="card">
      <div class="card-header"><h3>${IC.medical}&nbsp; Patient Information — Mammography</h3></div>
      <div class="card-body">
        <p style="font-size:13.5px;color:var(--c-text-sec);margin-bottom:4px">
          Please complete all required fields <span style="color:var(--c-danger)">*</span>.
        </p>

        ${sectionsHtml[stepIdx]}

      </div>
      <div class="card-footer" style="padding:16px 24px;display:flex;justify-content:space-between">
        ${stepIdx === 0
      ? '<div></div>'
      : '<button class="btn btn-secondary btn-sm" onclick="mmgQuestBack()">← Previous</button>'}
        ${isLast
      ? `<button class="btn btn-primary" onclick="mmgQuestNext()" ${sectionDone ? '' : 'disabled'}>Proceed to Consent Declaration →</button>`
      : `<button class="btn btn-primary" onclick="mmgQuestNext()" ${sectionDone ? '' : 'disabled'}>Next →</button>`
    }
      </div>
    </div>`;
}

async function mmgQuestSubmit() {
  const consent = gState.mmgScrState.consent || state.pageData?.consent;
  if (!consent?.id) {
    toast('Session lost — please start a new consent from the beginning.', 'error');
    navigate('new-consent');
    return;
  }
  const a = gState.mmgScrState.answers;
  const tier1 = a.pregnancy === 'yes' ? ['pregnancy'] : [];
  const tier2 = [
    ...(a.age_40_plus === 'no' ? ['age_under_40'] : []),
    ...(a.breast_implant === 'yes' ? ['breast_implant'] : []),
    ...(a.previous_surgery === 'yes' ? ['previous_surgery'] : []),
    ...(['right', 'left', 'both'].includes(a.mastectomy) ? ['mastectomy'] : []),
  ];

  const btn = document.querySelector('.card-footer .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>&nbsp;Saving…`; }

  try {
    const updated = await api('PUT', `/consents/${consent.id}/screening`, {
      screening: a,
      tierFlags: { tier1, tier2, tier3: [] },
    });
    if (!updated) return;
    gState.mmgScrState.consent = null;
    if (updated.status === 'flagged_tier1' || updated.status === 'pending_review') {
      navigate('record-detail', { id: updated.id });
      toast('Safety flags detected — a radiologist must review and approve before the patient can sign.', 'warning');
    } else {
      navigate('consent-declaration', { consent: updated });
    }
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Consent Declaration →'; }
  }
}

/* ═══════════════════════════════════════════════════════════════
   SAFETY SCREENING (non-MRI modalities)
═══════════════════════════════════════════════════════════════ */
const SAFETY_QUESTIONS = [
  { key: 'pregnancy', label: 'Is the patient pregnant, or is pregnancy possible?' },
  { key: 'renal_impairment', label: 'Does the patient have kidney disease, impaired renal function, or elevated creatinine?' },
  { key: 'contrast_reaction', label: 'Has the patient had a previous adverse reaction to contrast media or iodine?' },
  { key: 'cardiac_implant', label: 'Does the patient have a pacemaker, ICD, or other cardiac electronic implant?' },
  { key: 'metallic_implant', label: 'Does the patient have any other metallic or electronic implants (e.g. cochlear implant, neurostimulator, insulin pump)?' },
];

function safetyScrBack() {
  if (gState.safetyScrState.stepIdx > 0) {
    gState.safetyScrState.stepIdx--;
    render();
  } else {
    navigate('new-consent');
  }
}

function safetyScrNext() {
  const currentKey = SAFETY_QUESTIONS[gState.safetyScrState.stepIdx].key;
  if (!gState.safetyScrState.answers[currentKey]) {
    toast('Please answer this question to proceed.', 'warning');
    return;
  }

  if (gState.safetyScrState.stepIdx < SAFETY_QUESTIONS.length - 1) {
    gState.safetyScrState.stepIdx++;
    render();
  } else {
    safetyScrSubmit();
  }
}

function renderSafetyScreening() {
  const consent = gState.safetyScrState.consent;
  const subtitle = consent
    ? esc(consent.patient?.name) + ' · ' + esc(MODALITY_LABELS[consent.modality] || consent.modality)
    : '';
  const ans = gState.safetyScrState.answers;

  const stepIdx = gState.safetyScrState.stepIdx || 0;
  const q = SAFETY_QUESTIONS[stepIdx];
  const isLast = stepIdx === SAFETY_QUESTIONS.length - 1;
  const hasAnswer = ans[q.key] !== undefined;

  const pct = Math.round(((stepIdx + 1) / SAFETY_QUESTIONS.length) * 100);

  const progressBar = `
    <div class="scr-progress-wrap">
      <div class="scr-step-label">
        <span>Safety Question</span>
        <span>Step ${stepIdx + 1} of ${SAFETY_QUESTIONS.length}</span>
      </div>
      <div class="scr-progress-bar"><div class="scr-progress-fill" style="width:${pct}%"></div></div>
    </div>`;

  return `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="safetyScrBack()"
          style="margin-bottom:6px;margin-left:-6px">← Back</button>
        <div class="page-title">Safety Screening</div>
        <div class="page-subtitle">${subtitle}</div>
      </div>
    </div>
    ${progressBar}
    <div class="card">
      <div class="card-header"><h3>${IC.medical}&nbsp; Pre-Procedure Safety Check</h3></div>
      <div class="card-body" style="padding:28px">
        <div class="scr-question">${stepIdx + 1}. ${esc(q.label)}</div>
        <div class="scr-question-hint">Any <strong>Yes</strong> answer will be flagged for radiologist review before the procedure proceeds.</div>
        <div class="scr-choice-grid two-col" style="margin-top:20px;margin-bottom:12px">
          <button class="scr-choice-btn ${ans[q.key] === 'yes' ? 'selected' : ''}" onclick="safetyScrAnswer('${q.key}','yes')">
            <span class="scr-choice-label">Yes</span>
          </button>
          <button class="scr-choice-btn ${ans[q.key] === 'no' ? 'selected' : ''}" onclick="safetyScrAnswer('${q.key}','no')">
            <span class="scr-choice-label">No</span>
          </button>
        </div>
      </div>
      <div class="card-footer" style="padding:16px 24px;display:flex;justify-content:space-between">
        ${stepIdx === 0
      ? '<div></div>'
      : '<button class="btn btn-secondary btn-sm" onclick="safetyScrBack()">← Previous</button>'}
        ${isLast
      ? `<button class="btn btn-primary" onclick="safetyScrNext()" ${hasAnswer ? '' : 'disabled'}>Proceed to Consent Declaration →</button>`
      : `<button class="btn btn-primary" onclick="safetyScrNext()" ${hasAnswer ? '' : 'disabled'}>Next →</button>`
    }
      </div>
    </div>`;
}

function safetyScrAnswer(key, value) {
  gState.safetyScrState.answers[key] = value;
  render();
}

async function safetyScrSubmit() {
  const consent = gState.safetyScrState.consent || state.pageData?.consent;
  if (!consent?.id) {
    toast('Session lost — please start a new consent from the beginning.', 'error');
    navigate('new-consent');
    return;
  }
  const ans = gState.safetyScrState.answers;

  const tier2 = SAFETY_QUESTIONS
    .filter(q => ans[q.key] === 'yes')
    .map(q => q.key);

  const btn = document.querySelector('.card-footer .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>&nbsp;Saving…`; }

  try {
    const updated = await api('PUT', `/consents/${consent.id}/screening`, {
      screening: ans,
      tierFlags: { tier1: [], tier2, tier3: [] },
    });
    if (!updated) return;
    gState.safetyScrState.consent = null;
    if (updated.status === 'flagged_tier1' || updated.status === 'pending_review') {
      navigate('record-detail', { id: updated.id });
      toast('Safety flags detected — a radiologist must review and approve before the patient can sign.', 'warning');
    } else {
      navigate('consent-declaration', { consent: updated });
    }
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Consent Declaration →'; }
  }
}

function renderMriScreening() {
  const consent = state.pageData.consent;
  mriScrInit(consent);

  const { steps, stepIdx } = gState.mriScrState;
  const isResults = stepIdx >= steps.length;

  const subtitle = consent
    ? esc(consent.patient?.name) + ' · ' + esc(MODALITY_LABELS[consent.modality] || consent.modality)
    : 'New session';

  const backTarget = isResults ? 'mriScrBack()' : (stepIdx === 0 ? "navigate('new-consent')" : 'mriScrBack()');

  const header = `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="${backTarget}"
          style="margin-bottom:6px;margin-left:-6px">← Back</button>
        <div class="page-title">MRI Safety Screening</div>
        <div class="page-subtitle">${subtitle}</div>
      </div>
    </div>`;

  const body = isResults
    ? renderMriResults()
    : renderMriStep(steps[stepIdx], stepIdx + 1, steps.length + 1);

  return header + body;
}

/* ── Post-submit destination placeholders (replaced in later steps) ── */
function renderMriScreeningPlaceholder() {
  const c = state.pageData.consent;
  return `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('new-consent')"
          style="margin-bottom:6px;margin-left:-6px">← Back</button>
        <div class="page-title">MRI Safety Screening</div>
        <div class="page-subtitle">${c ? esc(c.patient?.name) + ' · ' + esc(MODALITY_LABELS[c.modality] || c.modality) : 'New session'}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-body">
        <div class="empty-state">
          ${IC.shield}
          <h3>MRI Safety Screening</h3>
          <p>The 12-domain screening questionnaire will be built in the next step.</p>
          ${c ? `<p class="mt-2 text-sm"><strong>Session ID:</strong> ${esc(c.id)}</p>` : ''}
        </div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   CONSENT DECLARATION — STAGE 1
═══════════════════════════════════════════════════════════════ */

const MODALITY_RISKS = {
  mri_without_contrast: [
    'The scanner produces loud repetitive knocking noises throughout the scan — ear protection will be provided.',
    'The strong magnetic field can interact with metallic implants — this has been assessed during your safety screening.',
    'Some patients experience mild dizziness or a feeling of warmth. If at any point you feel unwell, you can alert staff immediately.',
    'MRI does not use ionising radiation.',
  ],
  mri_with_gadolinium: [
    'The scanner produces loud repetitive knocking noises throughout the scan — ear protection will be provided.',
    'The strong magnetic field can interact with metallic implants — this has been assessed during your safety screening.',
    'Gadolinium contrast will be given by intravenous injection. Rare risks include mild allergic reaction (nausea, hives), and — very rarely — a severe reaction. Staff are trained to respond immediately.',
    'In patients with severely reduced kidney function, gadolinium may cause a rare condition called NSF — your renal function has been checked during screening.',
    'Some patients experience mild dizziness or claustrophobia. You may alert staff at any time.',
    'MRI does not use ionising radiation.',
  ],
  ct_without_contrast: [
    'CT uses a low dose of ionising X-ray radiation. The diagnostic benefit of the scan outweighs this small risk.',
    'You will be asked to remain still and may be asked to hold your breath briefly during the scan.',
    'Some patients experience mild discomfort lying on the scan table. Please inform staff of any pain or mobility issues.',
  ],
  ct_with_iv_contrast: [
    'CT uses a low dose of ionising X-ray radiation. The diagnostic benefit outweighs this small risk.',
    'Iodinated contrast will be given by intravenous injection. Common side effects include a warm flushing sensation and a metallic taste — both are brief and harmless.',
    'Rare risks include allergic reaction (hives, nausea) and, very rarely, anaphylaxis. Staff are trained and equipped to respond.',
    'Contrast may transiently affect kidney function — your renal history has been checked.',
    'You will be asked to remain still and may be asked to hold your breath briefly.',
  ],
  mammography: [
    'Mammography uses a very low dose of ionising X-ray radiation specifically calibrated for breast imaging.',
    'Breast compression is applied during the scan to improve image quality and minimise radiation dose. This causes brief, mild discomfort — please tell the radiographer if it becomes painful.',
    'The procedure typically takes 10–15 minutes. You will be asked to remove clothing from the waist up.',
    'Mammography detects abnormalities but is not 100% conclusive — further imaging or tests may be recommended.',
  ],
};

const MODALITY_RISKS_YO = {
  mri_without_contrast: [
    'Ẹ̀rọ àyẹ̀wò náà máa ń fún ariwo gbígbóná-ún tí ó tún ń pariwo — a ó fún yín ní ohun ìdáàbòbò etí.',
    'Agbára oofa tí ó lágbára lè ní ipa lórí àwọn irin tí wọ́n fi sí ara yín — a ti ṣe àyẹ̀wò rẹ̀ nígbà àyẹ̀wò ààbò.',
    'Àwọn aláìsàn kan lè ní ìrírí ìyí kékeré tàbí ìgbóná-ún. Bí o bá nímọ̀lára àìsàn kankan, jọ̀wọ́ sọ fún àwọn oṣiṣẹ́ lẹ́sẹ̀kẹsẹ̀.',
    'MRI kò lo ìtànṣán tí ó léwu (ionising radiation).',
  ],
  mri_with_gadolinium: [
    'Ẹ̀rọ àyẹ̀wò náà máa ń fún ariwo gbígbóná-ún — a ó fún yín ní ohun ìdáàbòbò etí.',
    'Agbára oofa tí ó lágbára lè ní ipa lórí àwọn irin tí wọ́n fi sí ara yín — a ti ṣe àyẹ̀wò rẹ̀.',
    'A ó fi abẹ́rẹ́ omi ìfohùn-hàn (gadolinium contrast) sínú iṣọn yín. Ewu tí kò wọ́pọ̀ pẹ̀lú àléfọ kékeré (ìrora, ẹ̀sùn); àti — ní ṣọ̀wọ́n gan-an — ìhùwàsí líle. A ti kọ́ àwọn oṣiṣẹ́ láti dahùn lẹ́sẹ̀kẹsẹ̀.',
    'Fún àwọn tí kíndìnrín wọn kò ṣiṣẹ́ dáadáa, gadolinium lè fa àìsàn tí a ń pè ní NSF — a ti ṣàyẹ̀wò iṣẹ́ kíndìnrín yín.',
    'Àwọn aláìsàn kan lè ní ìrírí ìyí kékeré tàbí ìpayà. Ẹ lè sọ fún àwọn oṣiṣẹ́ nígbàkigbà.',
    'MRI kò lo ìtànṣán tí ó léwu.',
  ],
  ct_without_contrast: [
    'CT lo ìtànṣán X-ray kékeré. Àǹfààní àyẹ̀wò náà pọ̀ ju ewu kékeré yìí lọ.',
    'A ó béèrè pé kí ẹ dúró lójú kan, a sì lè béèrè pé kí ẹ dá ẹ̀mí dúró fún ìgbà díẹ̀.',
    'Àwọn aláìsàn kan lè ní ìrírí àìbalẹ̀ díẹ̀ lórí tábìlì àyẹ̀wò. Jọ̀wọ́ sọ fún àwọn oṣiṣẹ́ nípa ìrora tàbí ìṣòro gbígbé.',
  ],
  ct_with_iv_contrast: [
    'CT lo ìtànṣán X-ray kékeré. Àǹfààní àyẹ̀wò náà pọ̀ ju ewu yìí lọ.',
    'A ó fi abẹ́rẹ́ omi ìfohùn-hàn (iodinated contrast) sínú iṣọn yín. Àwọn ipa tí ó wọ́pọ̀ ni ìgbóná-ún kékeré àti adùn irin — gbogbo rẹ̀ máa ń parí láìpẹ́.',
    'Ewu tí kò wọ́pọ̀ pẹ̀lú àléfọ (ẹ̀sùn, ríru) àti, ní ṣọ̀wọ́n gan-an, anaphylaxis. A ti kọ́ àwọn oṣiṣẹ́ àti pé wọ́n ti múra sílẹ̀.',
    'Omi ìfohùn-hàn lè kan iṣẹ́ kíndìnrín fún àkókò díẹ̀ — a ti ṣàyẹ̀wò ìtàn ìlera kíndìnrín yín.',
    'A ó béèrè pé kí ẹ dúró lójú kan, a sì lè béèrè pé kí ẹ dá ẹ̀mí dúró fún ìgbà díẹ̀.',
  ],
  mammography: [
    'Mammography lo ìtànṣán X-ray kékeré tí a ti ṣètò fún àwòrán ọ̀yàn.',
    'A ó fún àmì tẹ́tẹ́ sí ọ̀yàn nígbà àyẹ̀wò láti mú àwòrán dára sí àti láti dín ìtànṣán kù. Èyí lè fa àìbalẹ̀ díẹ̀ — jọ̀wọ́ sọ fún adọ̀gba bí ó bá ń dùn yín.',
    'Ìlànà yìí sábà máa ń gba ìṣẹ́jú mẹ́wàá sí mẹ́ẹ̀ẹ́dógún. A ó béèrè pé kí ẹ bọ́ aṣọ lágbègbè.',
    'Mammography máa ń ṣàwárí àjẹmọ́-ara ṣùgbọ́n kì í ṣe pé ó lè rí gbogbo nǹkan — a lè dábàá àwọn àyẹ̀wò mìíràn.',
  ],
};

const CONSENT_LABELS = {
  en: {
    procInfo: 'Procedure Information',
    risksTitle: 'Risks &amp; What to Expect',
    langTitle: 'Language / Lugha / Asụsụ / Harshe',
    consentStatement: 'Consent Statement',
    patientSig: 'Patient Signature',
    signature: 'Signature',
    drawHint: 'Sign using mouse, finger or stylus',
    printName: 'Print your full name',
    nameHint: 'Both a drawn signature and printed name are required.',
    guardianHint: '(Parent or Guardian on behalf of patient under 16 years of age)',
    dateTime: 'Date &amp; Time',
    witnessedBy: 'Witnessed By',
    witnessPlaceholder: 'Staff name if present during signing',
    cancel: 'Cancel',
    submit: 'Submit Consent &amp; Sign',
    uploadClick: 'Click to select a signature image',
    uploadHint: 'JPG, PNG or GIF accepted',
  },
  yo: {
    procInfo: 'Àlàyé Ìlànà Ìṣègùn',
    risksTitle: 'Ewu àti Ohun tí ó lè Ṣẹlẹ̀',
    langTitle: 'Èdè / Language',
    consentStatement: 'Ọ̀rọ̀ Ìfohùnsí',
    patientSig: 'Ìbuwọ́lù Aláìsàn',
    signature: 'Ìbuwọ́lù',
    drawHint: 'Fi ọwọ́ sí nípa lílo ẹ̀rọ aṣàmì, ìka tàbí pen',
    printName: 'Kọ orúkọ rẹ ní kíkún',
    nameHint: 'Ìbuwọ́lù àti orúkọ kíkún ni a nílò méjèèjì.',
    guardianHint: '(Òbí tàbí Alábòójútó fún aláìsàn tí kò tíì pé ọdún mẹ́rìndínlógún)',
    dateTime: 'Ọjọ́ àti Àkókò',
    witnessedBy: 'Ẹlẹ́rìí',
    witnessPlaceholder: 'Orúkọ oṣiṣẹ́ bí ẹnìkan bá wà nígbà ìbuwọ́lù',
    cancel: 'Fagílé',
    submit: 'Fọwọ́ sí Ìfohùnsí',
    uploadClick: 'Tẹ láti yan àwòrán ìbuwọ́lù',
    uploadHint: 'JPG, PNG tàbí GIF ni a ń gbà',
  },
};

const CONSENT_TEXT = {
  en: 'By signing below you acknowledge that you have answered the questions to the best of your knowledge. You have had the risks/benefits of the scan explained to you and consent to the examination.',
  yo: 'Nípa fífi ọwọ́ sí ísàlẹ̀ yìí, o jẹ́wọ́ pé o ti dáhùn àwọn ìbéèrè yìí gẹ́gẹ́ bí ìmọ̀ rẹ ṣe tó. Wọ́n ti ṣàlàyé àwọn ewu àti àǹfààní àyẹ̀wò yìí fún ọ, o sì gbà láti ṣe àyẹ̀wò náà.',
  ig: 'By signing below you acknowledge that you have answered the questions to the best of your knowledge. You have had the risks/benefits of the scan explained to you and consent to the examination.',
  ha: 'By signing below you acknowledge that you have answered the questions to the best of your knowledge. You have had the risks/benefits of the scan explained to you and consent to the examination.',
};

function consentDeclInit(consent) {
  if (gState.consentDeclState.consent?.id === consent.id) return;
  gState.consentDeclState = {
    consent,
    lang: consent.language || 'en',
    signed: false,
    signedResult: null,
  };
  gState.sigMode = 'draw';
  gState.sigUploadedDataUrl = null;
  gState.sigPadInstance = null;
  gState.sigTopazStatus = 'idle';
  gState.sigTopazPreviewUrl = null;
}

function consentDeclSetLang(lang) {
  gState.consentDeclState.lang = lang;
  render();
}

function initSigPad() {
  const canvas = document.getElementById('cdecl-sigpad');
  if (!canvas || typeof SignaturePad === 'undefined') return;
  if (gState.sigPadInstance) gState.sigPadInstance.off(); // clean up previous instance
  // Ensure critical styles are applied inline (Vite CSS may load async)
  canvas.style.touchAction = 'none';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.cursor = 'crosshair';
  if (!canvas.style.height) canvas.style.height = '160px';
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = (canvas.offsetWidth || 600) * ratio;
  canvas.height = (canvas.offsetHeight || 160) * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  gState.sigPadInstance = new SignaturePad(canvas, {
    penColor: '#0F172A', backgroundColor: '#ffffff', minWidth: 0.5, maxWidth: 2.5,
  });
  gState.sigPadInstance.addEventListener('endStroke', () => {
    canvas.closest('.sig-pad-wrap')?.classList.toggle('sig-pad-filled', !gState.sigPadInstance.isEmpty());
    consentDeclCheckSubmit();
  });
}

function consentDeclClearSig() {
  if (gState.sigPadInstance) gState.sigPadInstance.clear();
  document.getElementById('cdecl-sigpad')?.closest('.sig-pad-wrap')?.classList.remove('sig-pad-filled');
  consentDeclCheckSubmit();
}

function sigSwitchMode(mode) {
  gState.sigMode = mode;
  document.getElementById('sig-draw-pane')?.style.setProperty('display', mode === 'draw' ? '' : 'none');
  document.getElementById('sig-upload-pane')?.style.setProperty('display', mode === 'upload' ? '' : 'none');
  document.getElementById('sig-topaz-pane')?.style.setProperty('display', mode === 'topaz' ? '' : 'none');
  document.getElementById('sig-tab-draw')?.classList.toggle('sig-tab-active', mode === 'draw');
  document.getElementById('sig-tab-upload')?.classList.toggle('sig-tab-active', mode === 'upload');
  document.getElementById('sig-tab-topaz')?.classList.toggle('sig-tab-active', mode === 'topaz');
  if (mode === 'draw') initSigPad(); // re-init now that canvas is visible
  if (mode === 'topaz') sigLoadTopaz();
  consentDeclCheckSubmit();
}

function sigHandleUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    gState.sigUploadedDataUrl = e.target.result;
    const preview = document.getElementById('sig-upload-preview');
    if (preview) { preview.src = gState.sigUploadedDataUrl; preview.style.display = 'block'; }
    consentDeclCheckSubmit();
  };
  reader.readAsDataURL(file);
}

// ── Topaz SigPlusExtLite helpers ─────────────────────────────────────────────
function sigTopazRenderStatus(status, msg) {
  gState.sigTopazStatus = status;
  const el = document.getElementById('sig-topaz-status-text');
  const dot = document.getElementById('sig-topaz-dot');
  if (el) el.textContent = msg;
  if (dot) {
    dot.className = 'sig-topaz-dot';
    if (status === 'capturing') dot.classList.add('dot-capturing');
    if (status === 'captured') dot.classList.add('dot-captured');
    if (status === 'error') dot.classList.add('dot-error');
  }
}

function sigLoadTopaz() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    sigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  sigTopazRenderStatus('idle', 'Extension ready — click "Sign on Pad" to capture.');
}

function sigTopazSign() {
  const installed = document.documentElement.getAttribute('SigPlusExtLiteExtension-installed');
  if (!installed) {
    sigTopazRenderStatus('error', 'SigPlusExtLite extension not detected. Install it in Chrome and reload.');
    return;
  }
  sigTopazRenderStatus('capturing', 'Sign on the Topaz pad now…');

  const msgEl = document.createElement('MyExtensionDataElement');
  msgEl.setAttribute('messageAttribute', JSON.stringify({
    firstName: '', lastName: '', eMail: '', location: '',
    imageFormat: 1, imageX: 500, imageY: 100,
    imageTransparency: false, imageScaling: false,
    maxUpScalePercent: 0.0, rawDataFormat: 'ENC', minSigPoints: 25
  }));
  document.documentElement.appendChild(msgEl);

  top.document.addEventListener('SignResponse', function handler(e) {
    top.document.removeEventListener('SignResponse', handler);
    msgEl.remove();
    const obj = JSON.parse(e.target.getAttribute('msgAttribute') || '{}');
    if (!obj.isSigned) {
      sigTopazRenderStatus('idle', 'Signature cancelled — click "Sign on Pad" to try again.');
      return;
    }
    gState.sigTopazPreviewUrl = 'data:image/png;base64,' + obj.imageData;
    const preview = document.getElementById('sig-topaz-preview');
    if (preview) { preview.src = gState.sigTopazPreviewUrl; preview.style.display = 'block'; }
    sigTopazRenderStatus('captured', 'Signature captured successfully.');
    consentDeclCheckSubmit();
  }, false);

  const evt = document.createEvent('Events');
  evt.initEvent('SignStartEvent', true, false);
  msgEl.dispatchEvent(evt);
}

function sigTopazClear() {
  gState.sigTopazPreviewUrl = null;
  const preview = document.getElementById('sig-topaz-preview');
  if (preview) preview.style.display = 'none';
  sigTopazRenderStatus('idle', 'Extension ready — click "Sign on Pad" to capture.');
  consentDeclCheckSubmit();
}

function consentDeclCheckSubmit() {
  const sig = (document.getElementById('cdecl-sig')?.value || '').trim();
  const sigOk = gState.sigMode === 'upload' ? !!sigUploadedDataUrl
    : gState.sigMode === 'topaz' ? !!sigTopazPreviewUrl
      : (gState.sigPadInstance && !gState.sigPadInstance.isEmpty());
  const btn = document.getElementById('cdecl-submit-btn');
  if (btn) btn.disabled = !(sig && sigOk);
}

async function consentDeclSubmit() {
  const sig = (document.getElementById('cdecl-sig')?.value || '').trim();
  if (!sig) { toast('Please print your full name to sign.', 'warning'); return; }

  let patientSignatureImage = null;
  if (gState.sigMode === 'upload') {
    if (!gState.sigUploadedDataUrl) { toast('Please upload a signature image.', 'warning'); return; }
    patientSignatureImage = gState.sigUploadedDataUrl;
  } else if (gState.sigMode === 'topaz') {
    if (!gState.sigTopazPreviewUrl) { toast('Please capture a signature on the Topaz pad.', 'warning'); return; }
    patientSignatureImage = gState.sigTopazPreviewUrl;
  } else {
    if (!gState.sigPadInstance || gState.sigPadInstance.isEmpty()) {
      toast('Please draw your signature before submitting.', 'warning'); return;
    }
    patientSignatureImage = gState.sigPadInstance.toDataURL('image/png');
  }

  const btn = document.getElementById('cdecl-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>&nbsp;Submitting…`; }

  const witnessName = (document.getElementById('cdecl-witness')?.value || '').trim();
  const consent = gState.consentDeclState.consent || state.pageData?.consent;
  if (!consent?.id) {
    toast('Session lost — please start a new consent from the beginning.', 'error');
    navigate('new-consent');
    return;
  }

  try {
    const result = await api('PUT', `/consents/${consent.id}/sign`, {
      patientSignature: sig,
      patientSignatureImage: patientSignatureImage,
      witnessName: witnessName || null,
      language: gState.consentDeclState.lang,
    });
    if (!result) return;
    gState.consentDeclState.signed = true;
    gState.consentDeclState.signedResult = result;
    render();
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Consent & Sign'; }
  }
}

function renderConsentDeclaration() {
  const consent = state.pageData.consent;
  consentDeclInit(consent);

  // ── Confirmation screen ────────────────────────────────────
  if (gState.consentDeclState.signed && gState.consentDeclState.signedResult) {
    const r = gState.consentDeclState.signedResult;
    const ts = r.stage1?.completedAt
      ? new Date(r.stage1.completedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';
    return `
      <div class="page-header"><div>
        <div class="page-title">Consent Declaration</div>
        <div class="page-subtitle">${esc(r.patient?.name)} · ${esc(MODALITY_LABELS[r.modality] || r.modality)}</div>
      </div></div>
      <div class="card">
        <div class="card-body" style="text-align:center;padding:52px 32px">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--c-success-light);border:2px solid var(--c-success-border);display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
            ${IC.check.replace('stroke="currentColor"', 'stroke="#16A34A" stroke-width="2.5"').replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" width="28" height="28"')}
          </div>
          <div style="font-size:19px;font-weight:700;color:var(--c-text);margin-bottom:6px">Consent Recorded</div>
          <div style="font-size:13.5px;color:var(--c-text-sec);margin-bottom:28px">Stage 1 complete. The patient has signed the consent declaration.</div>
          <div style="display:inline-grid;grid-template-columns:auto auto;gap:8px 28px;text-align:left;background:var(--c-bg);border:1px solid var(--c-border);border-radius:var(--radius);padding:18px 24px;margin-bottom:32px;min-width:320px">
            <span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px;line-height:1.8">Record ID</span>
            <span style="font-size:12px;font-weight:500;font-family:monospace;color:var(--c-text-sec)">${esc(r.id)}</span>
            <span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px;line-height:1.8">Signed by</span>
            <span style="font-size:13px;font-weight:600">${esc(r.stage1?.patientSignature)}</span>
            <span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px;line-height:1.8">Timestamp</span>
            <span style="font-size:13px;font-weight:500">${ts}</span>
            <span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px;line-height:1.8">Status</span>
            <span class="badge badge-${r.status}">${esc(STATUS_LABELS[r.status] || r.status)}</span>
            ${r.stage1?.patientSignatureImage ? `
            <span style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;letter-spacing:.5px;line-height:1.8">Signature</span>
            <img class="sig-img" src="${r.stage1.patientSignatureImage}" alt="Patient signature" style="max-width:220px" />` : ''}
          </div>
          <div>
            <button class="btn btn-primary btn-lg" onclick="navigate('dashboard')">Done — Return to Dashboard</button>
          </div>
        </div>
      </div>`;
  }

  // ── Declaration form ───────────────────────────────────────
  const { lang } = gState.consentDeclState;
  const risksObj = lang === 'yo' ? MODALITY_RISKS_YO : MODALITY_RISKS;
  const risks = risksObj[consent.modality] || [];
  const consentText = CONSENT_TEXT[lang] || CONSENT_TEXT.en;
  const L = CONSENT_LABELS[lang] || CONSENT_LABELS.en;
  const now = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('new-consent')"
          style="margin-bottom:6px;margin-left:-6px">← Back</button>
        <div class="page-title">Consent Declaration</div>
        <div class="page-subtitle">${esc(consent.patient?.name)} · ${esc(MODALITY_LABELS[consent.modality] || consent.modality)}</div>
      </div>
    </div>

    <!-- Card 1: Procedure information & language -->
    <div class="card mb-4">
      <div class="card-header"><h3>${IC.medical}&nbsp; ${L.procInfo}</h3></div>
      <div class="card-body">
        <div class="form-row mb-4" style="align-items:start">
          <div>
            <div class="form-label">Procedure</div>
            <div style="font-size:15px;font-weight:600;color:var(--c-text)">${esc(MODALITY_LABELS[consent.modality] || consent.modality)}</div>
          </div>
          ${consent.bodyPart ? `<div>
            <div class="form-label">Body Part / Region</div>
            <div style="font-size:15px;font-weight:600;color:var(--c-text)">${esc(consent.bodyPart)}</div>
          </div>` : ''}
        </div>

        ${risks.length ? `<div class="divider"></div>
        <div class="section-label">${L.risksTitle}</div>
        <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px">
          ${risks.map(r => `<li style="font-size:13.5px;color:var(--c-text-sec);line-height:1.5">${esc(r)}</li>`).join('')}
        </ul>` : ''}

        <div class="divider"></div>
        <div class="section-label">${L.langTitle}</div>
        <div class="lang-btn-group">
          <button class="lang-btn${lang === 'en' ? ' selected' : ''}" onclick="consentDeclSetLang('en')">
            <span class="lang-flag">🇬🇧</span><span class="lang-code">English</span>
          </button>
          <button class="lang-btn${lang === 'yo' ? ' selected' : ''}" onclick="consentDeclSetLang('yo')">
            <span class="lang-flag">🟢</span><span class="lang-code">Yorùbá</span>
          </button>
          <button class="lang-btn${lang === 'ig' ? ' selected' : ''}" onclick="consentDeclSetLang('ig')">
            <span class="lang-flag">🔴</span><span class="lang-code">Igbo</span><span class="lang-phase">EN only</span>
          </button>
          <button class="lang-btn${lang === 'ha' ? ' selected' : ''}" onclick="consentDeclSetLang('ha')">
            <span class="lang-flag">🔵</span><span class="lang-code">Hausa</span><span class="lang-phase">EN only</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Card 2: Consent statement -->
    <div class="card mb-4">
      <div class="card-header"><h3>${IC.clipboard}&nbsp; ${L.consentStatement}</h3></div>
      <div class="card-body">
        <div style="background:var(--c-bg);border:1px solid var(--c-border);border-left:3px solid var(--c-accent);border-radius:var(--radius);padding:20px 22px;font-size:15px;line-height:1.8;color:var(--c-text)">
          "${esc(consentText)}"
        </div>
      </div>
    </div>

    <!-- Card 3: Patient signature -->
    <div class="card">
      <div class="card-header"><h3>${IC.edit}&nbsp; ${L.patientSig}</h3></div>
      <div class="card-body">
        <!-- Signature section with mode tabs -->
        <div class="mb-4">
          <div class="form-label">${L.signature} <span class="req">*</span></div>
          <div class="sig-mode-tabs">
            <button id="sig-tab-draw" type="button" class="sig-mode-tab${gState.sigMode === 'draw' ? ' sig-tab-active' : ''}" onclick="sigSwitchMode('draw')">&#9998; Draw</button>
            <button id="sig-tab-upload" type="button" class="sig-mode-tab${gState.sigMode === 'upload' ? ' sig-tab-active' : ''}" onclick="sigSwitchMode('upload')">&#8593; Upload image</button>
            <button id="sig-tab-topaz" type="button" class="sig-mode-tab${gState.sigMode === 'topaz' ? ' sig-tab-active' : ''}" onclick="sigSwitchMode('topaz')">&#128394; Topaz Pad</button>
          </div>
          <!-- Draw pane -->
          <div id="sig-draw-pane"${gState.sigMode !== 'draw' ? ' style="display:none"' : ''}>
            <div class="sig-pad-wrap">
              <canvas id="cdecl-sigpad"></canvas>
              <div class="sig-pad-toolbar">
                <span class="sig-pad-hint">${L.drawHint}</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="consentDeclClearSig()">Clear</button>
              </div>
            </div>
          </div>
          <!-- Upload pane -->
          <div id="sig-upload-pane"${gState.sigMode !== 'upload' ? ' style="display:none"' : ''}>
            <label class="sig-upload-area" for="sig-upload-input">
              <span style="font-size:22px">&#8593;</span>
              <span>${L.uploadClick}</span>
              <span style="font-size:11px">${L.uploadHint}</span>
            </label>
            <input type="file" id="sig-upload-input" accept="image/*" style="display:none" onchange="sigHandleUpload(this)" />
            ${gState.sigUploadedDataUrl ? `<img id="sig-upload-preview" class="sig-img" src="${gState.sigUploadedDataUrl}" alt="Uploaded signature" />` : `<img id="sig-upload-preview" class="sig-img" style="display:none" alt="Uploaded signature" />`}
          </div>
          <!-- Topaz pad pane -->
          <div id="sig-topaz-pane" class="sig-topaz-pane"${gState.sigMode !== 'topaz' ? ' style="display:none"' : ''}>
            <div class="sig-topaz-status">
              <span id="sig-topaz-dot" class="sig-topaz-dot${gState.sigTopazStatus === 'capturing' ? ' dot-capturing' : gState.sigTopazStatus === 'captured' ? ' dot-captured' : gState.sigTopazStatus === 'error' ? ' dot-error' : ''}"></span>
              <span id="sig-topaz-status-text">${gState.sigTopazStatus === 'capturing' ? 'Sign on the Topaz pad now\u2026' : gState.sigTopazStatus === 'captured' ? 'Signature captured successfully.' : gState.sigTopazStatus === 'error' ? 'SigPlusExtLite extension not detected. Install it in Chrome and reload.' : 'Extension ready \u2014 click \u201cSign on Pad\u201d to capture.'}</span>
            </div>
            <div class="sig-topaz-actions">
              <button type="button" class="btn btn-primary btn-sm" onclick="sigTopazSign()"${gState.sigTopazStatus === 'capturing' ? ' disabled' : ''}>Sign on Pad</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="sigTopazClear()"${gState.sigTopazStatus !== 'captured' ? ' disabled' : ''}>Clear</button>
            </div>
            ${gState.sigTopazPreviewUrl ? `<img id="sig-topaz-preview" class="sig-img" src="${gState.sigTopazPreviewUrl}" alt="Topaz signature" />` : `<img id="sig-topaz-preview" class="sig-img" style="display:none" alt="Topaz signature" />`}
            <div class="form-hint" style="margin-top:4px">Requires the <a href="https://chrome.google.com/webstore/detail/sigplusextlite/gjaebefdmgmhgheehpjpeclhplpkdpbi" target="_blank" rel="noopener">SigPlusExtLite Chrome extension</a> and the Topaz L460 pad connected via USB.</div>
          </div>
        </div>
        <!-- Typed name + date row -->
        <div class="form-row mb-4">
          <div>
            <label class="form-label" for="cdecl-sig">${L.printName} <span class="req">*</span></label>
            <input class="form-control" type="text" id="cdecl-sig"
              placeholder="${lang === 'yo' ? 'Orúkọ kíkún (fún ìdámọ̀)' : 'Full name (for identification)'}" autocomplete="off"
              oninput="consentDeclCheckSubmit()" />
            <div class="form-hint">${L.nameHint}</div>
            <div class="form-hint" style="margin-top:6px;font-style:italic">${L.guardianHint}</div>
          </div>
          <div>
            <label class="form-label" for="cdecl-date">${L.dateTime}</label>
            <input class="form-control" type="text" id="cdecl-date" value="${now}" readonly
              style="background:var(--c-bg);color:var(--c-text-sec);cursor:default" />
          </div>
        </div>
        <div>
          <label class="form-label" for="cdecl-witness">${L.witnessedBy} <span style="font-weight:400;color:var(--c-text-muted)">${lang === 'yo' ? '(ìyàn)' : '(optional)'}</span></label>
          <input class="form-control" type="text" id="cdecl-witness"
            placeholder="${L.witnessPlaceholder}" autocomplete="off"
            style="max-width:340px" />
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-ghost btn-sm" onclick="navigate('dashboard')">${L.cancel}</button>
        <button id="cdecl-submit-btn" class="btn btn-primary" onclick="consentDeclSubmit()" disabled>
          ${L.submit}
        </button>
      </div>
    </div>`;
}

function renderConsentDeclarationPlaceholder() {
  const c = state.pageData.consent;
  return `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('new-consent')"
          style="margin-bottom:6px;margin-left:-6px">← Back</button>
        <div class="page-title">Consent Declaration</div>
        <div class="page-subtitle">${c ? esc(c.patient?.name) + ' · ' + esc(MODALITY_LABELS[c.modality] || c.modality) : 'New session'}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-body">
        <div class="empty-state">
          ${IC.clipboard}
          <h3>Consent Declaration</h3>
          <p>The consent text and patient signature form will be built in the next step.</p>
          ${c ? `<p class="mt-2 text-sm"><strong>Session ID:</strong> ${esc(c.id)}</p>` : ''}
        </div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — MAIN ENTRY POINT
═══════════════════════════════════════════════════════════════ */
function render() {
  const app = document.getElementById('app');

  if (!state.user || state.page === 'login') {
    app.innerHTML = renderLogin();
    bindLoginEvents();
    return;
  }

  app.innerHTML = renderShell(renderPage());
  bindPageEvents();
}

let dashboardCharts = [];

function initDashboardCharts(records) {
  // Destroy old charts, prevents canvas reuse errors from Chart.js
  dashboardCharts.forEach(c => c.destroy());
  dashboardCharts = [];

  if (!window.Chart || !records || records.length === 0) return;

  const statusCanvas = document.getElementById('chart-status');
  const modalityCanvas = document.getElementById('chart-modality');
  if (!statusCanvas || !modalityCanvas) return;

  const textColor = gState.darkMode ? '#e2e8f0' : '#475569';
  const gridColor = gState.darkMode ? '#334155' : '#e2e8f0';

  Chart.defaults.color = textColor;
  // Fallback to inter since it's used in the app
  Chart.defaults.font.family = 'Inter, -apple-system, sans-serif';

  // ── Status Chart Data ──
  const statusCounts = {};
  records.forEach(r => {
    const label = STATUS_LABELS[r.status] || r.status;
    statusCounts[label] = (statusCounts[label] || 0) + 1;
  });
  
  const statusChart = new Chart(statusCanvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } }
      }
    }
  });

  // ── Modality Chart Data ──
  const modalityCounts = {};
  records.forEach(r => {
    const label = MODALITY_LABELS[r.modality] || r.modality;
    modalityCounts[label] = (modalityCounts[label] || 0) + 1;
  });

  const modalityChart = new Chart(modalityCanvas, {
    type: 'bar',
    data: {
      labels: Object.keys(modalityCounts),
      datasets: [{
        label: 'Records',
        data: Object.values(modalityCounts),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    }
  });

  dashboardCharts.push(statusChart, modalityChart);
}

/*
 * bindPageEvents() — called after every shell render.
 * Add page-specific event listeners here as pages are built.
 */
function bindPageEvents() {
  bindNewConsentEvents();
  bindMriScreeningEvents();
  
  if (state.page === 'dashboard' && gState.dashboardState.records) {
    initDashboardCharts(gState.dashboardState.records);
  }

  if (state.page === 'consent-declaration' && !gState.consentDeclState.signed && gState.sigMode === 'draw') {
    initSigPad();
  }
  if (state.page === 'stage3-vitals' && !gState.stage3State.confirmed && gState.s3SigMode === 'draw') {
    s3InitSigPad();
  }
  if (state.page === 'stage2-report' && gState.s2SigMode === 'draw') {
    s2InitSigPad();
  }
  if (state.page === 'rad-review' && gState.rvSigMode === 'draw') {
    rvInitSigPad();
  }
}

function bindMriScreeningEvents() {
  // MRI screening uses inline onclick handlers; nothing to bind dynamically.
}

function bindNewConsentEvents() {
  const nameEl = document.getElementById('nc-name');
  if (!nameEl) return; // not on the new-consent page
  nameEl.addEventListener('input', updateNcSubmit);
}

/* ═══════════════════════════════════════════════════════════════
   INIT — Session restore from localStorage
═══════════════════════════════════════════════════════════════ */
async function init() {
  // Fetch custom center logo before rendering
  try {
    const res = await fetch('/api/settings/center_logo');
    if (res.ok) {
      const data = await res.json();
      if (data.value) {
        window.gState.settings = window.gState.settings || {};
        window.gState.settings.center_logo = data.value;
      }
    }
  } catch (err) { /* ignore */ }

  const savedToken = localStorage.getItem('radconsent_token');
  const savedUser = localStorage.getItem('radconsent_user');

  if (savedToken && savedUser) {
    try {
      const localUser = JSON.parse(savedUser);
      if (localUser && localUser.id && localUser.role) {
        // Show a loading state while validating
        state.token = savedToken;
        state.user = localUser;

        // Validate the token with the server
        const freshUser = await validateSession(savedToken);
        if (freshUser) {
          // Token is valid — use fresh user data from the server
          state.user = freshUser;
          localStorage.setItem('radconsent_user', JSON.stringify(freshUser));
          startExpiryTimer(savedToken);
          navigate('dashboard');
          return;
        }

        // Token invalid — clear and fall through to login
        state.token = null;
        state.user = null;
        localStorage.removeItem('radconsent_token');
        localStorage.removeItem('radconsent_user');
      }
    } catch { /* malformed — fall through to login */ }
  }
  navigate('login');
}
export { esc, statusBadge, roleBadge, formatDate, formatDateTime, initials, toast, openModal, closeModal, getNavItems, renderLogin, fillDemo, bindLoginEvents, renderShell, renderPage, renderDashboard, highestTier, fmtDate, fmtDateTime, resumeConsent, getRecordAction, getFilteredRecords, buildRecordsRows, recordsSearch, recordsToggleStatus, recordsFilterDate, recordsClearDates, renderRecordsTable, renderConsents, renderFlagged, buildFlaggedCard, scrDomainSummary, radReviewSelectDecision, radReviewCheckSubmit, radReviewSubmit, renderRadReview, renderAdminPanel, adminRecallRecord, adminDeleteRecord, adminLoadDemo, adminDeleteAll, adminSwitchTab, adminRefreshAudit, adminHandleLogoUpload, staffFormNew, staffFormCancel, staffEditStart, staffFormSubmit, staffPwdStart, staffPwdCancel, staffPwdSubmit, staffDelete, renderChangePassword, changePasswordSubmit, selectModality, selectLanguage, selectConsentMode, selectSex, updateNcSubmit, submitNewConsent, navigateToSignConsent, downloadPDF, renderRecordDetail, renderStage2Report, stage2ToggleComplications, stage2CheckSubmit, stage2Submit, renderStage3Vitals, s3SigSwitchMode, s3InitSigPad, s3SigClear, s3SigHandleUpload, s3SigLoadTopaz, s3SigTopazRenderStatus, s3SigTopazSign, s3SigTopazClear, stage3CheckSubmit, stage3Submit, s2SigSwitchMode, s2InitSigPad, s2SigClear, s2SigHandleUpload, s2SigLoadTopaz, s2SigTopazRenderStatus, s2SigTopazSign, s2SigTopazClear, rvSigSwitchMode, rvInitSigPad, rvSigClear, rvSigHandleUpload, rvSigLoadTopaz, rvSigTopazRenderStatus, rvSigTopazSign, rvSigTopazClear, renderNewConsent, mriScrBuildSteps, mriScrInit, mriScrRefreshSteps, scrMultiToggle, mriScrAnswer, mriScrNext, mriScrBack, mriScrComputeResults, mriScrSubmit, scrSwitchLang, renderMriStep, renderMriResults, mmgScrAnswer, renderMammographyScreening, mmgScrSubmit, mmgQuestAnswer, mmgQuestToggleRelative, mmgQuestBack, mmgQuestNext, renderMammographyQuestionnaire, mmgQuestSubmit, safetyScrBack, safetyScrNext, renderSafetyScreening, safetyScrAnswer, safetyScrSubmit, renderMriScreening, renderMriScreeningPlaceholder, consentDeclInit, consentDeclSetLang, initSigPad, consentDeclClearSig, sigSwitchMode, sigHandleUpload, sigTopazRenderStatus, sigLoadTopaz, sigTopazSign, sigTopazClear, consentDeclCheckSubmit, consentDeclSubmit, renderConsentDeclaration, renderConsentDeclarationPlaceholder, render, bindPageEvents, bindMriScreeningEvents, bindNewConsentEvents, init, IC, LANG_FLAG, STATUS_FILTER_OPTS, SCR_STEPS, SCR_STEPS_YO, SCR_UI_LABELS, SCR_FLAG_LABELS, MMG_SECTION_KEYS, SAFETY_QUESTIONS, MODALITY_RISKS, MODALITY_RISKS_YO, CONSENT_LABELS, CONSENT_TEXT };
