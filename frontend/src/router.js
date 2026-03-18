import { toggleSidebar, closeSidebar, toggleDark, api, doLogin, doLogout, API_BASE, MODALITY_LABELS, STATUS_LABELS, ROLE_LABELS, LANGUAGE_LABELS, DECISION_LABELS, state, gState } from './api.js';
import { render, resumeConsent } from './ui.js';
/* ═══════════════════════════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════════════════════════ */
function navigate(page, data, opts = {}) {
  closeSidebar();
  // Reset new-consent form state each time the page is opened fresh
  if (page === 'new-consent') {
    gState.ncState.modality = ''; gState.ncState.sex = '';
    gState.ncState.language = 'en'; gState.ncState.consentMode = 'assisted';
  }
  // Force reload of dashboard each time it's opened
  if (page === 'dashboard') {
    gState.dashboardState.records = null;
    gState.dashboardState.loading = false;
  }
  // Reset change-password form each time it's opened
  if (page === 'change-password') {
    gState.changePwdState.error = null;
    gState.changePwdState.success = false;
  }
  // Force reload of admin panel each time it's opened
  if (page === 'admin') {
    gState.adminState.records = null;
    gState.adminState.loading = false;
    gState.adminState.tab = 'records';
    gState.adminState.users = null;
    gState.adminState.usersLoading = false;
    gState.adminState.staffForm = null;
    gState.adminState.pwdForm = null;
  }
  // Force reload of records list whenever the archive or flagged queue is opened
  if (page === 'consents' || page === 'flagged') {
    gState.recordsState.records = null;
    gState.recordsState.loading = false;
  }
  // Resume in-progress consent — smart routing
  if (page === 'resume') {
    resumeConsent(data?.id);
    return;
  }
  // Sign consent after radiologist approval — fetch record then go to declaration
  if (page === 'sign-consent-resume') {
    resumeConsent(data?.id);
    return;
  }
  // Always reload record detail — status may have changed since last visit
  if (page === 'record-detail') {
    gState.recordDetailState.record  = null;
    gState.recordDetailState.loading = false;
  }
  if (page === 'stage2-report') {
    if (gState.stage2State.record?.id !== data?.id) {
      gState.stage2State.record  = null;
      gState.stage2State.loading = false;
    }
  }
  if (page === 'stage3-vitals') {
    // Always reload — status may have changed since last visit
    gState.stage3State.record    = null;
    gState.stage3State.loading   = false;
    gState.stage3State.confirmed = false;
    gState.s3SigMode            = 'draw';
    gState.s3SigPadInstance     = null;
    gState.s3SigUploadedDataUrl = null;
    gState.s3SigTopazStatus     = 'idle';
    gState.s3SigTopazPreviewUrl = null;
  }
  if (page === 'rad-review') {
    if (gState.radReviewState.record?.id !== data?.id) {
      gState.radReviewState.record  = null;
      gState.radReviewState.loading = false;
    }
  }
  if (page === 'safety-screening') {
    gState.safetyScrState.consent = data?.consent || null;
    gState.safetyScrState.answers = {};
    gState.safetyScrState.stepIdx = 0;
  }
  if (page === 'mammography-screening') {
    // Only reset state when starting fresh (consent provided = new session)
    if (data?.consent) {
      gState.mmgScrState.consent = data.consent;
      gState.mmgScrState.answers = {};
      gState.mmgScrState.stepIdx = 0;
    }
  }
  if (page === 'mammography-questionnaire') {
    if (data?.consent) {
      gState.mmgScrState.stepIdx = 0;
    }
  }
  state.page     = page;
  state.pageData = data || {};
  if (!opts.skipHistory && state.user && page !== 'login') {
    history.pushState({ page, pageData: data || {} }, '');
  }
  render();
}

window.addEventListener('popstate', e => {
  if (!state.user) return;
  if (e.state?.page) {
    navigate(e.state.page, e.state.pageData || {}, { skipHistory: true });
  }
});


export { navigate };
