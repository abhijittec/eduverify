# EduVerify — Full-Stack Pre-Verification Portal (v6)

Node.js + Express API · PostgreSQL · Cloudinary · React + Tailwind frontend —
one deployable Render service. Auto-setup on boot, no Shell access needed.

---

## What's new in v6

### Document checklist
- **PAN Card (Parent/Guardian)** is now mandatory on every Indian-resident profile *and* on the **UG-NRI** profile (added in v5; explicitly confirmed and extended in v6).

### Comprehensive Slot Management
Brand-new **Slot Management** module on the admin dashboard with three tabs:

**1. Manage Dates & Slots**
- Bulk release / hide / close — pick multiple dates with checkboxes and apply any status in one click. Lets you release dates in batches (e.g. "open the first two days now, hide the rest").
- Per-date controls: "Release day (Open)", "Hide day", "Close day" buttons.
- Per-slot controls: status dropdown (Open / Hidden / Closed), inline capacity edit, inline duration edit, delete.
- Real-time occupancy bars per date and per slot.

**2. Statistics & Utilization**
- Top counters: total slots, total capacity, total booked, overall utilization %.
- Slot status breakdown: Open, Fully Booked, Hidden, Closed counts.
- Per-date utilization list with coloured progress bars.

**3. Add Slot**
- Date, time, capacity (1–1000), duration (5–480 min), initial status (Open / Hidden / Closed).
- 30-minute minimum gap on the same date is enforced server-side.

### Slot status enum (replaces old enabled boolean)
- **Open** — visible to students, accepts bookings up to capacity.
- **Hidden** — not visible to students at all (use for unreleased future dates).
- **Closed** — visible-to-admin only, no new bookings allowed.
- **Fully Booked** — computed automatically when an Open slot reaches capacity.

### Booking integrity
- Existing confirmed bookings are never invalidated. Capacity cannot drop below the number already booked. Releasing or hiding a date never touches existing bookings.

### Student portal
- Students only see slots that are explicitly **Open** AND have capacity left. Hidden and closed slots never appear. The student's own already-booked slot is always shown (even after status changes), so they can find it on the dashboard.
- A new line on the slot-booking screen explains: *"Dates are released in batches by the admissions office — more may appear later."*
- A new FAQ entry covers the same.

### API additions
- `GET  /api/admin/slots`           — list with status + duration + occupancy
- `GET  /api/admin/slots/stats`     — overall + per-date stats
- `POST /api/admin/slots`           — create (supervisor)
- `PATCH /api/admin/slots/:id`      — update status / capacity / duration (supervisor)
- `DELETE /api/admin/slots/:id`     — delete empty slots (supervisor)
- `POST /api/admin/slots/bulk-status` — set status across many ids or dates at once (supervisor)

Everything from v1–v5 still works: auto-setup on boot, blacklist with fuzzy
matching, Forgot Password, secure preview, bulk download ZIP, Add Student
pipeline, Manage Staff, pending docs + deadline, locked verify/reject, slot
rejection flow, standard templates.

---

## Deploy on Render (~15 minutes)

### Step 1 — Cloudinary

Sign up at <https://cloudinary.com>, copy **Cloud name**, **API Key**, **API
Secret**. Settings → Security → enable **"Allow delivery of PDF and ZIP files"**.

### Step 2 — Push to GitHub

Push the contents of the `eduverify-server` folder so `server.js` sits at
the repo root. If Windows refuses with *"Filename too long"*, run
`rmdir /s /q node_modules` first.

### Step 3 — Render Blueprint

<https://render.com> → **New + → Blueprint** → connect the repo → Apply.
In the service **Environment** tab set: `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SEED_ADMIN_PASSWORD`.

### Step 4 — Done

On boot the server auto-migrates the schema (new `slots.status` and
`slots.duration_minutes` columns are added safely) and seeds demo data.

---

## Demo logins

**Admin (Supervisor):** `ADM-001` / your `SEED_ADMIN_PASSWORD`.

**Students:** application number + DOB, then set a password.

| App No | Date of Birth |
|---|---|
| CSE2026001 | 2007-03-12 |
| CSE2026002 | 2006-11-04 |
| ECE2026003 | 2007-01-22 |
| MEC2026004 | 2006-08-18 |
| CSE2026005 | 2006-05-30 |
| CSE2026006 | 2006-09-09 |
| CSE2026007 | 2005-02-14 |
| MCA2026008 | 2002-07-20 |
| MBA2026009 | 2001-12-05 |
| MTC2026010 | 2001-03-28 |

To try batched release: log in as `ADM-001` → **🕒 Slot Management** →
**Manage Dates & Slots** → in the bulk panel, select the first two seeded
dates (2026-06-05, 2026-06-06) and apply **Open**, then select the rest
and apply **Hidden**. Log in as any student → only the released dates
appear in the slot-booking screen.

---

## Tech stack

Node.js · Express · PostgreSQL · Cloudinary · archiver · bcrypt · JWT ·
Helmet · React 18 · Tailwind CSS.
