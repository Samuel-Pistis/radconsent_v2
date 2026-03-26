import { navigate } from './router.js';
import { render } from './ui.js';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const API_BASE = '/api';

const MODALITY_LABELS = {
  mri_without_contrast : 'MRI (no contrast)',
  mri_with_gadolinium  : 'MRI + Gadolinium',
  ct_with_iv_contrast  : 'CT + IV Contrast',
  mammography          : 'Mammography' };

const STATUS_LABELS = {
  in_progress          : 'In Progress',
  draft_stage1         : 'Stage 1 Complete',
  draft_stage2         : 'Stage 2 Complete',
  closed               : 'Closed',
  pending_review       : 'Pending Review',
  flagged_tier1        : 'Tier 1 Flagged',
  awaiting_signature   : 'Awaiting Signature',
  declined             : 'Declined',
  voided               : 'Voided' };

const ROLE_LABELS = {
  radiographer : 'Radiographer',
  nurse        : 'Nurse',
  radiologist  : 'Radiologist',
  admin        : 'Admin' };

const LANGUAGE_LABELS = { en: 'English', yo: 'Yorùbá', ig: 'Igbo', ha: 'Hausa' };

const DECISION_LABELS = {
  approved                  : 'Approved',
  proceed_with_modifications: 'Proceed with Modifications',
  declined                  : 'Declined' };

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
export const gState = {};
const state = {
  user     : null,   // { id, email, name, role }
  token    : null,   // JWT string
  page     : 'login',
  pageData : {},     // arbitrary per-page data
};

/* Mobile sidebar state */
gState._sidebarOpen = false;
function toggleSidebar() {
  gState._sidebarOpen = !gState._sidebarOpen;
  document.getElementById('main-sidebar')?.classList.toggle('open', gState._sidebarOpen);
  document.getElementById('sidebar-backdrop')?.classList.toggle('open', gState._sidebarOpen);
}
function closeSidebar() {
  gState._sidebarOpen = false;
  document.getElementById('main-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');
}

/* New Consent form — ephemeral UI state (reset on each visit) */
gState.ncState = {
  modality    : '',
  language    : 'en',
  consentMode : 'assisted',
  sex         : '' };

/* MRI Screening step-machine state */
gState.mriScrState = { steps: [], stepIdx: 0, answers: {}, consent: null };
/* General Safety Screening state (non-MRI modalities) */
gState.safetyScrState = { consent: null, answers: {}, stepIdx: 0 };
/* Mammography Screening state */
gState.mmgScrState = { consent: null, answers: {}, stepIdx: 0 };

/* Consent Declaration state */
gState.consentDeclState = { lang: 'en', consent: null, signed: false, signedResult: null };
gState.sigPadInstance = null;
gState.sigMode = 'draw';   // 'draw' | 'upload' | 'topaz'
gState.sigUploadedDataUrl = null;
gState.sigTopazStatus = 'idle';   // 'idle' | 'capturing' | 'captured' | 'error'
gState.sigTopazPreviewUrl = null;

/* Records archive + detail state */
gState.recordsState = {
  records: null, loading: false,
  search: '', statusFilter: [],
  dateFrom: new Date().toISOString().slice(0,10),  // today
  dateTo: ''
};
gState.recordDetailState = { record: null, loading: false };
gState.stage2State = { record: null, loading: false };
gState.s2SigMode = 'draw';
gState.s2SigPadInstance = null;
gState.s2SigUploadedDataUrl = null;
gState.s2SigTopazStatus = 'idle';
gState.s2SigTopazPreviewUrl = null;
gState.stage3State = { record: null, loading: false, confirmed: false, confirmedRecord: null };
gState.s3SigMode = 'draw';
gState.s3SigPadInstance = null;
gState.s3SigUploadedDataUrl = null;
gState.s3SigTopazStatus = 'idle';
gState.s3SigTopazPreviewUrl = null;
gState.radReviewState = { record: null, loading: false };
gState.rvSigMode = 'draw';
gState.rvSigPadInstance = null;
gState.rvSigUploadedDataUrl = null;
gState.rvSigTopazStatus = 'idle';
gState.rvSigTopazPreviewUrl = null;
gState.adminState = { records: null, loading: false, tab: 'records', users: null, usersLoading: false, staffForm: null, pwdForm: null };
gState.changePwdState = { error: null, success: false };
gState.dashboardState = { records: null, loading: false };

/* Dark mode — applied immediately so there's no flash */
const savedDark = localStorage.getItem('radconsent_dark');
gState.darkMode = savedDark !== '0';

