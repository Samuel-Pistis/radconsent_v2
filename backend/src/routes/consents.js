'use strict';

const express    = require('express');
const db         = require('../db/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

const router = express.Router();

// All consent routes require authentication
router.use(verifyToken);

// POST /api/consents/seed-demo — admin loads demo consent records
router.post('/seed-demo', requireRole('admin'), async (req, res) => {
  const count = await db.loadDemoConsents(req.user.clinicId);
  await logAction(req, 'LOADED_DEMO_DATA', 'consent', null, { count });
  return res.json({ ok: true, loaded: count });
});

// POST /api/consents/sessions — create a new consent record
router.post('/sessions', async (req, res) => {
  const { patient, modality, language, consentMode, bodyPart } = req.body || {};

  if (!patient?.name || !modality) {
    return res.status(400).json({ error: 'Patient name and modality are required.' });
  }

  const doc = await db.insert('consents', {
    status   : 'in_progress',
    modality,
    language : language || 'en',
    consentMode: consentMode || 'assisted',
    bodyPart : bodyPart || null,
    patient  : {
      name            : patient.name,
      hospitalNumber  : patient.hospitalNumber  || null,
      dob             : patient.dob             || null,
      gender          : patient.gender          || null,
      phone           : patient.phone           || null,
      referringDoctor : patient.referringDoctor || null,
      urea            : patient.urea            || null,
      creatinine      : patient.creatinine      || null,
      vitals          : patient.vitals          || null,
    },
    tierFlags        : { tier1: [], tier2: [], tier3: [] },
    stage1           : null,
    stage2           : null,
    stage3           : null,
    radiologistReview: null,
    closedAt         : null,
  }, req.user.clinicId);

  await logAction(req, 'CONSENT_CREATED', 'consent', doc.id, { modality });
  return res.status(201).json(doc);
});

// GET /api/consents — list consent records (supports ?search= and ?status= query params)
router.get('/', async (req, res) => {
  let records = await db.all('consents', req.user.clinicId);

  const { search, status } = req.query;
  if (search) {
    const q = search.toLowerCase();
    records = records.filter(r =>
      (r.patient?.name || '').toLowerCase().includes(q) ||
      (r.patient?.hospitalNumber || '').toLowerCase().includes(q)
    );
  }
  if (status && status !== 'all') {
    records = records.filter(r => r.status === status);
  }

  // Newest first
  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(records);
});

// GET /api/consents/:id — get a single consent record
router.get('/:id', async (req, res) => {
  const doc = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!doc) return res.status(404).json({ error: 'Consent record not found.' });
  return res.json(doc);
});

// PUT /api/consents/:id/screening — save MRI screening results and tier flags
router.put('/:id/screening', async (req, res) => {
  const { screening, tierFlags } = req.body || {};
  const existing = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!existing) return res.status(404).json({ error: 'Consent record not found.' });

  // If tier1/tier2 flags exist, block patient from signing until radiologist reviews
  const tf = tierFlags || { tier1: [], tier2: [], tier3: [] };
  const flaggedStatus = tf.tier1?.length > 0 ? 'flagged_tier1'
                      : tf.tier2?.length > 0 ? 'pending_review'
                      : null;

  const updateData = {
    tierFlags,
    stage1: {
      ...(existing.stage1 || {}),
      screening,
      screeningCompletedAt: new Date().toISOString(),
    },
  };
  if (flaggedStatus) updateData.status = flaggedStatus;

  const updated = await db.update('consents', req.params.id, updateData, req.user.clinicId);
  await logAction(req, 'SCREENING_COMPLETED', 'consent', updated.id, { flagged: !!flaggedStatus });
  return res.json(updated);
});

