/* Student routes  ->  /api/student/*  (v6) */
const express = require("express");
const { pool } = require("../config/db");
const { requireStudent } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/security");
const { singleFile, ALLOWED } = require("../middleware/upload");
const { uploadBuffer, destroyAsset, isConfigured } = require("../config/cloudinary");
const { audit } = require("../lib/audit");
const {
  ensureDocuments, serializeDoc, allChecksTrue,
  DOC_SELECT_WITH_VERIFIER, DOC_JOIN_VERIFIER,
} = require("../lib/docs");
const { checkAgainstBlacklist } = require("../lib/blacklist");
const { DOC_META } = require("../config/checklists");

const router = express.Router();
router.use(requireStudent);

async function loadState(studentId) {
  const sr = await pool.query("SELECT * FROM students WHERE id=$1", [studentId]);
  const s = sr.rows[0]; if (!s) return null;
  await ensureDocuments(s.id, s.profile);
  const dr = await pool.query(
    `SELECT ${DOC_SELECT_WITH_VERIFIER} FROM documents d ${DOC_JOIN_VERIFIER} WHERE d.student_id=$1 ORDER BY d.id`,
    [s.id]
  );
  let slot = null;
  if (s.slot_id) {
    const slr = await pool.query("SELECT * FROM slots WHERE id=$1", [s.slot_id]);
    if (slr.rows[0]) slot = { id: slr.rows[0].id, date: slr.rows[0].slot_date, time: slr.rows[0].slot_time };
  }
  return {
    student: {
      appNo: s.app_no, name: s.name, program: s.program, category: s.category, section: s.section,
      profile: s.profile, orientationDate: s.orientation_date, admissionStatus: s.admission_status,
      declared: s.declared, slotConfirmed: s.slot_confirmed,
      slotRejected: s.slot_rejected, slotRejectReason: s.slot_reject_reason || null,
      pendingDocs: s.pending_docs || null,
      submissionDeadline: s.submission_deadline || null,
      physicalReportingCompleted: s.physical_reporting_completed,
    },
    documents: dr.rows.map(serializeDoc),
    slot,
  };
}

async function applyBlacklistCheck(docId, institutionName) {
  if (!institutionName || !institutionName.trim()) {
    await pool.query("UPDATE documents SET institution_name=NULL, flagged=false, flag_match=NULL, flag_remarks=NULL, flagged_at=NULL WHERE id=$1", [docId]);
    return null;
  }
  const match = await checkAgainstBlacklist(institutionName);
  if (match) {
    await pool.query(
      `UPDATE documents SET institution_name=$1, flagged=true, flag_match=$2, flag_remarks=$3, flagged_at=now() WHERE id=$4`,
      [institutionName, match.name,
       `Auto-flagged: matches "${match.name}" (${match.region || "blacklist"}). Verification required.`,
       docId]
    );
    const doc = await pool.query("SELECT student_id FROM documents WHERE id=$1", [docId]);
    if (doc.rows[0]) {
      await pool.query(
        `INSERT INTO flagged_cases (student_id, document_id, institution, matched_name, reason) VALUES ($1,$2,$3,$4,$5)`,
        [doc.rows[0].student_id, docId, institutionName, match.name, "Blacklist match (auto)"]
      );
    }
    return match;
  } else {
    await pool.query(
      `UPDATE documents SET institution_name=$1, flagged=false, flag_match=NULL, flag_remarks=NULL, flagged_at=NULL WHERE id=$2`,
      [institutionName, docId]
    );
    return null;
  }
}

router.get("/me", async (req, res, next) => {
  try {
    const state = await loadState(req.student.id);
    if (!state) return res.status(404).json({ error: "Student record not found." });
    res.json(state);
  } catch (e) { next(e); }
});

