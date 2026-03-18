'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('./db-setup');

// ═══════════════════════════════════════════════════════════════
//  Helper: parse/serialize JSON fields
// ═══════════════════════════════════════════════════════════════

const JSON_FIELDS = {
  consents: ['patient', 'tierFlags', 'stage1', 'stage2', 'stage3', 'radiologistReview']
};

function parseDoc(collection, row) {
  if (!row) return null;
  const parsed = { ...row };
  const jsonFields = JSON_FIELDS[collection] || [];
  
  for (const field of jsonFields) {
    if (parsed[field] !== undefined) {
      if (parsed[field] === null) {
        parsed[field] = null;
      } else {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch(e) {
          console.error(`Failed to parse JSON for field ${field}`, e);
        }
      }
    }
  }
  return parsed;
}

function serializeDoc(collection, doc) {
  const serialized = { ...doc };
  const jsonFields = JSON_FIELDS[collection] || [];
  
  for (const field of jsonFields) {
    if (serialized[field] !== undefined) {
      serialized[field] = serialized[field] === null ? null : JSON.stringify(serialized[field]);
    }
  }
  return serialized;
}

// ═══════════════════════════════════════════════════════════════
//  Collection helpers
// ═══════════════════════════════════════════════════════════════

/** Return every document in a collection. */
function all(collection) {
  try {
    const stmt = db.prepare(`SELECT * FROM ${collection}`);
    const rows = stmt.all();
    return rows.map(r => parseDoc(collection, r));
  } catch (err) {
    console.error(`Error in all(${collection}):`, err);
    return [];
  }
}

/**
 * Insert a new document. Auto-assigns id, createdAt, updatedAt if absent.
 * A pre-set id in doc will override the auto-generated one.
 * Returns the inserted document.
 */
function insert(collection, doc) {
  const now = new Date().toISOString();
  const newDoc = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...doc,
  };
  
  const serialized = serializeDoc(collection, newDoc);
  const keys = Object.keys(serialized);
  
  const placeholders = keys.map(k => `@${k}`).join(', ');
  const colNames = keys.join(', ');
  
  const query = `INSERT INTO ${collection} (${colNames}) VALUES (${placeholders})`;
  
  try {
    const stmt = db.prepare(query);
    stmt.run(serialized);
    return newDoc;
  } catch(err) {
    console.error(`Error in insert(${collection}):`, err);
    throw err;
  }
}

/**
 * Update a document by id. Merges updates and refreshes updatedAt.
 * Returns the updated document, or null if not found.
 */
function update(collection, id, updates) {
  // First get the existing doc so we can merge updates into the nested JSON (if any)
  const existing = findOne(collection, { id });
  if (!existing) return null;
  
  const merged = { 
    ...existing, 
    ...updates, 
    updatedAt: new Date().toISOString() 
  };
  
  const serialized = serializeDoc(collection, merged);
  
  const updateFields = Object.keys(serialized)
    .filter(k => k !== 'id')
    .map(k => `${k} = @${k}`)
    .join(', ');
    
  const query = `UPDATE ${collection} SET ${updateFields} WHERE id = @id`;
  
  try {
    const stmt = db.prepare(query);
    stmt.run({ ...serialized, id });
    return merged;
  } catch(err) {
    console.error(`Error in update(${collection}):`, err);
    throw err;
  }
}

/**
 * Remove a document by id.
 * Returns true if removed, false if not found.
 */
function remove(collection, id) {
  try {
    const info = db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
    return info.changes > 0;
  } catch(err) {
    console.error(`Error in remove(${collection}):`, err);
    return false;
  }
}

/**
 * Find the first document where every key in query matches.
 * Returns the document or null.
 */
function findOne(collection, query) {
  // For SQLite, if the query includes json fields, we'll just fetch all and filter in memory, 
  // since the dataset is relatively small and json querying varies.
  // We can optimize simple queries like `id` here.
  
  const keys = Object.keys(query);
  const jsonFields = JSON_FIELDS[collection] || [];
  
  const hasJsonFieldsInQuery = keys.some(k => jsonFields.includes(k));
  
  if (!hasJsonFieldsInQuery && keys.length > 0) {
    // Normal SQL lookup
    const conditions = keys.map(k => `${k} = @${k}`).join(' AND ');
    const stmt = db.prepare(`SELECT * FROM ${collection} WHERE ${conditions} LIMIT 1`);
    try {
      const row = stmt.get(query);
      return parseDoc(collection, row) || null;
    } catch(err) {
      console.error(`Error in findOne optimized(${collection}):`, err);
    }
  }
  
  // Fallback to in-memory filter
  const docs = all(collection);
  return docs.find(doc =>
    Object.entries(query).every(([k, v]) => doc[k] === v)
  ) || null;
}

