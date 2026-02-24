'use strict';

const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data.json');

// ═══════════════════════════════════════════════════════════════
//  Core I/O
// ═══════════════════════════════════════════════════════════════

function read() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ═══════════════════════════════════════════════════════════════
//  Collection helpers
// ═══════════════════════════════════════════════════════════════

/** Return every document in a collection. */
function all(collection) {
  const db = read();
  return db[collection] || [];
}

/**
 * Insert a new document. Auto-assigns id, createdAt, updatedAt if absent.
 * A pre-set id in doc will override the auto-generated one.
 * Returns the inserted document.
 */
function insert(collection, doc) {
  const db = read();
  if (!db[collection]) db[collection] = [];
  const now = new Date().toISOString();
  const newDoc = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...doc,
  };
  db[collection].push(newDoc);
  write(db);
  return newDoc;
}

/**
 * Update a document by id. Merges updates and refreshes updatedAt.
 * Returns the updated document, or null if not found.
 */
function update(collection, id, updates) {
  const db = read();
  const col = db[collection] || [];
  const idx = col.findIndex(d => d.id === id);
  if (idx === -1) return null;
  col[idx] = { ...col[idx], ...updates, updatedAt: new Date().toISOString() };
  db[collection] = col;
  write(db);
  return col[idx];
}

/**
 * Remove a document by id.
 * Returns true if removed, false if not found.
 */
function remove(collection, id) {
  const db = read();
  const col = db[collection] || [];
  const idx = col.findIndex(d => d.id === id);
  if (idx === -1) return false;
  col.splice(idx, 1);
  db[collection] = col;
  write(db);
  return true;
}

/**
 * Find the first document where every key in query matches.
 * Returns the document or null.
 */
