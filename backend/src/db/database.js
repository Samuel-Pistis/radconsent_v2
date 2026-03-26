'use strict';

const { pool } = require('./db-setup');
const { v4: uuidv4 } = require('uuid');

// ── Generic async CRUD helpers ────────────────────────────────
// All functions accept an optional clinicId to enforce tenant isolation.
// JSON fields (JSONB in PostgreSQL) are returned as objects automatically.

async function all(table, clinicId) {
  const q = clinicId
    ? `SELECT * FROM "${table}" WHERE "clinicId" = $1 ORDER BY "createdAt" DESC`
    : `SELECT * FROM "${table}" ORDER BY "createdAt" DESC`;
  const result = await pool.query(q, clinicId ? [clinicId] : []);
  return result.rows;
}

async function insert(table, doc, clinicId) {
  const now    = new Date().toISOString();
  const newDoc = { id: uuidv4(), createdAt: now, updatedAt: now, ...doc };
  if (clinicId) newDoc.clinicId = clinicId;

  const keys   = Object.keys(newDoc);
  const cols   = keys.map(k => `"${k}"`).join(', ');
  const params = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(k => newDoc[k]);

  await pool.query(`INSERT INTO "${table}" (${cols}) VALUES (${params})`, values);
  return newDoc;
}

async function update(table, id, updates, clinicId) {
  const existing = await findOne(table, { id }, clinicId);
  if (!existing) return null;

  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const fields = Object.keys(merged).filter(k => k !== 'id' && k !== 'clinicId');
  const set    = fields.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = [...fields.map(k => merged[k]), id];

  let q = `UPDATE "${table}" SET ${set} WHERE id = $${values.length}`;
  if (clinicId) { q += ` AND "clinicId" = $${values.length + 1}`; values.push(clinicId); }

  await pool.query(q, values);
  return merged;
}

async function remove(table, id, clinicId) {
  const values = [id];
  let q = `DELETE FROM "${table}" WHERE id = $1`;
  if (clinicId) { q += ` AND "clinicId" = $2`; values.push(clinicId); }
  const result = await pool.query(q, values);
  return result.rowCount > 0;
}

async function findOne(table, query, clinicId) {
  const entries = Object.entries(query);
  const conds   = entries.map(([k], i) => `"${k}" = $${i + 1}`);
  const values  = entries.map(([, v]) => v);

  if (clinicId) { conds.push(`"clinicId" = $${conds.length + 1}`); values.push(clinicId); }

  const q = `SELECT * FROM "${table}" WHERE ${conds.join(' AND ')} LIMIT 1`;
  const result = await pool.query(q, values);
  return result.rows[0] || null;
}

