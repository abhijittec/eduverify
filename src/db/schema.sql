-- ===========================================================
-- EduVerify - PostgreSQL schema (v6)
-- Safe to run repeatedly: CREATE TABLE IF NOT EXISTS + ALTER ... IF NOT EXISTS.
-- ===========================================================

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  staff_id      VARCHAR(50)  UNIQUE NOT NULL,
  name          VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'verifier',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slots (
  id         SERIAL PRIMARY KEY,
  slot_date  DATE        NOT NULL,
  slot_time  VARCHAR(20) NOT NULL,
  capacity   INT         NOT NULL DEFAULT 20,
  booked     INT         NOT NULL DEFAULT 0,
  enabled    BOOLEAN     NOT NULL DEFAULT true,
  status     VARCHAR(20) NOT NULL DEFAULT 'open',
  duration_minutes INT   NOT NULL DEFAULT 30,
  UNIQUE (slot_date, slot_time)
);

CREATE TABLE IF NOT EXISTS students (
  id               SERIAL PRIMARY KEY,
  app_no           VARCHAR(40)  UNIQUE NOT NULL,
  name             VARCHAR(120) NOT NULL,
  dob              DATE         NOT NULL,
  email            VARCHAR(160),
  phone            VARCHAR(20),
  program          VARCHAR(120) NOT NULL,
  department       VARCHAR(80),
  batch            VARCHAR(20),
  category         VARCHAR(20),
  section          VARCHAR(10),
  profile          VARCHAR(40)  NOT NULL,
  orientation_date DATE,
  admission_status VARCHAR(20)  NOT NULL DEFAULT 'Admitted',
  password_hash    VARCHAR(255),
  declared         BOOLEAN      NOT NULL DEFAULT false,
  declared_at      TIMESTAMPTZ,
  slot_id          INT REFERENCES slots(id) ON DELETE SET NULL,
  slot_confirmed   BOOLEAN      NOT NULL DEFAULT false,
  slot_rejected    BOOLEAN      NOT NULL DEFAULT false,
  slot_reject_reason TEXT,
  physical_reporting_completed BOOLEAN NOT NULL DEFAULT false,
  physical_reporting_at        TIMESTAMPTZ,
  pending_docs     TEXT,
  submission_deadline DATE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id                 SERIAL PRIMARY KEY,
  student_id         INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_code           VARCHAR(30)  NOT NULL,
  file_public_id     TEXT,
  file_resource_type VARCHAR(20),
  file_format        VARCHAR(10),
  file_name          VARCHAR(255),
  file_size          INT,
  self_verify        JSONB NOT NULL DEFAULT '{}'::jsonb,
  student_status     VARCHAR(20)  NOT NULL DEFAULT 'none',
  issue_note         TEXT,
  staff_status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  staff_note         TEXT,
  verified_by        INT REFERENCES admins(id) ON DELETE SET NULL,
  verified_at        TIMESTAMPTZ,
  institution_name   VARCHAR(250),
  flagged            BOOLEAN      NOT NULL DEFAULT false,
  flag_match         VARCHAR(250),
  flag_remarks       TEXT,
  flagged_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (student_id, doc_code)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  actor_type VARCHAR(20),
  actor_id   VARCHAR(60),
  action     VARCHAR(80)  NOT NULL,
  detail     TEXT,
  ip         VARCHAR(60),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blacklist_institutions (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(250) NOT NULL,
  name_normalized VARCHAR(250) UNIQUE NOT NULL,
  region          VARCHAR(100),
  reason          TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by      INT REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS flagged_cases (
  id              SERIAL PRIMARY KEY,
  student_id      INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_id     INT REFERENCES documents(id) ON DELETE CASCADE,
  institution     VARCHAR(250),
  matched_name    VARCHAR(250),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade-safe additions (databases created before v6)
ALTER TABLE students  ADD COLUMN IF NOT EXISTS department VARCHAR(80);
ALTER TABLE students  ADD COLUMN IF NOT EXISTS batch VARCHAR(20);
ALTER TABLE students  ADD COLUMN IF NOT EXISTS physical_reporting_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE students  ADD COLUMN IF NOT EXISTS physical_reporting_at TIMESTAMPTZ;
ALTER TABLE students  ADD COLUMN IF NOT EXISTS pending_docs TEXT;
ALTER TABLE students  ADD COLUMN IF NOT EXISTS submission_deadline DATE;
ALTER TABLE students  ADD COLUMN IF NOT EXISTS slot_rejected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE students  ADD COLUMN IF NOT EXISTS slot_reject_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS institution_name VARCHAR(250);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS flag_match VARCHAR(250);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS flag_remarks TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE slots     ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE slots     ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';
ALTER TABLE slots     ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 30;

-- Migrate any prior `enabled=false` rows to the new status enum
UPDATE slots SET status='hidden' WHERE enabled=false AND status='open';

CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_flagged ON documents(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_students_appno   ON students(app_no);
CREATE INDEX IF NOT EXISTS idx_students_dept    ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section);
CREATE INDEX IF NOT EXISTS idx_slots_date_status ON slots(slot_date, status);
