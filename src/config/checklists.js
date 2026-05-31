/* Which documents each profile must submit, plus minimal metadata used
   by the API. (Rich display catalog lives in the frontend.) */

const DOC_META = {
  AADHAAR:    { name: "Aadhaar Card",                              original: false, needsInstitution: false },
  PAN:        { name: "PAN Card (Student)",                        original: false, needsInstitution: false },
  PAN_PARENT: { name: "PAN Card (Parent / Guardian)",              original: false, needsInstitution: false },
  APAAR:      { name: "APAAR ID (ABC ID)",                         original: false, needsInstitution: false },
  SSLC:       { name: "10th (SSLC) Marks Card",                    original: true,  needsInstitution: true  },
  PUC:        { name: "12th / PUC / Equivalent Marks Card",        original: true,  needsInstitution: true  },
  UG_DEGREE:  { name: "UG Degree / Provisional Certificate",       original: true,  needsInstitution: true  },
  UG_MARKS:   { name: "UG Consolidated Marks Card",                original: true,  needsInstitution: true  },
  DIPLOMA:    { name: "Diploma Certificate & Marks Cards",         original: true,  needsInstitution: true  },
  TC:         { name: "Transfer Certificate (TC) — from last institution studied", original: true, needsInstitution: true },
  MIGRATION:  { name: "Migration Certificate",                     original: true,  needsInstitution: true  },
  CHAR_CERT:  { name: "Character / Conduct Certificate",           original: true,  needsInstitution: true  },
  PHOTOS:     { name: "Passport-size Photographs (white background)", original: true, needsInstitution: false },
  ANTI_RAG_S: { name: "Anti-Ragging Undertaking (Student)",        original: true,  needsInstitution: false },
  ANTI_RAG_P: { name: "Anti-Ragging Undertaking (Parent)",         original: true,  needsInstitution: false },
  ANTI_SUB:   { name: "Anti-Substance Abuse Declaration",          original: true,  needsInstitution: false },
  MEDICAL:    { name: "Medical Fitness Certificate",               original: true,  needsInstitution: false },
  INCOME:     { name: "Income Certificate (Scholarship)",          original: true,  needsInstitution: false },
  CASTE:      { name: "Caste Certificate (SC/ST/OBC)",             original: true,  needsInstitution: false },
  BANK:       { name: "Bank Passbook / Cancelled Cheque",          original: false, needsInstitution: false },
  PASSPORT:   { name: "Passport (NRI/Foreign)",                    original: true,  needsInstitution: false },
  VISA:       { name: "Valid Student Visa",                        original: true,  needsInstitution: false },
  EQUIV:      { name: "AIU / Equivalence Certificate",             original: true,  needsInstitution: true  },
  ENGLISH:    { name: "English Proficiency (IELTS/TOEFL)",         original: false, needsInstitution: true  },
};

const CHECKLISTS = {
  "UG-Indian":             ["SSLC","PUC","TC","MIGRATION","CHAR_CERT","AADHAAR","APAAR","PAN","PAN_PARENT","PHOTOS","ANTI_RAG_S","ANTI_RAG_P","ANTI_SUB","MEDICAL"],
  "UG-Indian-Scholarship": ["SSLC","PUC","TC","MIGRATION","CHAR_CERT","AADHAAR","APAAR","PAN","PAN_PARENT","PHOTOS","ANTI_RAG_S","ANTI_RAG_P","ANTI_SUB","MEDICAL","INCOME","CASTE","BANK"],
  "UG-NRI":                ["SSLC","PUC","TC","MIGRATION","AADHAAR","APAAR","PAN_PARENT","PHOTOS","ANTI_RAG_S","ANTI_RAG_P","ANTI_SUB","MEDICAL","PASSPORT","VISA","EQUIV","BANK"],
  "UG-Foreign":            ["PUC","TC","PHOTOS","ANTI_RAG_S","ANTI_RAG_P","ANTI_SUB","MEDICAL","PASSPORT","VISA","EQUIV","ENGLISH","BANK"],
  "UG-Lateral":            ["SSLC","DIPLOMA","TC","MIGRATION","CHAR_CERT","AADHAAR","APAAR","PAN","PAN_PARENT","PHOTOS","ANTI_RAG_S","ANTI_RAG_P","ANTI_SUB","MEDICAL"],
  "PG-Indian":             ["SSLC","PUC","UG_DEGREE","UG_MARKS","TC","MIGRATION","CHAR_CERT","AADHAAR","APAAR","PAN","PAN_PARENT","PHOTOS","ANTI_RAG_S","ANTI_SUB","MEDICAL"],
  "PG-Indian-Scholarship": ["SSLC","PUC","UG_DEGREE","UG_MARKS","TC","MIGRATION","CHAR_CERT","AADHAAR","APAAR","PAN","PAN_PARENT","PHOTOS","ANTI_RAG_S","ANTI_SUB","MEDICAL","INCOME","CASTE","BANK"],
};

function checklistFor(profile) { return CHECKLISTS[profile] || CHECKLISTS["UG-Indian"]; }

module.exports = { DOC_META, CHECKLISTS, checklistFor };