// PUT /api/consents/:id/sign — patient signs the consent declaration (Stage 1)
router.put('/:id/sign', requireRole('radiographer', 'nurse', 'admin'), async (req, res) => {
  const { patientSignature, patientSignatureImage, witnessName, language } = req.body || {};
  if (!patientSignature?.trim()) {
    return res.status(400).json({ error: 'Patient signature is required.' });
  }

  const existing = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!existing) return res.status(404).json({ error: 'Consent record not found.' });

  // Only allow signing when: no flags (in_progress) or radiologist has approved (awaiting_signature)
  if (existing.status !== 'in_progress' && existing.status !== 'awaiting_signature') {
    return res.status(409).json({
      error: existing.status === 'pending_review' || existing.status === 'flagged_tier1'
        ? 'This record has safety flags. A radiologist must review and approve before the patient can sign.'
        : `Cannot sign consent in current status: ${existing.status}.`,
    });
  }

  const now = new Date().toISOString();
  const lang = language || existing.language || 'en';

  const updated = await db.update('consents', req.params.id, {
    status  : 'draft_stage1',
    language: lang,
    stage1  : {
      ...(existing.stage1 || {}),
      consentVersion        : `v1.0-${lang}`,
      consentAcknowledged   : true,
      patientSignature      : patientSignature.trim(),
      patientSignatureImage : patientSignatureImage || null,
      witnessName           : witnessName || null,
      completedAt           : now,
    },
  }, req.user.clinicId);
  await logAction(req, 'PATIENT_SIGNED', 'consent', updated.id);
  return res.json(updated);
});

// PUT /api/consents/:id/stage2 — radiographer files post-procedure report
router.put('/:id/stage2', requireRole('radiographer', 'admin'), async (req, res) => {

  const {
    completedAsPlanned, procedureNotes,
    hasComplications, complicationDetails,
    radiographerSignature,
    radiographerSignatureImage
  } = req.body || {};

  if (!procedureNotes?.trim())
    return res.status(400).json({ error: 'Procedure notes are required.' });
  if (!radiographerSignature?.trim())
    return res.status(400).json({ error: 'Radiographer signature is required.' });

  const existing = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!existing) return res.status(404).json({ error: 'Consent record not found.' });
  if (existing.status !== 'draft_stage1')
    return res.status(409).json({ error: 'Stage 1 must be completed before filing a procedure report.' });

  const updated = await db.update('consents', req.params.id, {
    status: 'draft_stage2',
    stage2: {
      completedAt          : new Date().toISOString(),
      performedBy          : req.user.id,
      performedByName      : req.user.name,
      completedAsPlanned   : completedAsPlanned || 'yes',
      procedureNotes       : procedureNotes.trim(),
      contrastAdministered : false,
      contrastAgent        : null,
      contrastVolume       : null,
      complications        : hasComplications
                               ? (complicationDetails?.trim() || 'Yes — see notes')
                               : 'none',
      radiographerSignature: radiographerSignature.trim(),
      radiographerSignatureImage: radiographerSignatureImage || null,
    },
  }, req.user.clinicId);
  await logAction(req, 'STAGE2_COMPLETED', 'consent', updated.id);
  return res.json(updated);
});

// PUT /api/consents/:id/stage3 — nurse files post-procedure vitals check
router.put('/:id/stage3', requireRole('nurse', 'admin'), async (req, res) => {

  const {
    bloodPressureSystolic, bloodPressureDiastolic,
    pulse, condition, notes, nurseSignature, nurseSignatureImage,
  } = req.body || {};

  if (!condition)
    return res.status(400).json({ error: 'Patient condition is required.' });
  if (!nurseSignature?.trim())
    return res.status(400).json({ error: 'Nurse signature is required.' });

  const existing = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!existing) return res.status(404).json({ error: 'Consent record not found.' });
  if (existing.status !== 'draft_stage2')
    return res.status(409).json({ error: 'Stage 2 must be completed before submitting vitals.' });

  const CONDITION_LABELS = {
    stable     : 'Stable — patient discharged in good condition',
    monitoring : 'Requires Monitoring — patient to be observed before discharge',
    referred   : 'Referred for Further Care — patient referred or admitted',
  };

  const bp = (bloodPressureSystolic && bloodPressureDiastolic)
    ? `${bloodPressureSystolic}/${bloodPressureDiastolic}`
    : null;

  const conditionText = (CONDITION_LABELS[condition] || condition)
    + (notes?.trim() ? `. ${notes.trim()}` : '');

  const now = new Date().toISOString();
  const updated = await db.update('consents', req.params.id, {
    status  : 'closed',
    closedAt: now,
    stage3  : {
      completedAt     : now,
      performedBy     : req.user.id,
      performedByName : req.user.name,
      vitals          : {
        bp         : bp,
        pulse      : pulse ? String(pulse) : null,
        spo2       : null,
        temperature: null,
        rr         : null,
      },
      patientCondition: conditionText,
      nurseSignature      : nurseSignature?.trim() || '',
      nurseSignatureImage : nurseSignatureImage || null,
    },
  }, req.user.clinicId);
  await logAction(req, 'STAGE3_COMPLETED', 'consent', updated.id);
  return res.json(updated);
});