if (gState.darkMode) {
  document.body.classList.add('dark');
  document.body.classList.remove('light');
} else {
  document.body.classList.add('light');
  document.body.classList.remove('dark');
}

function toggleDark() {
  gState.darkMode = !gState.darkMode;
  document.body.classList.toggle('dark', gState.darkMode);
  document.body.classList.toggle('light', !gState.darkMode);
  localStorage.setItem('radconsent_dark', gState.darkMode ? '1' : '0');
  window.dispatchEvent(new CustomEvent('theme-toggled'));
}

/* ═══════════════════════════════════════════════════════════════
   API HELPER
═══════════════════════════════════════════════════════════════ */
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch {
    throw new Error('Network error — is the server running?');
  }

  if (res.status === 401) { doLogout(); return null; }

  let data;
  try { data = await res.json(); } catch { throw new Error('Server returned an invalid response.'); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ═══════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════ */
let _expiryWarnTimer = null;
let _expiryLogoutTimer = null;

/** Decode JWT payload without a library (base64url → JSON). */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch { return null; }
}

/** Start timers that warn 5 min before expiry and auto-logout on expiry. */
function startExpiryTimer(token) {
  clearExpiryTimer();
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return;

  const expiresAt = payload.exp * 1000; // ms
  const now = Date.now();
  const msUntilExpiry = expiresAt - now;
  const WARN_AHEAD = 5 * 60 * 1000; // 5 minutes

  if (msUntilExpiry <= 0) { doLogout(); return; }

  // Warning toast
  if (msUntilExpiry > WARN_AHEAD) {
    _expiryWarnTimer = setTimeout(() => {
      if (typeof window.toast === 'function') window.toast('Your session will expire in 5 minutes. Please save your work.', 'warning');
    }, msUntilExpiry - WARN_AHEAD);
  }

  // Auto-logout
  _expiryLogoutTimer = setTimeout(() => {
    if (typeof window.toast === 'function') window.toast('Session expired. You have been logged out.', 'error');
    doLogout();
  }, msUntilExpiry);
}

function clearExpiryTimer() {
  if (_expiryWarnTimer) { clearTimeout(_expiryWarnTimer); _expiryWarnTimer = null; }
  if (_expiryLogoutTimer) { clearTimeout(_expiryLogoutTimer); _expiryLogoutTimer = null; }
}

async function doLogin(user, token) {
  state.user  = user;
  state.token = token;
  localStorage.setItem('radconsent_token', token);
  localStorage.setItem('radconsent_user',  JSON.stringify(user));
  // Fetch clinic logo now that we have auth
  try {
    const logoRes = await api('GET', '/settings/center_logo');
    if (logoRes?.value) {
      gState.settings = gState.settings || {};
      gState.settings.center_logo = logoRes.value;
    }
  } catch (e) { /* ignore */ }
  startExpiryTimer(token);
  navigate('dashboard');
}

function doLogout() {
  clearExpiryTimer();
  state.user = null; state.token = null;
  state.page = 'login'; state.pageData = {};
  localStorage.removeItem('radconsent_token');
  localStorage.removeItem('radconsent_user');
  // Clear all cached patient data so it doesn't leak to the next user
  gState.recordsState        = { records: null, loading: false, search: '', statusFilter: [], dateFrom: new Date().toISOString().slice(0,10), dateTo: '' };
  gState.recordDetailState   = { record: null, loading: false };
  gState.dashboardState      = { records: null, loading: false };
  gState.stage2State         = { record: null, loading: false };
  gState.stage3State         = { record: null, loading: false, confirmed: false, confirmedRecord: null };
  gState.radReviewState      = { record: null, loading: false };
  gState.adminState          = { records: null, loading: false, tab: 'records', users: null, usersLoading: false, staffForm: null, pwdForm: null };
  gState.s2SigPadInstance    = null; gState.s2SigUploadedDataUrl = null;
  gState.s3SigPadInstance    = null; gState.s3SigUploadedDataUrl = null;
  gState.rvSigPadInstance    = null; gState.rvSigUploadedDataUrl = null;
  render();
}

/**
 * Validate a saved token by calling GET /api/auth/me.
 * Returns the user object on success, or null on failure.
 */
async function validateSession(token) {
  try {
    const res = await fetch(API_BASE + '/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}


export { toggleSidebar, closeSidebar, toggleDark, api, doLogin, doLogout, validateSession, startExpiryTimer, API_BASE, MODALITY_LABELS, STATUS_LABELS, ROLE_LABELS, LANGUAGE_LABELS, DECISION_LABELS, state };
