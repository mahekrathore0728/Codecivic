# CodeCivic: Pan-India Civic Issue Reporting and Resolution Platform

**CodeCivic** is an enterprise-grade civic technology platform developed for public grievance redressal and participatory urban governance across all **28 States and 8 Union Territories of India**.

It empowers residents to report public problems (damaged roads, open manholes, garbage overflow, potable pipeline bursts, contaminated drinking water, sewer blockages, non-functional streetlights, uncleaned public toilets), discover and back nearby community complaints, save offline drafts in low-connectivity zones, track real-time SLA timelines, and inspect photographic resolution evidence before officially confirming closure.

Municipal administrators and department engineers use the centralized console to triage complaints, assign work orders, monitor SLA compliance, inspect recurring issue hotspots, and record photographic evidence of resolution.

---

## 🏛️ Core System Journey & Architecture

```
REPORT AN ISSUE → CONNECT WITH COMMUNITY → TRACK PROGRESS → AUTHORITY ACTION → VERIFY RESOLUTION → IMPROVE PUBLIC SERVICES
```

### End-to-End Operational Lifecycle
1. **Report Lodging**: Citizens complete an intuitive 4-step guided process:
   - **Step 1: Category Selection**: Garbage and Waste, Road Damage, Potholes, Water Leakage, Drainage Problems, Streetlight Issues, Public Sanitation, Other Civic Issues.
   - **Step 2: Details & Evidence**: Complaint title, detailed description (with offline NLP phrasing helper), and up to 5 photographic evidence uploads (max 10MB each with magic-byte content verification).
   - **Step 3: Geolocation**: Pinpoint via browser GPS device location, interactive Leaflet/OpenStreetMap pin drag/click, street address, and municipal ward selection.
   - **Step 4: Duplicate Analysis & Review**: Real-time algorithmic check against existing active issues using token Jaccard similarity and Haversine geo-distance. If a similar complaint exists, citizens can back the existing complaint with one click or continue submitting their independent report.
2. **Automated Triage & Priority Recommendation**:
   - Generates sequential tracking code (e.g. `CC-2026-00001`, `CC-2026-00002`).
   - Evaluates transparent, explainable heuristic priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) based on hazard keywords, community resonance, and sensitive locations (schools, hospitals, arterial roads).
   - Computes category-specific SLA resolution deadlines (24h Critical to 120h Low).
3. **Department Action & Status Audit Trail**:
   - Status updates are strictly governed by a backend transition matrix and permanently audited with timestamps, remarks, and user attribution:
     ```
     SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                                                            └──> REOPENED (by Citizen)
     ```
4. **Evidence-Based Resolution Verification**:
   - When marked `RESOLVED`, authorities **must** provide detailed resolution notes and optional photographic proof.
   - The reporting citizen is notified to inspect the site and can either **Confirm Resolution** (moving complaint to `CLOSED`) or **Report Unresolved** (reopening the issue to `HIGH` priority with feedback for municipal rework).
5. **Civic Intelligence & Hotspot Analytics**:
   - Multidimensional filtering (Ward, Category, Priority, Department, Date Range).
   - Automated real-data **Civic Insights** highlighting workload bottlenecks, high-density problem categories, and ward backlog.
   - Evaluates spatial clusters (≤ 350m radius) across complaint history to detect recurring infrastructure failures and recommends permanent capital works rather than repeated temporary patches.

---

## 🌐 Multilingual Support (English & हिंदी)

CodeCivic features a centralized localization architecture:
- Instant switch between **English** and **हिंदी** via the top navigation bar.
- Selection persisted in `localStorage`.
- Comprehensive translations across navigation, categories, statuses, dashboards, report forms, and help documentation.
- Official complaint IDs, email addresses, and API payloads maintain strict canonical formatting.

---

## 📱 Progressive Web App (PWA) & Offline Drafts

- **Installable**: Full Web App Manifest (`manifest.json`) and Service Worker (`sw.js`).
- **Offline Drafts**: Citizens in poor connectivity zones can save complaints locally to browser **IndexedDB**.
- **Transparent Sync**: Offline drafts are displayed in a dedicated card in "My Complaints" with `PENDING`, `SYNCING`, `SYNCED`, and `FAILED` states. Sync requires explicit citizen confirmation and online connectivity.
- **Privacy Guarantee**: Passwords and JWT tokens are NEVER stored in IndexedDB.

---

## 🎨 UI/UX Design System

The application strictly implements the required clean, trustworthy municipal civic color palette:
- **Main Background**: `#F4F7F8`
- **Primary Navy**: `#193B50` (Navigation, headings, primary actions)
- **Secondary Teal**: `#287C78` (Secondary actions, positive accents)
- **Accent Gold**: `#D6A64F` (Advisory tags, admin badges)
- **Card Background**: `#FFFFFF`
- **Primary Text**: `#253746`
- **Secondary Text**: `#64748B`
- **Borders**: `#DCE5E9`
- **Status Indicators**: Success `#328568`, Warning `#D49A37`, Error `#C65B5B`