// GET /api/consents/:id/pdf — download structured text export of a closed record
router.get('/:id/pdf', async (req, res) => {
  const doc = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!doc) return res.status(404).json({ error: 'Consent record not found.' });
  if (doc.status !== 'closed')
    return res.status(400).json({ error: 'Only closed records can be exported.' });

  const MODALITY_LABELS = {
    mri_without_contrast : 'MRI (no contrast)',
    mri_with_gadolinium  : 'MRI + Gadolinium',
    ct_with_iv_contrast  : 'CT + IV Contrast',
    mammography          : 'Mammography',
  };

  const SCR_FLAG_LABELS = {
    non_mr_conditional_pacemaker        : 'Pacemaker/ICD — NOT MR-conditional',
    cochlear_implant_unknown            : 'Cochlear implant — type unknown',
    deep_brain_stimulator               : 'Deep brain stimulator',
    aneurysm_clip_unknown               : 'Aneurysm clip — type unknown',
    spinal_cord_stimulator              : 'Spinal cord stimulator',
    metallic_ocular_foreign_body        : 'Metallic ocular foreign body (uncleared)',
    on_dialysis                         : 'Currently on dialysis',
    prior_severe_contrast_reaction      : 'Prior severe contrast reaction',
    pacemaker_unknown_mr_status         : 'Pacemaker/ICD — MR status unknown',
    mr_conditional_pacemaker            : 'MR-conditional pacemaker/ICD',
    implanted_cardiac_monitor           : 'Implanted cardiac monitor',
    prosthetic_heart_valve              : 'Prosthetic heart valve',
    vascular_coil_clip_stent_graft      : 'Vascular coil / clip / stent graft',
    mr_conditional_cochlear_implant     : 'MR-conditional cochlear implant',
    csf_vp_shunt                        : 'CSF / VP shunt',
    orthopaedic_hardware_under_6_weeks  : 'Orthopaedic hardware < 6 weeks post-op',
    insulin_pump                        : 'Insulin pump',
    infusion_port                       : 'Infusion port',
    drug_pump                           : 'Implanted drug pump',
    ckd_reduced_renal_function          : 'CKD / reduced renal function',
    single_kidney                       : 'Single kidney',
    prior_moderate_contrast_reaction    : 'Prior moderate contrast reaction',
    pregnancy                           : 'Possible pregnancy',
    first_trimester_pregnancy_with_gadolinium: 'Possible first-trimester pregnancy + gadolinium',
    claustrophobia                      : 'Severe claustrophobia',
    coronary_stent                      : 'Coronary stent',
    aneurysm_clip_mr_safe               : 'MR-safe aneurysm clip',
    ocular_foreign_body_cleared         : 'Prior ocular foreign body (cleared by X-ray)',
    orthopaedic_hardware_over_6_weeks   : 'Orthopaedic hardware > 6 weeks post-op',
    copper_iud                          : 'Copper IUD',
    hormonal_iud                        : 'Hormonal IUD',
    prior_mild_contrast_reaction        : 'Prior mild contrast reaction',
    prior_surgery_undocumented_implants : 'Prior surgery — undocumented implant risk',
    permanent_tattoos_or_makeup         : 'Permanent tattoos or make-up',
    transdermal_medication_patch        : 'Transdermal medication patch',
  };

  function fmt(iso) {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function val(v) { return (v == null || v === '') ? 'N/A' : String(v); }

  function line(label, value, width) {
    const w = width || 22;
    return `${label.padEnd(w)}: ${val(value)}\n`;
  }

  const HR  = '='.repeat(80) + '\n';
  const hr  = '-'.repeat(80) + '\n';
  const p   = doc.patient || {};
  const s1  = doc.stage1  || {};
  const s2  = doc.stage2  || {};
  const s3  = doc.stage3  || {};
  const rv  = doc.radiologistReview || null;
  const tf  = doc.tierFlags || { tier1: [], tier2: [], tier3: [] };
  const isMri = doc.modality && doc.modality.startsWith('mri');

  let out = '';

  // ── Header ───────────────────────────────────────────────────
  out += HR;
  out += 'RADCONSENT — CONSENT RECORD EXPORT\n';
  out += HR;
  out += line('Record ID',  doc.id);
  out += line('Generated',  fmt(new Date().toISOString()));
  out += line('Status',     'Closed');
  out += HR;

  // ── Section 1: Patient & Procedure ───────────────────────────
  out += 'SECTION 1 — PATIENT & PROCEDURE DETAILS\n';
  out += hr;
  out += line('Full Name',        p.name);
  out += line('Date of Birth',    p.dob);
  out += line('Gender',           p.gender);
  out += line('Hospital Number',  p.hospitalNumber);
  out += line('Phone',            p.phone);
  out += line('Referring Doctor', p.referringDoctor);
  out += '\n';
  out += line('Procedure',        MODALITY_LABELS[doc.modality] || doc.modality);
  out += line('Body Part',        doc.bodyPart);
  out += line('Language',         doc.language);
  out += line('Consent Mode',     doc.consentMode);
  out += line('Record Created',   fmt(doc.createdAt));
  out += line('Record Closed',    fmt(doc.closedAt));
  out += '\n';

  // ── Clinical Vitals & Labs (if recorded at session creation) ──
  const v = p.vitals || {};
  if (p.urea || p.creatinine || v.bp || v.pulse || v.spo2 || v.temperature || v.weight) {
    out += 'Pre-Procedure Clinical Data:\n';
    if (v.weight)      out += line('  Weight',      v.weight + ' kg', 20);
    if (v.bp)          out += line('  BP',          v.bp + ' mmHg', 20);
    if (v.pulse)       out += line('  Heart Rate',  v.pulse + ' bpm', 20);
    if (v.spo2)        out += line('  SpO2',        v.spo2 + ' %', 20);
    if (v.temperature) out += line('  Temperature', v.temperature + ' °C', 20);
    if (p.urea)        out += line('  Urea',        p.urea + ' mmol/L', 20);
    if (p.creatinine)  out += line('  Creatinine',  p.creatinine + ' µmol/L', 20);
    out += '\n';
  }

  // ── Section 2: MRI Safety Screening (MRI modalities only) ────
  if (isMri) {
    out += 'SECTION 2 — MRI SAFETY SCREENING\n';
    out += hr;
    out += line('Screening Completed', fmt(s1.screeningCompletedAt));

    const t1 = tf.tier1 || [];
    const t2 = tf.tier2 || [];
    const t3 = tf.tier3 || [];

    if (t1.length + t2.length + t3.length === 0) {
      out += 'Safety Flags       : None — no flags raised\n';
    } else {
      if (t1.length) {
        out += '\n  [TIER 1 — ABSOLUTE CONTRAINDICATION]\n';
        t1.forEach(f => { out += `    - ${SCR_FLAG_LABELS[f] || f}\n`; });
      }
      if (t2.length) {
        out += '\n  [TIER 2 — REVIEW REQUIRED]\n';
        t2.forEach(f => { out += `    - ${SCR_FLAG_LABELS[f] || f}\n`; });
      }
      if (t3.length) {
        out += '\n  [TIER 3 — AWARENESS ONLY]\n';
        t3.forEach(f => { out += `    - ${SCR_FLAG_LABELS[f] || f}\n`; });
      }
    }

    if (rv) {
      out += '\nRadiologist Review:\n';
      out += line('  Decision',     rv.decision,    14);
      out += line('  Reviewed By',  rv.reviewedByName, 14);
      out += line('  Reviewed At',  fmt(rv.reviewedAt), 14);
      if (rv.notes) {
        out += '  Notes          :\n';
        rv.notes.split('\n').forEach(l => { out += `    ${l}\n`; });
      }
    }
    out += '\n';
  }

  // ── Section 3: Consent Declaration ───────────────────────────
  out += 'SECTION 3 — CONSENT DECLARATION (STAGE 1)\n';
  out += hr;
  out += line('Patient Name',      p.name);
  out += line('Patient Signature', s1.patientSignature);
  out += line('Digital Signature', s1.patientSignatureImage ? 'Captured — image stored in system record' : 'Not captured');
  out += line('Witness',           s1.witnessName);
  out += line('Consent Version',   s1.consentVersion);
  out += line('Signed At',         fmt(s1.completedAt));
  out += '\n';

  // ── Section 4: Radiographer Report ───────────────────────────
  out += 'SECTION 4 — RADIOGRAPHER REPORT (STAGE 2)\n';
  out += hr;
  out += line('Radiographer Name',    s2.performedByName);
  out += line('Completed As Planned', s2.completedAsPlanned);
  out += line('Complications',        s2.complications);
  out += line('Signature',            s2.radiographerSignature);
  out += line('Completed At',         fmt(s2.completedAt));
  if (s2.procedureNotes) {
    out += 'Procedure Notes    :\n';
    s2.procedureNotes.split('\n').forEach(l => { out += `  ${l}\n`; });
  }
  out += '\n';

  // ── Section 5: Nurse Vitals ───────────────────────────────────
  out += 'SECTION 5 — NURSE VITALS CHECK (STAGE 3)\n';
  out += hr;
  out += line('Nurse Name',      s3.performedByName);
  out += line('Blood Pressure',  s3.vitals?.bp   ? s3.vitals.bp   + ' mmHg' : null);
  out += line('Pulse',           s3.vitals?.pulse ? s3.vitals.pulse + ' bpm'  : null);
  out += line('Patient Condition', s3.patientCondition);
  out += line('Signature',       s3.nurseSignature);
  out += line('Completed At',    fmt(s3.completedAt));
  out += '\n';

  // ── Footer ────────────────────────────────────────────────────
  out += HR;
  out += 'This record was generated by RadConsent v1.0 and is a legal clinical document.\n';
  out += HR;

  const filename = `radconsent-${doc.id}.txt`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(out);
});