/**
 * Find all documents where every key in query matches.
 * Returns an array (may be empty).
 */
function findMany(collection, query) {
  const keys = Object.keys(query);
  const jsonFields = JSON_FIELDS[collection] || [];
  
  const hasJsonFieldsInQuery = keys.some(k => jsonFields.includes(k));
  
  if (!hasJsonFieldsInQuery && keys.length > 0) {
    // Normal SQL lookup
    const conditions = keys.map(k => `${k} = @${k}`).join(' AND ');
    const stmt = db.prepare(`SELECT * FROM ${collection} WHERE ${conditions}`);
    try {
      const rows = stmt.all(query);
      return rows.map(r => parseDoc(collection, r));
    } catch(err) {
      console.error(`Error in findMany optimized(${collection}):`, err);
    }
  }
  
  // Fallback to in-memory filter
  const docs = all(collection);
  return docs.filter(doc =>
    Object.entries(query).every(([k, v]) => doc[k] === v)
  );
}

/**
 * Filter documents using an arbitrary predicate function.
 * Returns an array (may be empty).
 */
function filter(collection, fn) {
  return all(collection).filter(fn);
}

/**
 * Remove ALL documents from a collection.
 * Returns the number of deleted rows.
 */
function removeAll(collection) {
  try {
    const info = db.prepare(`DELETE FROM ${collection}`).run();
    return info.changes;
  } catch(err) {
    console.error(`Error in removeAll(${collection}):`, err);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
//  Demo consent seed data
// ═══════════════════════════════════════════════════════════════

function loadDemoConsents() {
  // Fixed IDs for cross-reference consistency
  const IDS = {
    radiographer : '11111111-0000-0000-0000-000000000001',
    nurse        : '22222222-0000-0000-0000-000000000002',
    con1         : 'c0000001-0000-0000-0000-000000000001',
    con2         : 'c0000002-0000-0000-0000-000000000002',
    con3         : 'c0000003-0000-0000-0000-000000000003',
    con4         : 'c0000004-0000-0000-0000-000000000004',
    con5         : 'c0000005-0000-0000-0000-000000000005',
  };

  const consents = [
    // Record 1 — draft_stage1 (awaiting radiographer report)
    {
      id: IDS.con1, status: 'draft_stage1', modality: 'mri_with_gadolinium',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Emeka Nwosu', dob: '1980-03-15', gender: 'male', phone: '08012345678', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: [], tier3: ['orthopaedic_hardware_over_6_weeks'] },
      stage1: { completedAt: '2025-01-15T09:42:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Emeka Nwosu', screening: { orthopaedic: { hasScrewsPlatesRods: true, isLessThan6WeeksAgo: false } } },
      stage2: null, stage3: null, radiologistReview: null,
      createdAt: '2025-01-15T09:30:00.000Z', updatedAt: '2025-01-15T09:42:00.000Z', closedAt: null,
    },
    // Record 2 — draft_stage2 (awaiting nurse vitals)
    {
      id: IDS.con2, status: 'draft_stage2', modality: 'ct_with_iv_contrast',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Ngozi Adekunle', dob: '1987-07-22', gender: 'female', phone: '07098765432', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: [], tier3: ['prior_mild_contrast_reaction'] },
      stage1: { completedAt: '2025-01-10T10:15:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Ngozi Adekunle', screening: {} },
      stage2: { completedAt: '2025-01-10T12:30:00.000Z', performedBy: IDS.radiographer, performedByName: 'Chidi Eze', procedureNotes: 'CT abdomen and pelvis with IV contrast. Patient tolerated procedure well. No acute adverse reaction observed.', contrastAdministered: true, contrastAgent: 'Omnipaque 300', contrastVolume: '80ml', complications: 'none', radiographerSignature: 'Chidi Eze' },
      stage3: null, radiologistReview: null,
      createdAt: '2025-01-10T10:00:00.000Z', updatedAt: '2025-01-10T12:30:00.000Z', closedAt: null,
    },
    // Record 3 — flagged_tier1 (absolute contraindication, awaiting radiologist)
    {
      id: IDS.con3, status: 'flagged_tier1', modality: 'mri_without_contrast',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Babatunde Okafor', dob: '1963-11-05', gender: 'male', phone: '08098765432', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: ['non_mr_conditional_pacemaker'], tier2: [], tier3: [] },
      stage1: { completedAt: '2025-01-08T11:00:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Babatunde Okafor', screening: { cardiac: { hasPacemaker: true, pacemakerMRStatus: 'non_mr_conditional' } } },
      stage2: null, stage3: null,
      radiologistReview: { reviewedAt: null, reviewedBy: null, reviewedByName: null, decision: null, notes: null },
      createdAt: '2025-01-08T10:45:00.000Z', updatedAt: '2025-01-08T11:00:00.000Z', closedAt: null,
    },
    // Record 4 — pending_review (tier2 flag, awaiting radiologist)
    {
      id: IDS.con4, status: 'pending_review', modality: 'mri_with_gadolinium',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Amina Yusuf', dob: '2001-09-12', gender: 'female', phone: '08123456789', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: ['first_trimester_pregnancy_with_gadolinium'], tier3: [] },
      stage1: { completedAt: '2025-01-20T08:55:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Amina Yusuf', screening: { pregnancy: { isPossiblyPregnant: true, trimester: 1 } } },
      stage2: null, stage3: null,
      radiologistReview: { reviewedAt: null, reviewedBy: null, reviewedByName: null, decision: null, notes: null },
      createdAt: '2025-01-20T08:40:00.000Z', updatedAt: '2025-01-20T08:55:00.000Z', closedAt: null,
    },
    // Record 5 — closed (all stages complete, PDF-exportable)
    {
      id: IDS.con5, status: 'closed', modality: 'mammography',
      language: 'en', consentMode: 'assisted', bodyPart: null,
      patient: { name: 'Chidinma Obi', dob: '1971-04-30', gender: 'female', phone: '08034567890', hospitalNumber: null, referringDoctor: null },
      tierFlags: { tier1: [], tier2: [], tier3: [] },
      stage1: { completedAt: '2024-12-20T09:00:00.000Z', consentVersion: 'v1.0-en', consentAcknowledged: true, patientSignature: 'Chidinma Obi', screening: {} },
      stage2: { completedAt: '2024-12-20T10:15:00.000Z', performedBy: IDS.radiographer, performedByName: 'Chidi Eze', procedureNotes: 'Bilateral mammography, CC and MLO views. Standard screening protocol followed. Patient cooperative throughout.', contrastAdministered: false, contrastAgent: null, contrastVolume: null, complications: 'none', radiographerSignature: 'Chidi Eze' },
      stage3: { completedAt: '2024-12-20T10:45:00.000Z', performedBy: IDS.nurse, performedByName: 'Amaka Obi', vitals: { bp: '118/76', pulse: '72', spo2: '99', temperature: '36.5', rr: '16' }, patientCondition: 'Stable. Patient comfortable and fully oriented. Cleared for discharge.', nurseSignature: 'Amaka Obi' },
      radiologistReview: null,
      createdAt: '2024-12-20T08:45:00.000Z', updatedAt: '2024-12-20T10:45:00.000Z', closedAt: '2024-12-20T10:45:00.000Z',
    },
  ];

  // Replace all existing consents with demo records (transaction)
  const deleteAll = db.prepare('DELETE FROM consents');
  const insertOne = db.prepare(`
    INSERT OR REPLACE INTO consents
      (id, status, modality, language, consentMode, bodyPart, patient, tierFlags,
       stage1, stage2, stage3, radiologistReview, createdAt, updatedAt, closedAt)
    VALUES
      (@id, @status, @modality, @language, @consentMode, @bodyPart, @patient, @tierFlags,
       @stage1, @stage2, @stage3, @radiologistReview, @createdAt, @updatedAt, @closedAt)
  `);

  const run = db.transaction(() => {
    deleteAll.run();
    for (const c of consents) {
      insertOne.run({
        ...c,
        patient           : JSON.stringify(c.patient),
        tierFlags         : JSON.stringify(c.tierFlags),
        stage1            : c.stage1            ? JSON.stringify(c.stage1)            : null,
        stage2            : c.stage2            ? JSON.stringify(c.stage2)            : null,
        stage3            : c.stage3            ? JSON.stringify(c.stage3)            : null,
        radiologistReview : c.radiologistReview ? JSON.stringify(c.radiologistReview) : null,
      });
    }
  });

  run();
  console.log(`[DB] Loaded ${consents.length} demo consent records.`);
  return consents.length;
}

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = { 
  all, insert, update, remove, removeAll, findOne, findMany, filter, loadDemoConsents,
  // the following are deprecated but kept for avoiding crashing external code
  read: () => {}, 
  write: () => {} 
};