router.post("/documents/:code/upload", uploadLimiter, singleFile("file"), async (req, res, next) => {
  try {
    if (!isConfigured()) return res.status(503).json({ error: "Document storage is not configured. Contact the admin office." });
    if (!req.file) return res.status(400).json({ error: "No file received." });
    const code = String(req.params.code || "").toUpperCase();
    const dr = await pool.query("SELECT * FROM documents WHERE student_id=$1 AND doc_code=$2", [req.student.id, code]);
    const doc = dr.rows[0];
    if (!doc) return res.status(404).json({ error: "This document is not part of your checklist." });
    if (doc.file_public_id && doc.staff_status !== "rejected") {
      return res.status(400).json({ error: "This document is already submitted. Replacement is allowed only if staff reject it." });
    }
    if (doc.file_public_id) await destroyAsset(doc.file_public_id, doc.file_resource_type);
    const result = await uploadBuffer(req.file.buffer, req.student.appNo, code);
    const ext = ALLOWED[req.file.mimetype] || result.format;
    await pool.query(
      `UPDATE documents SET file_public_id=$1, file_resource_type=$2, file_format=$3,
                file_name=$4, file_size=$5, student_status='pending', staff_status='pending',
                staff_note=NULL, issue_note=NULL, verified_by=NULL, verified_at=NULL, updated_at=now() WHERE id=$6`,
      [result.public_id, result.resource_type, ext, req.file.originalname, req.file.size, doc.id]
    );
    const fresh = await pool.query(`SELECT ${DOC_SELECT_WITH_VERIFIER} FROM documents d ${DOC_JOIN_VERIFIER} WHERE d.id=$1`, [doc.id]);
    await audit(req, "student", req.student.appNo, "DOC_UPLOAD", `${code} (${req.file.originalname})`);
    res.json({ document: serializeDoc(fresh.rows[0]) });
  } catch (e) { next(e); }
});

router.patch("/documents/:code", async (req, res, next) => {
  try {
    const code = String(req.params.code || "").toUpperCase();
    const { selfVerify, status, issueNote, institutionName } = req.body;
    const dr = await pool.query("SELECT * FROM documents WHERE student_id=$1 AND doc_code=$2", [req.student.id, code]);
    const doc = dr.rows[0];
    if (!doc) return res.status(404).json({ error: "Document not found in your checklist." });
    const checks = (typeof selfVerify === "object" && selfVerify) ? selfVerify : doc.self_verify;
    const meta = DOC_META[code] || {};
    if (institutionName !== undefined) await applyBlacklistCheck(doc.id, institutionName);
    if (status === "ready") {
      if (!doc.file_public_id) return res.status(400).json({ error: "Upload the file before marking it Ready." });
      if (!allChecksTrue(checks)) return res.status(400).json({ error: "Tick all six verification checks before marking it Ready." });
      const inst = institutionName !== undefined ? institutionName : doc.institution_name;
      if (meta.needsInstitution && (!inst || !String(inst).trim())) {
        return res.status(400).json({ error: "Enter the issuing institution / board before marking it Ready." });
      }
      await pool.query(`UPDATE documents SET self_verify=$1, student_status='ready', issue_note=NULL, updated_at=now() WHERE id=$2`,
        [JSON.stringify(checks), doc.id]);
      await audit(req, "student", req.student.appNo, "DOC_READY", code);
    } else if (status === "issue") {
      await pool.query(`UPDATE documents SET self_verify=$1, student_status='issue', issue_note=$2, updated_at=now() WHERE id=$3`,
        [JSON.stringify(checks), String(issueNote || "Issue reported by student"), doc.id]);
      await audit(req, "student", req.student.appNo, "DOC_ISSUE", `${code}: ${issueNote || ""}`);
    } else {
      await pool.query(`UPDATE documents SET self_verify=$1, updated_at=now() WHERE id=$2`, [JSON.stringify(checks), doc.id]);
    }
    const fresh = await pool.query(`SELECT ${DOC_SELECT_WITH_VERIFIER} FROM documents d ${DOC_JOIN_VERIFIER} WHERE d.id=$1`, [doc.id]);
    res.json({ document: serializeDoc(fresh.rows[0]) });
  } catch (e) { next(e); }
});