// PUT /api/consents/:id/review — radiologist records their decision
router.put('/:id/review', requireRole('radiologist', 'admin'), async (req, res) => {

  const { decision, notes, radiologistSignature, radiologistSignatureImage } = req.body || {};

  const VALID = ['approved', 'proceed_with_modifications', 'declined'];
  if (!VALID.includes(decision))
    return res.status(400).json({ error: 'Invalid decision value.' });
  if (!notes?.trim())
    return res.status(400).json({ error: 'Clinical notes are required.' });
  if (!radiologistSignature?.trim())
    return res.status(400).json({ error: 'Radiologist signature is required.' });

  const existing = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!existing) return res.status(404).json({ error: 'Consent record not found.' });
  if (existing.status !== 'pending_review' && existing.status !== 'flagged_tier1')
    return res.status(409).json({ error: 'This record is not awaiting radiologist review.' });

  // approved/proceed_with_modifications → awaiting_signature (patient must still sign)
  const newStatus = decision === 'declined' ? 'declined' : 'awaiting_signature';
  const updated = await db.update('consents', req.params.id, {
    status: newStatus,
    radiologistReview: {
      decision,
      notes               : notes.trim(),
      radiologistSignature: radiologistSignature.trim(),
      radiologistSignatureImage: radiologistSignatureImage || null,
      reviewedBy          : req.user.id,
      reviewedByName      : req.user.name,
      reviewedAt          : new Date().toISOString(),
    },
  }, req.user.clinicId);
  await logAction(req, 'RADIOLOGIST_REVIEWED', 'consent', updated.id, { decision });
  return res.json(updated);
});