---

## 🗄️ Database Architecture

The system uses persistent SQLite via `better-sqlite3` with **Write-Ahead Logging (WAL)** enabled for performance and strict Foreign Key constraints (`PRAGMA foreign_keys = ON`):

1. **`users`**: Citizens and municipal administrators with bcrypt password hashes, contact details, and assigned roles (`CITIZEN`, `ADMIN`).
2. **`departments`**: Municipal authorities (Sanitation Department, Road Infrastructure, Water Supply Board, Drainage & Stormwater, Electrical & Lighting).
3. **`categories`**: Civic problem categories mapped to default departments and base priority levels.
4. **`complaints`**: Core records containing sequential `complaint_code` (`CC-YYYY-XXXXX`), category, department, coordinates, ward, priority, status, SLA deadlines, and flags.
5. **`complaint_images`**: Multi-file evidence photographs linked to complaints.
6. **`complaint_status_history`**: Immutable lifecycle audit log recording previous status, new status, timestamp, acting user, and remarks.
7. **`resolution_evidence`**: Remedial work descriptions, completion photographs, citizen verification decisions, and rework reasons.
8. **`complaint_supports`**: Unique upvote relationships preventing duplicate support votes.
9. **`duplicate_relations`**: Explicit cross-references between related or duplicate citizen reports.
10. **`notifications`**: User-specific in-app notification records with read/unread tracking.
11. **`escalation_records`**: Citizen supervisory escalation filings with reasons.
12. **`admin_activity_logs`**: Administrative audit trail for department re-routing and status transitions.
13. **`password_resets`**: Time-limited password reset tokens.

---

## 🔑 Default Demo Accounts

The database is pre-seeded with ready-to-test accounts for development and evaluation:

| Role | Email | Access |
|---|---|---|
| **Municipal Administrator** | `admin@codecivic.gov.in` | Use the **Demo Access** button on the login screen |
| **Citizen 1 (Ramesh Kumar)** | `ramesh.citizen@codecivic.gov.in` | Use the **Demo Access** button on the login screen |
| **Citizen 2 (Priya Sharma)** | `priya.sharma@codecivic.gov.in` | Use the **Demo Access** button on the login screen |

> **Development Convenience**: The login dialog features a dedicated **"Demo Access"** card section allowing one-click population of credentials for evaluation without automatic bypass.
>
> **Security Guardrail**: Public citizen registration strictly defaults to the `CITIZEN` role. In production (`NODE_ENV=production`), `JWT_SECRET` must be set via environment variable or the server fails safely at startup.

---

## 🚀 Installation & Running the Application

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node.js v24.13.0)
- **npm**: v9.0.0 or higher

### 2. Install Dependencies
```bash
npm install
cd client && npm install && cd ..
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Start Full-Stack Application in Development Mode
Run both backend API and Vite frontend concurrently:
```bash
npm run dev
```
- **Frontend Portal**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`

### 5. Production Build & Run
To compile the optimized production frontend and run the unified server:
```bash
npm run build
npm run start
```
Open `http://localhost:5000` to access the full-stack production build.

---

## 🧪 Testing and Verification

CodeCivic includes a comprehensive automated test suite spanning unit algorithms and HTTP API end-to-end integration:

### Run All Automated Tests
```bash
npm test
```

### Test Coverage Summary (43 Tests Passed, 0 Failed):
- **Unit & Logic Verification (`server/tests/run_tests.js`) — 13 Passed**:
  - `✓ Database tables and indexes are initialized`
  - `✓ Password hashing and validation works securely`
  - `✓ Admin user exists and has role ADMIN`
  - `✓ Citizen registration defaults strictly to CITIZEN role`
  - `✓ Duplicate detection accurately identifies nearby and text matches`
  - `✓ Heuristic priority recommendation accounts for critical safety keywords`
  - `✓ SLA engine calculates deadlines and flags overdue status correctly`
  - `✓ Community support increments and prevents double-voting`
  - `✓ Recurring issue clustering detects multiple complaints in same area`
  - `✓ Complaints table schema contains ward column for Kota jurisdiction`
  - `✓ Complaints table schema contains India-wide location and classification columns`
  - `✓ Demo evaluation records are explicitly flagged with is_demo = 1`
  - `✓ Geographic boundary validator correctly verifies Indian coordinate bounds`
