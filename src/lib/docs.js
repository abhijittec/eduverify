/* Shared helpers for working with the documents table. */
const { pool } = require("../config/db");
const { checklistFor, DOC_META } = require("../config/checklists");
const { signedUrl } = require("../config/cloudinary");

const VERIFY_KEYS = ["clarity", "complete", "name", "signature", "date", "authentic"];

async function ensureDocuments(studentId, profile) {
  for (const code of checklistFor(profile)) {
    await pool.query(
      `INSERT INTO documents (student_id, doc_code) VALUES ($1,$2)
       ON CONFLICT (student_id, doc_code) DO NOTHING`,
      [studentId, code]
    );
  }
}

function serializeDoc(d) {
  return {
    docCode: d.doc_code,
    name: DOC_META[d.doc_code]?.name || d.doc_code,
    original: !!DOC_META[d.doc_code]?.original,
    needsInstitution: !!DOC_META[d.doc_code]?.needsInstitution,
    hasFile: !!d.file_public_id,
    fileName: d.file_name || null,
    fileUrl: d.file_public_id ? signedUrl(d, false) : null,
    institutionName: d.institution_name || "",
    flagged: !!d.flagged,
    flagMatch: d.flag_match || null,
    flagRemarks: d.flag_remarks || null,
    selfVerify: d.self_verify || {},
    studentStatus: d.student_status,
    issueNote: d.issue_note || null,
    staffStatus: d.staff_status,
    staffNote: d.staff_note || null,
    verifiedByStaffId: d.verifier_staff_id || null,
    verifiedByName: d.verifier_name || null,
    verifiedAt: d.verified_at || null,
  };
}

function serializeDocAdmin(d) {
  return {
    id: d.id,
    docCode: d.doc_code,
    name: DOC_META[d.doc_code]?.name || d.doc_code,
    original: !!DOC_META[d.doc_code]?.original,
    needsInstitution: !!DOC_META[d.doc_code]?.needsInstitution,
    hasFile: !!d.file_public_id,
    fileName: d.file_name || null,
    fileSize: d.file_size || null,
    viewUrl: d.file_public_id ? signedUrl(d, false) : null,
    downloadUrl: d.file_public_id ? signedUrl(d, true) : null,
    institutionName: d.institution_name || "",
    flagged: !!d.flagged,
    flagMatch: d.flag_match || null,
    flagRemarks: d.flag_remarks || null,
    flaggedAt: d.flagged_at || null,
    selfVerify: d.self_verify || {},
    studentStatus: d.student_status,
    issueNote: d.issue_note || null,
    staffStatus: d.staff_status,
    staffNote: d.staff_note || null,
    verifiedByStaffId: d.verifier_staff_id || null,
    verifiedByName: d.verifier_name || null,
    verifiedAt: d.verified_at || null,
  };
}

function allChecksTrue(selfVerify) {
  return VERIFY_KEYS.every((k) => selfVerify && selfVerify[k] === true);
}

/** SELECT clause + JOIN that includes the verifier's name + staff ID. */
const DOC_SELECT_WITH_VERIFIER =
  "d.*, a.name AS verifier_name, a.staff_id AS verifier_staff_id";
const DOC_JOIN_VERIFIER = "LEFT JOIN admins a ON a.id = d.verified_by";

module.exports = {
  VERIFY_KEYS, ensureDocuments,
  serializeDoc, serializeDocAdmin, allChecksTrue,
  DOC_SELECT_WITH_VERIFIER, DOC_JOIN_VERIFIER,
};