// PUT /api/consents/:id/recall — admin recalls a declined record back to active queue
router.put('/:id/recall', requireRole('admin'), async (req, res) => {

  const existing = await db.findOne('consents', { id: req.params.id }, req.user.clinicId);
  if (!existing) return res.status(404).json({ error: 'Consent record not found.' });
  if (existing.status !== 'declined')
    return res.status(409).json({ error: 'Only declined records can be recalled.' });

  const tf = existing.tierFlags || { tier1: [], tier2: [], tier3: [] };
  const backStatus = tf.tier1?.length > 0 ? 'flagged_tier1'
                   : tf.tier2?.length > 0 ? 'pending_review'
                   : 'in_progress';

  const updated = await db.update('consents', req.params.id, {
    status: backStatus,
    radiologistReview: null
  }, req.user.clinicId);
  await logAction(req, 'CONSENT_RECALLED', 'consent', updated.id);
  return res.json(updated);
});

// DELETE /api/consents/:id — admin deletes a single consent record
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const removed = await db.remove('consents', req.params.id, req.user.clinicId);
  if (!removed) return res.status(404).json({ error: 'Consent record not found.' });
  await logAction(req, 'CONSENT_DELETED', 'consent', req.params.id);
  return res.json({ ok: true });
});

// DELETE /api/consents — admin deletes all consent records
router.delete('/', requireRole('admin'), async (req, res) => {
  const count = await db.removeAll('consents', req.user.clinicId);
  await logAction(req, 'ALL_CONSENTS_DELETED', 'consent', null, { count });
  return res.json({ ok: true, deleted: count });
});

module.exports = router;