function findOne(collection, query) {
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

// ═══════════════════════════════════════════════════════════════
//  Seed data
// ═══════════════════════════════════════════════════════════════

// Fixed IDs so cross-references (e.g. stage2.performedBy) stay consistent
// across every cold-start of the database.
const IDS = {
  radiographer : '11111111-0000-0000-0000-000000000001',
  nurse        : '22222222-0000-0000-0000-000000000002',
  radiologist  : '33333333-0000-0000-0000-000000000003',
  admin        : '44444444-0000-0000-0000-000000000004',
  con1         : 'c0000001-0000-0000-0000-000000000001', // draft_stage1
  con2         : 'c0000002-0000-0000-0000-000000000002', // draft_stage2
  con3         : 'c0000003-0000-0000-0000-000000000003', // flagged_tier1
  con4         : 'c0000004-0000-0000-0000-000000000004', // pending_review
  con5         : 'c0000005-0000-0000-0000-000000000005', // closed
};

function buildSeedData() {
  const pw = bcrypt.hashSync('demo1234', 10);

  // ── Users ──────────────────────────────────────────────────
  const users = [
    {
      id: IDS.radiographer,
      email: 'radiographer@radconsent.demo',
      password: pw,
      role: 'radiographer',
      name: 'Chidi Eze',
      createdAt: '2025-01-01T08:00:00.000Z',
      updatedAt: '2025-01-01T08:00:00.000Z',
    },
    {
      id: IDS.nurse,
      email: 'nurse@radconsent.demo',
      password: pw,
      role: 'nurse',
      name: 'Amaka Obi',
      createdAt: '2025-01-01T08:00:00.000Z',
      updatedAt: '2025-01-01T08:00:00.000Z',
    },
    {
      id: IDS.radiologist,
      email: 'radiologist@radconsent.demo',
      password: pw,
      role: 'radiologist',
      name: 'Dr. Amara Okonkwo',
      createdAt: '2025-01-01T08:00:00.000Z',
      updatedAt: '2025-01-01T08:00:00.000Z',
    },
    {
      id: IDS.admin,
      email: 'admin@radconsent.demo',
      password: pw,
      role: 'admin',
      name: 'Admin User',
      createdAt: '2025-01-01T08:00:00.000Z',
      updatedAt: '2025-01-01T08:00:00.000Z',
    },
  ];

  // ── Screening templates ─────────────────────────────────────

  // Full 12-domain MRI screening — clean except orthopaedic hardware >6 weeks (Tier 3)
  const mriScreening_tier3_ortho = {
    cardiac: {
      hasPacemaker: false, pacemakerMRStatus: null,
      hasICD: false, icdMRStatus: null,
      hasCardiacMonitor: false,
      hasCoronaryStent: false,
      hasHeartValve: false,
      hasVascularClipsCoils: false,
    },
    neurological: {
      hasCochlearImplant: false, cochlearImplantType: null,
      hasDeepBrainStimulator: false,
      hasAneurysmClip: false, aneurysmClipType: null,
      hasSpinalCordStimulator: false,
      hasVPShunt: false,
    },
    ocular: {
      hasWeldingGrindingHistory: false,
      hasMetallicForeignBody: false,
      foreignBodyClearedByXray: null,
    },
    orthopaedic: {
      hasJointReplacement: false,
      hasScrewsPlatesRods: true,
      surgeryDescription: 'Right tibial fracture ORIF (2022)',
      isLessThan6WeeksAgo: false,
    },
    otherImplants: {
      hasInsulinPump: false,
      hasIUD: false, iudType: null,
      hasInfusionPort: false,
      hasPenileImplant: false,
      hasDrugPump: false,
    },
    renal: {
      onDialysis: false,
      hasCKD: false, ckdStage: null,
      hasSingleKidney: false,
    },
    allergy: {
      hasPriorContrastReaction: false,
      reactionSeverity: null,
    },
    pregnancy: {
      // Male patient — not applicable
      isPossiblyPregnant: null,
      trimester: null,
      isBreastfeeding: null,
    },
    claustrophobia: {
      hasClaustrophobia: false,
      severity: null,
      hadPriorMRIFailure: false,
    },
    surgical: {
      hadPriorSurgery: true,
      surgeryDetails: 'Right tibia ORIF 2022',
    },
    tattoosPiercings: {
      hasPermanentTattoos: false,
      hasNonRemovablePiercings: false,
    },
    transdermalPatches: {
      hasTransdermalPatch: false,
      patchDetails: null,
    },
  };

  // Full 12-domain MRI screening — Tier 1: non-MR-conditional pacemaker
  const mriScreening_tier1_pacemaker = {
    cardiac: {
      hasPacemaker: true, pacemakerMRStatus: 'non_mr_conditional',
      hasICD: false, icdMRStatus: null,
      hasCardiacMonitor: false,
      hasCoronaryStent: false,
      hasHeartValve: false,
      hasVascularClipsCoils: false,
    },
    neurological: {
      hasCochlearImplant: false, cochlearImplantType: null,
      hasDeepBrainStimulator: false,
      hasAneurysmClip: false, aneurysmClipType: null,
      hasSpinalCordStimulator: false,
      hasVPShunt: false,
    },
    ocular: {
      hasWeldingGrindingHistory: false,
      hasMetallicForeignBody: false,
      foreignBodyClearedByXray: null,
    },
    orthopaedic: {
      hasJointReplacement: false,
      hasScrewsPlatesRods: false,
      surgeryDescription: null,
      isLessThan6WeeksAgo: null,
    },
    otherImplants: {
      hasInsulinPump: false,
      hasIUD: false, iudType: null,
      hasInfusionPort: false,
      hasPenileImplant: false,
      hasDrugPump: false,
    },
    renal: {
      onDialysis: false,
      hasCKD: false, ckdStage: null,
      hasSingleKidney: false,
    },
    allergy: {
      hasPriorContrastReaction: false,
      reactionSeverity: null,
    },
    pregnancy: {
      isPossiblyPregnant: null, // Male patient
      trimester: null,
      isBreastfeeding: null,
    },
    claustrophobia: {
      hasClaustrophobia: false,
      severity: null,
      hadPriorMRIFailure: false,
    },
    surgical: {
      hadPriorSurgery: true,
      surgeryDetails: 'Pacemaker implant 2018 — Medtronic Sigma SDR303, confirmed non-MR-conditional',
    },
    tattoosPiercings: {
      hasPermanentTattoos: false,
      hasNonRemovablePiercings: false,
    },
    transdermalPatches: {
      hasTransdermalPatch: false,
      patchDetails: null,
    },
  };

  // Full 12-domain MRI screening — Tier 2: first-trimester pregnancy + gadolinium
  const mriScreening_tier2_pregnancy = {
    cardiac: {
      hasPacemaker: false, pacemakerMRStatus: null,
      hasICD: false, icdMRStatus: null,
      hasCardiacMonitor: false,
      hasCoronaryStent: false,
      hasHeartValve: false,
      hasVascularClipsCoils: false,
    },
    neurological: {
      hasCochlearImplant: false, cochlearImplantType: null,
      hasDeepBrainStimulator: false,
      hasAneurysmClip: false, aneurysmClipType: null,
      hasSpinalCordStimulator: false,
      hasVPShunt: false,
    },
    ocular: {
      hasWeldingGrindingHistory: false,
      hasMetallicForeignBody: false,
      foreignBodyClearedByXray: null,
    },
    orthopaedic: {
      hasJointReplacement: false,
      hasScrewsPlatesRods: false,
      surgeryDescription: null,
      isLessThan6WeeksAgo: null,
    },
    otherImplants: {
      hasInsulinPump: false,
      hasIUD: false, iudType: null,
      hasInfusionPort: false,
      hasPenileImplant: false,
      hasDrugPump: false,
    },
    renal: {
      onDialysis: false,
      hasCKD: false, ckdStage: null,
      hasSingleKidney: false,
    },
    allergy: {
      hasPriorContrastReaction: false,
      reactionSeverity: null,
    },
    pregnancy: {
      isPossiblyPregnant: true,
      trimester: 1,
      isBreastfeeding: false,
    },
    claustrophobia: {
      hasClaustrophobia: false,
      severity: null,
      hadPriorMRIFailure: false,
    },
    surgical: {
      hadPriorSurgery: false,
      surgeryDetails: null,
    },
    tattoosPiercings: {
      hasPermanentTattoos: false,
      hasNonRemovablePiercings: false,
    },
    transdermalPatches: {
      hasTransdermalPatch: false,
      patchDetails: null,
    },
  };

  // CT screening — mild prior contrast reaction (Tier 3, awareness only)
  const ctScreening_tier3_mildReaction = {
    allergy: {
      hasPriorContrastReaction: true,
      reactionSeverity: 'mild',
    },
    renal: {
      onDialysis: false,
      hasCKD: false, ckdStage: null,
      hasSingleKidney: false,
    },
    pregnancy: {
      isPossiblyPregnant: false,
      trimester: null,
      isBreastfeeding: false,
    },
    surgical: {
      hadPriorSurgery: false,
      surgeryDetails: null,
    },
  };

  // Mammography screening — clean
  const mammographyScreening_clean = {
    pregnancy: {
      isPossiblyPregnant: false,
      trimester: null,
      isBreastfeeding: false,
    },
    breastHistory: {
      hadPriorBreastSurgery: false,
      hasBreastImplants: false,
      implantType: null,
    },
    lastMammogramDate: '2023-04-15',
    familyHistoryBreastCancer: false,
    currentSymptoms: false,
    symptomsDescription: null,
  };

  // ── Consent records ─────────────────────────────────────────
  const consents = [

    // ──────────────────────────────────────────────────────────
    // Record 1 — draft_stage1
    // MRI with Gadolinium. Patient signed + screened (Tier 3 only).
    // Awaiting radiographer post-procedure report.
    // ──────────────────────────────────────────────────────────
    {
      id: IDS.con1,
      status: 'draft_stage1',
      modality: 'mri_with_gadolinium',
      language: 'en',
      patient: {
        name: 'Emeka Nwosu',
        dob: '1980-03-15',
        gender: 'male',
        phone: '08012345678',
        address: '14 Bode Thomas Street, Surulere, Lagos',
      },
      tierFlags: {
        tier1: [],
        tier2: [],
        tier3: ['orthopaedic_hardware_over_6_weeks'],
      },
      stage1: {
        completedAt: '2025-01-15T09:42:00.000Z',
        consentVersion: 'v1.0-en',
        consentAcknowledged: true,
        patientSignature: 'Emeka Nwosu',
        screening: mriScreening_tier3_ortho,
      },
      stage2: null,
      stage3: null,
      radiologistReview: null,
      createdAt: '2025-01-15T09:30:00.000Z',
      updatedAt: '2025-01-15T09:42:00.000Z',
      closedAt: null,
    },

    // ──────────────────────────────────────────────────────────
    // Record 2 — draft_stage2
    // CT with IV contrast. Stages 1 & 2 complete.
    // Awaiting nurse vitals check (Stage 3).
    // ──────────────────────────────────────────────────────────
    {
      id: IDS.con2,
      status: 'draft_stage2',
      modality: 'ct_with_iv_contrast',
      language: 'en',
      patient: {
        name: 'Ngozi Adekunle',
        dob: '1987-07-22',
        gender: 'female',
        phone: '07098765432',
        address: '5 Gana Street, Maitama, Abuja',
      },
      tierFlags: {
        tier1: [],
        tier2: [],
        tier3: ['prior_mild_contrast_reaction'],
      },
      stage1: {
        completedAt: '2025-01-10T10:15:00.000Z',
        consentVersion: 'v1.0-en',
        consentAcknowledged: true,
        patientSignature: 'Ngozi Adekunle',
        screening: ctScreening_tier3_mildReaction,
      },
      stage2: {
        completedAt: '2025-01-10T12:30:00.000Z',
        performedBy: IDS.radiographer,
        performedByName: 'Chidi Eze',
        procedureNotes: 'CT abdomen and pelvis with IV contrast. Patient tolerated procedure well. No acute adverse reaction observed. Images of diagnostic quality obtained.',
        contrastAdministered: true,
        contrastAgent: 'Omnipaque 300',
        contrastVolume: '80ml',
        complications: 'none',
        radiographerSignature: 'Chidi Eze',
      },
      stage3: null,
      radiologistReview: null,
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-01-10T12:30:00.000Z',
      closedAt: null,
    },

    // ──────────────────────────────────────────────────────────
    // Record 3 — flagged_tier1
    // MRI without contrast. Absolute contraindication: non-MR-conditional
    // pacemaker. Procedure locked; radiologist sign-off required.
    // ──────────────────────────────────────────────────────────
    {
      id: IDS.con3,
      status: 'flagged_tier1',
      modality: 'mri_without_contrast',
      language: 'en',
      patient: {
        name: 'Babatunde Okafor',
        dob: '1963-11-05',
        gender: 'male',
        phone: '08098765432',
        address: '22 Bodija Estate, Ibadan, Oyo State',
      },
      tierFlags: {
        tier1: ['non_mr_conditional_pacemaker'],
        tier2: [],
        tier3: [],
      },
      stage1: {
        completedAt: '2025-01-08T11:00:00.000Z',
        consentVersion: 'v1.0-en',
        consentAcknowledged: true,
        patientSignature: 'Babatunde Okafor',
        screening: mriScreening_tier1_pacemaker,
      },
      stage2: null,
      stage3: null,
      radiologistReview: {
        reviewedAt: null,
        reviewedBy: null,
        reviewedByName: null,
        decision: null,
        notes: null,
      },
      createdAt: '2025-01-08T10:45:00.000Z',
      updatedAt: '2025-01-08T11:00:00.000Z',
      closedAt: null,
    },

    // ──────────────────────────────────────────────────────────
    // Record 4 — pending_review
    // MRI with Gadolinium. Tier 2 flag: first-trimester pregnancy.
    // Procedure may proceed only after radiologist sign-off.
    // ──────────────────────────────────────────────────────────
    {
      id: IDS.con4,
      status: 'pending_review',
      modality: 'mri_with_gadolinium',
      language: 'en',
      patient: {
        name: 'Amina Yusuf',
        dob: '2001-09-12',
        gender: 'female',
        phone: '08123456789',
        address: '8 Nassarawa GRA, Kano, Kano State',
      },
      tierFlags: {
        tier1: [],
        tier2: ['first_trimester_pregnancy_with_gadolinium'],
        tier3: [],
      },
      stage1: {
        completedAt: '2025-01-20T08:55:00.000Z',
        consentVersion: 'v1.0-en',
        consentAcknowledged: true,
        patientSignature: 'Amina Yusuf',
        screening: mriScreening_tier2_pregnancy,
      },
      stage2: null,
      stage3: null,
      radiologistReview: {
        reviewedAt: null,
        reviewedBy: null,
        reviewedByName: null,
        decision: null,
        notes: null,
      },
      createdAt: '2025-01-20T08:40:00.000Z',
      updatedAt: '2025-01-20T08:55:00.000Z',
      closedAt: null,
    },

    // ──────────────────────────────────────────────────────────
    // Record 5 — closed
    // Mammography. All three stages complete. PDF-exportable.
    // ──────────────────────────────────────────────────────────
    {
      id: IDS.con5,
      status: 'closed',
      modality: 'mammography',
      language: 'en',
      patient: {
        name: 'Chidinma Obi',
        dob: '1971-04-30',
        gender: 'female',
        phone: '08034567890',
        address: '3 Rumuola Road, Port Harcourt, Rivers State',
      },
      tierFlags: {
        tier1: [],
        tier2: [],
        tier3: [],
      },
      stage1: {
        completedAt: '2024-12-20T09:00:00.000Z',
        consentVersion: 'v1.0-en',
        consentAcknowledged: true,
        patientSignature: 'Chidinma Obi',
        screening: mammographyScreening_clean,
      },
      stage2: {
        completedAt: '2024-12-20T10:15:00.000Z',
        performedBy: IDS.radiographer,
        performedByName: 'Chidi Eze',
        procedureNotes: 'Bilateral mammography, CC and MLO views. Standard screening protocol followed. Patient cooperative throughout. No technical repeat required.',
        contrastAdministered: false,
        contrastAgent: null,
        contrastVolume: null,
        complications: 'none',
        radiographerSignature: 'Chidi Eze',
      },
      stage3: {
        completedAt: '2024-12-20T10:45:00.000Z',
        performedBy: IDS.nurse,
        performedByName: 'Amaka Obi',
        vitals: {
          bp: '118/76',
          pulse: '72',
          spo2: '99',
          temperature: '36.5',
          rr: '16',
        },
        patientCondition: 'Stable. Patient comfortable and fully oriented. No complaints. Cleared for discharge.',
        nurseSignature: 'Amaka Obi',
      },
      radiologistReview: null,
      createdAt: '2024-12-20T08:45:00.000Z',
      updatedAt: '2024-12-20T10:45:00.000Z',
      closedAt: '2024-12-20T10:45:00.000Z',
    },
  ];

  return { users, consents };
}

// ═══════════════════════════════════════════════════════════════
//  Init / Seed
// ═══════════════════════════════════════════════════════════════

function seed() {
  console.log('[DB] No database file found — seeding with demo data…');
  const data = buildSeedData();
  write(data);
  console.log(
    `[DB] Seeded ${data.users.length} users and ${data.consents.length} consent records.`
  );
}

function init() {
  if (!fs.existsSync(DB_PATH)) {
    seed();
  } else {
    const db = read();
    console.log(
      `[DB] Loaded: ${(db.users || []).length} users, ` +
      `${(db.consents || []).length} consent records.`
    );
  }
}

init();

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = { read, write, all, insert, update, remove, findOne, findMany, filter };