router.post("/declare", async (req, res, next) => {
  try {
    const dr = await pool.query("SELECT student_status FROM documents WHERE student_id=$1", [req.student.id]);
    if (!dr.rows.length || dr.rows.some((d) => d.student_status !== "ready")) {
      return res.status(400).json({ error: "All documents must be Ready before you can sign the declaration." });
    }
    await pool.query("UPDATE students SET declared=true, declared_at=now() WHERE id=$1", [req.student.id]);
    await audit(req, "student", req.student.appNo, "DECLARED", "Self-declaration signed");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* v6: students only see slots that are explicitly 'open' AND have capacity.
   Their own already-booked slot is always included (even if since hidden / closed). */
router.get("/slots", async (req, res, next) => {
  try {
    const sr = await pool.query("SELECT slot_id FROM students WHERE id=$1", [req.student.id]);
    const mySlot = sr.rows[0]?.slot_id;
    const r = await pool.query(
      `SELECT id, slot_date, slot_time, capacity, booked, status, duration_minutes FROM slots
        WHERE (status='open' AND booked < capacity) OR id=$1
        ORDER BY slot_date, slot_time`,
      [mySlot || 0]
    );
    res.json({
      slots: r.rows.map((s) => ({
        id: s.id, date: s.slot_date, time: s.slot_time,
        seatsLeft: Math.max(s.capacity - s.booked, 0),
        capacity: s.capacity, booked: s.booked,
        durationMinutes: s.duration_minutes,
        mine: s.id === mySlot,
      })),
    });
  } catch (e) { next(e); }
});

router.post("/slot", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const slotId = parseInt(req.body.slotId, 10);
    if (!slotId) return res.status(400).json({ error: "Choose a slot." });
    await client.query("BEGIN");
    const sr = await client.query("SELECT * FROM students WHERE id=$1 FOR UPDATE", [req.student.id]);
    const s = sr.rows[0];
    const dr = await client.query("SELECT student_status FROM documents WHERE student_id=$1", [s.id]);
    const allReady = dr.rows.length && dr.rows.every((d) => d.student_status === "ready");
    if (!s.declared || !allReady) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Complete all documents and sign the declaration before booking." });
    }
    if (s.slot_id && !s.slot_rejected) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Your reporting slot is already booked. The verification cell must reject it before you can change it." });
    }
    const slr = await client.query("SELECT * FROM slots WHERE id=$1 FOR UPDATE", [slotId]);
    const slot = slr.rows[0];
    if (!slot) { await client.query("ROLLBACK"); return res.status(404).json({ error: "That slot no longer exists." }); }
    // v6: only allow booking when status='open'
    if (slot.status !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `That slot is currently ${slot.status} and cannot be booked.` });
    }
    if (slot.id !== s.slot_id && slot.booked >= slot.capacity) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "That slot is now full. Please pick another." });
    }
    if (s.slot_id && s.slot_id !== slot.id) await client.query("UPDATE slots SET booked=GREATEST(booked-1,0) WHERE id=$1", [s.slot_id]);
    if (s.slot_id !== slot.id) await client.query("UPDATE slots SET booked=booked+1 WHERE id=$1", [slot.id]);
    await client.query(
      "UPDATE students SET slot_id=$1, slot_confirmed=true, slot_rejected=false, slot_reject_reason=NULL WHERE id=$2",
      [slot.id, s.id]
    );
    await client.query("COMMIT");
    await audit(req, "student", s.app_no, "SLOT_BOOKED", `${slot.slot_date} ${slot.slot_time}`);
    res.json({ slot: { id: slot.id, date: slot.slot_date, time: slot.slot_time } });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    next(e);
  } finally {
    client.release();
  }
});

module.exports = router;