- **End-to-End HTTP API Integration (`server/tests/e2e_integration_test.js`) — 30 Passed**:
  - `✓ Health check endpoint responds`
  - `✓ Admin login succeeds with JWT and ADMIN role`
  - `✓ Citizen registration creates account with CITIZEN role`
  - `✓ Duplicate detection endpoint evaluates proximity and keywords`
  - `✓ Complaint submission generates unique code CC-YYYY-XXXXX`
  - `✓ Track endpoint returns timeline, SLA countdown, and owner flag`
  - `✓ Community support adds upvote count`
  - `✓ Admin department assignment and priority update succeeds`
  - `✓ Admin records resolution evidence and notifies citizen`
  - `✓ Citizen reports unresolved issue; complaint successfully transitions to REOPENED`
  - `✓ Citizen confirms resolution; complaint officially closes`
  - `✓ Admin recurring issue clustering computes hotspot clusters`
  - `✓ Admin analytics provides genuine category and district distributions`
  - `✓ RBAC prevents ordinary citizen from accessing Admin routes (HTTP 403 Forbidden)`
  - `✓ Invalid JWT is rejected with HTTP 401/403`
  - `✓ Invalid complaint data rejected by backend validation`
  - `✓ Invalid status transition rejected by workflow rules`
  - `✓ Unauthorized escalation on non-owned or resolved complaint rejected`
  - `✓ Public transparency endpoint delivers safe aggregated figures without PII`
  - `✓ Civic Intelligence Dashboard supports multidimensional priority/ward filters`
  - `✓ Ward-wise complaint distribution computed from real database records`
  - `✓ Automated real-data Civic Insights generated for municipal administrators`
  - `✓ Pan-India citizen registration supports non-Kota states and districts`
  - `✓ Pan-India complaint submission persists coordinates and location_source=GPS`
  - `✓ Non-mandatory GPS: Complaint lodged successfully with manual address without coordinates`
  - `✓ Coordinate boundary validation rejects invalid latitude (>90 degrees)`
  - `✓ Admin complaints query correctly filters by state (Maharashtra)`
  - `✓ Admin recurring issues endpoint returns spatial cluster hotspots`
  - `✓ Admin Civic Intelligence supports state/district filtering`
  - `✓ Admin complaints API clearly distinguishes demo evaluation data from public complaints`

---

## 🗺️ Pan-India Geographic Architecture & Location System

- **Full National Coverage**: Complete dynamic dataset of all **28 States** and **8 Union Territories** with their major districts (`client/src/utils/indiaGeoData.js`).
- **Dynamic Cascading Selection**: Citizens and administrators can select any Indian state, dynamically populating official districts without hardcoded limits.
- **Multi-Source Geolocation**:
  - **Live Browser GPS**: Powered by `navigator.geolocation` with high accuracy and graceful permission/timeout error handling (`location_source: 'GPS'`).
  - **Interactive Leaflet Map**: Pan, zoom, click, and drag marker anywhere across India (`location_source: 'MAP_PIN'`).
  - **Location Autocomplete Search**: Debounced search across Indian cities, towns, and localities (`location_source: 'SEARCH'`).
  - **Manual Address Entry**: Non-mandatory GPS allows manual address, locality, city, district, state, and 6-digit PIN code submission (`location_source: 'MANUAL'`).
- **OpenStreetMap Reverse Geocoding**: Automatically resolves latitude and longitude into structured Indian street, locality, city, district, state, and PIN code components.
- **Evaluation vs. Public Data**: Kota demo records are preserved and flagged with `is_demo = 1`, allowing administrators to filter between demonstration data and real citizen submissions.

---

## 🛡️ Dedicated Administrative Command Portal

CodeCivic provides an isolated, enterprise-grade Admin Portal independent of the citizen portal:

- **Isolated Admin Routes**:
  - `/admin/login`: Administrative authentication portal with official styling and one-click commissioner evaluation access.
  - `/admin/dashboard`: Central operational command center with key metrics and live audit trail.
  - `/admin/complaints`: Comprehensive grievance table with Pan-India State, District, and Demo-data filters.
  - `/admin/departments`: Municipal department portfolio and SLA configuration.
  - `/admin/citizens`: Registered citizen directory and contact records.
  - `/admin/analytics`: Civic Intelligence Dashboard with multi-state and multi-ward filtering.
  - `/admin/hotspots`: Interactive recurring issue spatial cluster map with algorithmic recommendations.
  - `/admin/escalations`: Overdue grievances and citizen escalations.
  - `/admin/settings`: Platform system configuration.
- **Independent Layout & Shell**: Dedicated administrative sidebar, top status bar with live IST system clock and server health indicators. The citizen navbar and footer are never exposed within the admin portal.
- **Strict Role-Based Access Control (RBAC)**: All `/api/admin/*` endpoints strictly require `authenticateToken` + `requireAdmin`. Citizens navigating to `/admin/*` are rejected with clear unauthorized guards.

---

## 🏛️ Platform Operations & Contact

- **Coverage**: All 28 Indian States & 8 Union Territories
- **Citizen Helpline**: 1800-180-CIVIC
- **Support Email**: support@codecivic.gov.in
- **Central Registry**: National & State Municipal Administration Network
- **Demonstration Notice**: CodeCivic is an independent civic technology platform engineered for public grievance redressal and transparent municipal evaluation.