async function findMany(table, query, clinicId) {
  const entries = Object.entries(query);
  const conds   = entries.map(([k], i) => `"${k}" = $${i + 1}`);
  const values  = entries.map(([, v]) => v);

  if (clinicId) { conds.push(`"clinicId" = $${conds.length + 1}`); values.push(clinicId); }

  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM "${table}" ${where} ORDER BY "createdAt" DESC`, values
  );
  return result.rows;
}

async function removeAll(table, clinicId) {
  const values = [];
  let q = `DELETE FROM "${table}"`;
  if (clinicId) { q += ` WHERE "clinicId" = $1`; values.push(clinicId); }
  const result = await pool.query(q, values);
  return result.rowCount;
}

// ── Demo consent seed ─────────────────────────────────────────
async function loadDemoConsents(clinicId) {
  const IDS = {
    radiographer : '11111111-0000-0000-0000-000000000001',
    nurse        : '22222222-0000-0000-0000-000000000002',
    con1         : 'c0000001-0000-0000-0000-000000000001',
    con2         : 'c0000002-0000-0000-0000-000000000002',
    con3         : 'c0000003-0000-0000-0000-000000000003',
    con4         : 'c0000004-0000-0000-0000-000000000004',
    con5         : 'c0000005-0000-0000-0000-000000000005',
  };

  const now = new Date().toISOString();
  const consents = [
    { id: IDS.con1, clinicId, status: 'draft_stage1', modality: 'mri_with_gadolinium',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Emeka Nwosu', dob: '1980-03-15', gender: 'male', phone: '08012345678', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: [], tier3: ['orthopaedic_hardware_over_6_weeks'] },
      stage1: { completedAt: '2025-01-15T09:42:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Emeka Nwosu', screening: {} },
      stage2: null, stage3: null, radiologistReview: null,
      createdAt: '2025-01-15T09:30:00.000Z', updatedAt: '2025-01-15T09:42:00.000Z', closedAt: null },
    { id: IDS.con2, clinicId, status: 'draft_stage2', modality: 'ct_with_iv_contrast',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Ngozi Adekunle', dob: '1987-07-22', gender: 'female', phone: '07098765432', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: [], tier3: ['prior_mild_contrast_reaction'] },
      stage1: { completedAt: '2025-01-10T10:15:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Ngozi Adekunle', screening: {} },
      stage2: { completedAt: '2025-01-10T12:30:00.000Z', performedBy: IDS.radiographer, performedByName: 'Chidi Eze', procedureNotes: 'CT abdomen and pelvis with IV contrast.', contrastAdministered: true, contrastAgent: 'Omnipaque 300', contrastVolume: '80ml', complications: 'none', radiographerSignature: 'Chidi Eze' },
      stage3: null, radiologistReview: null,
      createdAt: '2025-01-10T10:00:00.000Z', updatedAt: '2025-01-10T12:30:00.000Z', closedAt: null },
    { id: IDS.con3, clinicId, status: 'flagged_tier1', modality: 'mri_without_contrast',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Babatunde Okafor', dob: '1963-11-05', gender: 'male', phone: '08098765432', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: ['non_mr_conditional_pacemaker'], tier2: [], tier3: [] },
      stage1: { completedAt: '2025-01-08T11:00:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Babatunde Okafor', screening: {} },
      stage2: null, stage3: null, radiologistReview: { reviewedAt: null, reviewedBy: null, reviewedByName: null, decision: null, notes: null },
      createdAt: '2025-01-08T10:45:00.000Z', updatedAt: '2025-01-08T11:00:00.000Z', closedAt: null },
    { id: IDS.con4, clinicId, status: 'pending_review', modality: 'mri_with_gadolinium',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Amina Yusuf', dob: '2001-09-12', gender: 'female', phone: '08123456789', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: ['first_trimester_pregnancy_with_gadolinium'], tier3: [] },
      stage1: { completedAt: '2025-01-20T08:55:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Amina Yusuf', screening: {} },
      stage2: null, stage3: null, radiologistReview: { reviewedAt: null, reviewedBy: null, reviewedByName: null, decision: null, notes: null },
      createdAt: '2025-01-20T08:40:00.000Z', updatedAt: '2025-01-20T08:55:00.000Z', closedAt: null },
    { id: IDS.con5, clinicId, status: 'closed', modality: 'mammography',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Chidinma Obi', dob: '1971-04-30', gender: 'female', phone: '08034567890', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: [], tier3: [] },
      stage1: { completedAt: '2024-12-20T09:00:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Chidinma Obi', screening: {} },
      stage2: { completedAt: '2024-12-20T10:15:00.000Z', performedBy: IDS.radiographer, performedByName: 'Chidi Eze', procedureNotes: 'Bilateral mammography, CC and MLO views.', contrastAdministered: false, contrastAgent: null, contrastVolume: null, complications: 'none', radiographerSignature: 'Chidi Eze' },
      stage3: { completedAt: '2024-12-20T10:45:00.000Z', performedBy: IDS.nurse, performedByName: 'Amaka Obi', vitals: { bp: '118/76', pulse: '72', spo2: '99', temperature: '36.5', rr: '16' }, patientCondition: 'Stable. Cleared for discharge.', nurseSignature: 'Amaka Obi' },
      radiologistReview: null,
      createdAt: '2024-12-20T08:45:00.000Z', updatedAt: '2024-12-20T10:45:00.000Z', closedAt: '2024-12-20T10:45:00.000Z' },
  ];

  // Delete existing demo records for this clinic, then insert fresh ones
  await pool.query(`DELETE FROM consents WHERE "clinicId" = $1 AND id LIKE 'c0000%'`, [clinicId]);

  for (const c of consents) {
    await pool.query(
      `INSERT INTO consents (id,"clinicId",status,modality,language,"consentMode","bodyPart",
        patient,"tierFlags",stage1,stage2,stage3,"radiologistReview","createdAt","updatedAt","closedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, "updatedAt"=EXCLUDED."updatedAt"`,
      [c.id, c.clinicId, c.status, c.modality, c.language, c.consentMode, c.bodyPart,
       c.patient, c.tierFlags, c.stage1, c.stage2, c.stage3, c.radiologistReview,
       c.createdAt, c.updatedAt, c.closedAt]
    );
  }

  console.log(`[DB] Loaded ${consents.length} demo consents for clinic ${clinicId}`);
  return consents.length;
}

module.exports = { all, insert, update, remove, findOne, findMany, removeAll, loadDemoConsents };
