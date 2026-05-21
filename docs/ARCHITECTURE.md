# IRDA System — Architecture Documentation

> **System:** Incident Report & Disciplinary Action (IRDA)
> **Stack:** Laravel 12 / React 18 / Inertia.js / MySQL
> **Last Updated:** 2026-05-18

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & Session Flow](#6-authentication--session-flow)
7. [Backend Architecture](#7-backend-architecture)
8. [Frontend Architecture](#8-frontend-architecture)
9. [External Integrations](#9-external-integrations)
10. [Route Map](#10-route-map)
11. [Environment Configuration](#11-environment-configuration)

---

## 1. System Overview

The **IRDA System** digitalizes the complete lifecycle of employee incidents — from initial report through disciplinary action acknowledgment. It enforces a structured multi-role approval chain, maintains an audit trail of every workflow step, and integrates with the company's HR information system (HRIS) for real-time employee, department, and supervisory hierarchy data.

**Core Capabilities:**
- Multi-step Incident Report (IR) creation and approval
- Disciplinary Action (DA) issuance with a multi-signature chain
- Letter of Explanation (LOE) submission by the employee
- Violation code management and offense-progression tracking
- Dashboard analytics (status trends, top violations, DA distribution)
- Role-based access control derived from HRIS supervisory hierarchy
- SSO integration via Authify
- System-wide maintenance mode

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Framework | Laravel | 12.x |
| Language | PHP | 8.2+ |
| ORM | Eloquent (Laravel) | — |
| Frontend SPA | React | 18.2 |
| SPA Bridge | Inertia.js | 2.0 |
| Build Tool | Vite | 6.2 |
| CSS | Tailwind CSS + DaisyUI | 3.2 / 5.0 |
| UI Primitives | Radix UI, Ant Design | — / 6.0 |
| Charts | Chart.js | 4.5 |
| State Management | Zustand | 5.0 |
| Form Handling | React Hook Form | 7.7 |
| Notifications | Sonner, react-hot-toast | — |
| HTTP Client (FE) | Axios | — |
| Database | MySQL | — |
| Testing | Pest | 3.8 |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                       │
│   Inertia.js renders pages, handles navigation without full      │
│   page reloads. Axios used for AJAX-only endpoints.              │
└────────────────────┬────────────────────────────────────────────┘
                     │  HTTP / Inertia Protocol
┌────────────────────▼────────────────────────────────────────────┐
│                     Laravel 12 Application                        │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  Middleware  │  │   Controllers   │  │      Services       │  │
│  │  AuthMW      │─▶│  IrController   │─▶│  IrRequestService   │  │
│  │  AdminMW     │  │  DashboardCtrl  │  │  IrMaintenanceSvc   │  │
│  │  Inertia     │  │  MaintenanceCtrl│  │  HrisApiService     │  │
│  └──────────────┘  │  AuthCtrl       │  │  DataTableService   │  │
│                    │  AdminCtrl      │  │  SystemStatusSvc    │  │
│                    │  ProfileCtrl    │  └──────────┬──────────┘  │
│                    └─────────────────┘             │             │
│                                                    │             │
│  ┌─────────────────────────────────────────────────▼──────────┐  │
│  │                       Repositories                          │  │
│  │     IrRequestRepository    IrMaintenanceRepository          │  │
│  │     SystemStatusRepository                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Models (Eloquent) │  │   Constants    │  │      Config      │  │
│  │ IrRequest         │  │ IrConstants    │  │  database.php    │  │
│  │ IrList            │  │ (statuses,     │  │  services.php    │  │
│  │ IrApproval        │  │  roles, types) │  │  auth.php        │  │
│  │ IrDaRequest       │  └────────────────┘  └──────────────────┘  │
│  │ IrCodeNo          │                                            │
│  │ IrReason          │                                            │
│  │ IrAdmin           │                                            │
│  │ IrAppeal          │                                            │
│  │ SystemStatus      │                                            │
│  └──────────────────┘                                            │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────┐
        │                          │                       │
┌───────▼────────┐      ┌──────────▼──────┐    ┌──────────▼──────┐
│  MySQL: App DB  │      │ MySQL:masterlist │    │  MySQL:authify  │
│  (Read/Write)   │      │  (Read-Only)    │    │  (Read-Only)    │
│                 │      │  HRIS employee  │    │ authify_sessions │
│  ir_requests    │      │  masterlist     │    └─────────────────┘
│  ir_approvals   │      └─────────────────┘
│  ir_list        │
│  ir_da_requests │      ┌─────────────────┐
│  ir_code_no     │      │  HRIS REST API  │
│  ir_admins      │      │  (HrisApiSvc)   │
│  ir_reasons     │      │  Employee data  │
│  ir_appeals     │      │  Approver chain │
│  system_status  │      │  Direct reports │
└─────────────────┘      └─────────────────┘

                         ┌─────────────────┐
                         │  Authify SSO    │
                         │  (Port 8001)    │
                         │  Login / Logout │
                         └─────────────────┘
```

---

## 4. Directory Structure

```
IRDA/
├── app/
│   ├── Constants/
│   │   └── IrConstants.php             # All enums: statuses, roles, DA types
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthenticationController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── IrController.php            # Main IR workflow HTTP handler
│   │   │   ├── IrMaintenanceController.php # HR admin panel
│   │   │   ├── DemoController.php
│   │   │   └── General/
│   │   │       ├── AdminController.php
│   │   │       └── ProfileController.php
│   │   └── Middleware/
│   │       ├── AuthMiddleware.php          # SSO token validation
│   │       ├── AdminMiddleware.php         # System admin guard
│   │       └── HandleInertiaRequests.php   # Inertia shared props
│   ├── Models/
│   │   ├── IrRequest.php
│   │   ├── IrList.php
│   │   ├── IrApproval.php
│   │   ├── IrDaRequest.php
│   │   ├── IrCodeNo.php
│   │   ├── IrReason.php
│   │   ├── IrAdmin.php
│   │   ├── IrAppeal.php
│   │   ├── SystemStatus.php
│   │   └── User.php
│   ├── Repositories/
│   │   ├── IrRequestRepository.php
│   │   ├── IrMaintenanceRepository.php
│   │   └── SystemStatusRepository.php
│   └── Services/
│       ├── IrRequestService.php            # Core workflow business logic
│       ├── IrMaintenanceService.php
│       ├── HrisApiService.php              # External HRIS HTTP client
│       ├── DataTableService.php
│       └── SystemStatusService.php
├── config/
│   ├── app.php                    # APP_NAME, timezone (Asia/Manila)
│   ├── auth.php
│   ├── database.php               # Three MySQL connections defined here
│   └── services.php               # HRIS API base URL + authentication key
├── database/
│   └── migrations/
├── resources/
│   ├── js/
│   │   ├── app.jsx                # Inertia + React bootstrap entry point
│   │   ├── Pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── IR/
│   │   │   │   ├── IndexIR.jsx          # My IRs (employee view)
│   │   │   │   ├── StaffIR.jsx          # Supervisor's team IRs
│   │   │   │   ├── AdminIR.jsx          # HR global list + bulk actions
│   │   │   │   ├── CreateIR.jsx
│   │   │   │   ├── EditIR.jsx
│   │   │   │   ├── ShowIR.jsx
│   │   │   │   ├── ShowDA.jsx
│   │   │   │   ├── components/          # IR-specific sub-components
│   │   │   │   └── Maintenance/
│   │   │   │       ├── AdminMaintenance.jsx
│   │   │   │       └── CodeMaintenance.jsx
│   │   │   ├── Admin/
│   │   │   │   ├── Admin.jsx
│   │   │   │   └── NewAdmin.jsx
│   │   │   └── Profile.jsx
│   │   └── Components/
│   │       ├── DataTable.jsx      # Reusable server-side paginated table
│   │       ├── Modal.jsx
│   │       ├── NavBar.jsx
│   │       ├── sidebar/
│   │       └── ui/                # Radix-based styled primitives
│   └── views/
│       └── app.blade.php          # Inertia root HTML shell
├── routes/
│   ├── web.php                    # Requires all other route files
│   ├── auth.php
│   ├── irda.php                   # All IR workflow routes
│   └── general.php
├── .env
├── System_Tables.sql              # Legacy DB reference
└── vite.config.js
```

---

## 5. Database Architecture

### 5.1 Connection Map

| Connection Key | Database | Purpose | Access |
|---|---|---|---|
| `mysql` | Application DB | IR data, approvals, codes | Read + Write |
| `masterlist` | `tspi_hr_db` | HRIS employee master list | Read-only |
| `authify` | authify DB | SSO session tokens | Read-only |

### 5.2 Entity Relationship Diagram

```
ir_requests (ir_no — Primary Key)
├──< ir_list          (one IR → many violations)
├──< ir_approvals     (one IR → many per-role approvals)
├──< ir_reasons       (one IR → up to 5 LOE reason entries)
├──  ir_da_requests   (one IR → one DA record)
└──< ir_appeals       (one IR → many appeals)

ir_list.code_no ───────────────────────────► ir_code_no.code_number
ir_requests.emp_no, requestor_id ──────────► HRIS employee data (via API)
ir_admins.emp_no ──────────────────────────► HRIS employee data (via API)
```

### 5.3 Table Schemas

#### `ir_requests` — Main IR Header

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `ir_no` | VARCHAR | Formatted `YY-NNNN` (e.g. `25-0001`) |
| `emp_no` | INT | Employee subject of the IR |
| `requestor_id` | INT | HR person who filed the IR |
| `quality_violation` | TINYINT | 1=Administrative, 2=Quality |
| `reference` | VARCHAR | Optional reference number |
| `what` | TEXT | What happened (incident description) |
| `when_date` | DATE | Date of incident |
| `where_loc` | TEXT | Location of incident |
| `how` | TEXT | How the incident occurred |
| `suspension` | TEXT | Suspension details (nullable) |
| `assessment` | TEXT | Supervisor's assessment |
| `recommendation` | TEXT | Supervisor's recommendation |
| `sign` | VARCHAR | IR signature field |
| `da_sign` | VARCHAR | DA signature field |
| `sign_date` | DATE | Date of signing |
| `ir_status` | TINYINT | 0=Pending, 1=Validated, 2=Approved, 3=Invalid, 4=Cancelled |
| `sv_no` | INT | Supervisor emp_no override (nullable) |
| `disapprove_remarks` | TEXT | HR remarks on disapproval |
| `read_status` | TINYINT | Employee read tracking |
| `read_date` | DATE | Date employee read the IR |
| `is_inactive` | BOOL | Soft-delete flag |
| `date_created` | DATETIME | Creation timestamp |
| `date_updated` | DATETIME | Last update timestamp |

#### `ir_approvals` — Per-Role Approval Tracking

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `ir_no` | VARCHAR | FK → `ir_requests.ir_no` |
| `role` | ENUM | `sv`, `hr`, `dh`, `od`, `hr_mngr`, `dm`, `da` |
| `approver_emp_no` | INT | Employee who acted on this step |
| `status` | TINYINT | 0=Pending, 1=Approved, 2=Disapproved |
| `sign_date` | DATETIME | IR-level action timestamp |
| `da_sign_date` | DATETIME | DA-level action timestamp |
| `remarks` | TEXT | Notes for the approval/disapproval |

#### `ir_list` — Violations Per IR

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `ir_no` | VARCHAR | FK → `ir_requests.ir_no` |
| `emp_no` | INT | Employee subject |
| `code_no` | VARCHAR | FK → `ir_code_no.code_number` |
| `violation` | TEXT | Violation description text |
| `da_type` | TINYINT | 1=Verbal, 2=Written, 3=3-Day Susp, 4=7-Day Susp, 5=Dismissal |
| `date_committed` | DATE | Date violation occurred |
| `offense_no` | TINYINT | Offense count (1st, 2nd, 3rd…) |
| `disposition` | VARCHAR | Final disposition text |
| `DATE_of_suspension` | DATE | Suspension start date |
| `days_no` | INT | Number of suspension days |
| `valid` | BOOL | HR validity mark |
| `cleansed` | BOOL | Record cleansed flag |
| `appeal_da_type` | TINYINT | Revised DA type after appeal |
| `appeal_days` | INT | Revised suspension days |
| `appeal_date` | DATE | Appeal date |
| `date_of_LOE` | DATETIME | LOE submission timestamp |

#### `ir_da_requests` — Disciplinary Action Lifecycle

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `ir_no` | VARCHAR | FK → `ir_requests.ir_no` |
| `da_type` | TINYINT | 1-5 (same as `ir_list.da_type`) |
| `da_requestor_emp_no` | INT | HR who issued the DA |
| `da_requested_date` | DATE | DA issuance date |
| `da_others` | TEXT | Additional DA notes |
| `da_status` | TINYINT | 0=Pending, 1=HR Signed, 2=SV Acked, 3=DM Acked, 4=Emp Acked |
| `valid_to_da_emp_no` | INT | Employee the DA is directed to |
| `valid_to_da_date` | DATETIME | DA effective date |
| `acknowledge_da` | BOOL | Employee acknowledgment flag |
| `acknowledge_date` | DATE | Date employee acknowledged |

#### `ir_code_no` — Violation Code Master

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `code_number` | VARCHAR UNIQUE | Code identifier (e.g. `A-01`) |
| `violation` | TEXT | Violation description |
| `status` | BOOL | Active/Inactive |
| `category` | VARCHAR | Violation category |
| `root_cause` | VARCHAR | Root cause classification |
| `first_offense` | TEXT | Penalty for 1st offense |
| `second_offense` | TEXT | Penalty for 2nd offense |
| `third_offense` | TEXT | Penalty for 3rd offense |
| `fourth_offense` | TEXT | Penalty for 4th offense |
| `fifth_offense` | TEXT | Penalty for 5th offense |

#### `ir_admins` — HR Personnel Assignments

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `emp_no` | INT UNIQUE | HR employee number |
| `role` | ENUM | `hr` or `hr_mngr` |
| `is_active` | BOOL | Active status |
| `created_at` | TIMESTAMP | — |
| `updated_at` | TIMESTAMP | — |

#### `ir_reasons` — Letter of Explanation Entries

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `ir_no` | VARCHAR | FK → `ir_requests.ir_no` |
| `seq` | TINYINT | Sequence 1–5 |
| `reason_text` | TEXT | Employee's explanation text |

#### `ir_appeals` — Employee Appeals

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `ir_no` | VARCHAR | FK → `ir_requests.ir_no` |
| `content` | TEXT | Appeal content |

#### `system_status` — Maintenance Mode

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `status` | VARCHAR | `online` or `maintenance` |
| `message` | TEXT | Maintenance message shown to users |
| `updated_at` | TIMESTAMP | Last toggle time |

---

## 6. Authentication & Session Flow

```
Browser Request
      │
      ├─ Check for SSO token: query param (?key=) → cookie → session
      │
      ├─ No token found?
      │       └──▶ Redirect to Authify (port 8001) with ?redirect= callback URL
      │
      └─ Token found → AuthMiddleware.php
              │
              ├─ Query authify.authify_sessions WHERE token = ?
              │
              ├─ Not found / expired?
              │       └──▶ Clear session → Redirect to Authify login
              │
              ├─ Valid token
              │       ├─ Set session('emp_data') with employee metadata
              │       ├─ Set 7-day SSO cookie
              │       ├─ Check system_status table
              │       │       └─ If 'maintenance' and not a bypass route → Show 503 page
              │       └─ Allow request to continue to controller
              │
              └─ Logout request
                      └──▶ Clear session → Redirect to Authify SSO logout endpoint
```

**Session Data (`session('emp_data')`):**

```php
[
    'token'           => 'abc123...',          // SSO token string
    'emp_id'          => 12345,                // Employee ID
    'emp_name'        => 'DELA CRUZ, JUAN',    // Full name
    'emp_firstname'   => 'Juan',
    'emp_dept_id'     => 3,
    'emp_jobtitle_id' => 7,
    'emp_prodline_id' => 2,
    'emp_position_id' => 4,
    'emp_station_id'  => 1,
    'shift_type'      => 'Day',
    'team'            => 'Team A',
    'generated_at'    => '2025-01-01 08:00:00',
]
```

---

## 7. Backend Architecture

### 7.1 Layered Design

```
HTTP Request
     │
     ▼
Middleware (AuthMiddleware → AdminMiddleware → HandleInertiaRequests)
     │
     ▼
Controller  ─── validates HTTP input, delegates business logic ───▶ Service
     │                                                                  │
     ▼                                                                  ▼
Inertia::render() / JSON response                                  Repository
                                                                       │
                                                                       ▼
                                                               Eloquent Models
                                                                       │
                                                                       ▼
                                                              MySQL Application DB
```

### 7.2 Role Resolution Logic

When a user opens an IR, `IrRequestService::resolveCurrentUserRole()` computes their role dynamically by checking in order:

```
1. emp_id === ir.emp_no?            → "employee"
2. emp_id in ir_admins (hr_mngr)?  → "hr_mngr"
3. emp_id in ir_admins (hr)?       → "hr"
4. emp_id === HRIS approver1_id?   → "sv"  (Supervisor)
5. emp_id === HRIS approver2_id?   → "dh"  (Department Head)
6. None of above                   → "view_only"
```

The resolved role is passed to `resolveAvailableActions()` which returns the list of workflow actions available for the current user, used by the frontend to show/hide buttons.

### 7.3 IR Number Generation

IR numbers follow the format `YY-NNNN`:
- `YY` = last two digits of the current year
- `NNNN` = sequential 4-digit counter, **resets each year**
- Example: `25-0001`, `25-0002`, `26-0001`

### 7.4 Constants Reference (`IrConstants.php`)

```php
// IR Workflow Statuses
IR_PENDING    = 0
IR_VALIDATED  = 1
IR_APPROVED   = 2
IR_INVALID    = 3
IR_CANCELLED  = 4

// DA Workflow Statuses
DA_PENDING    = 0   // DA not yet issued
DA_HR_SIGNED  = 1   // HR Manager signed
DA_SV_ACKED   = 2   // Supervisor acknowledged
DA_DM_ACKED   = 3   // Division Manager acknowledged
DA_EMP_ACKED  = 4   // Employee acknowledged (complete)

// DA Types
DA_TYPE_VERBAL    = 1
DA_TYPE_WRITTEN   = 2
DA_TYPE_3DAY      = 3
DA_TYPE_7DAY      = 4
DA_TYPE_DISMISSAL = 5

// Approval Record Statuses
APPROVAL_PENDING     = 0
APPROVAL_APPROVED    = 1
APPROVAL_DISAPPROVED = 2

// Violation Categories
VIOLATION_ADMINISTRATIVE = 1
VIOLATION_QUALITY        = 2

// Companies that use IR-only flow (no DA)
IR_ONLY_COMPANY_IDS = [5]
```

---

## 8. Frontend Architecture

### 8.1 Inertia.js Page Rendering

The backend returns `Inertia::render('PageName', $props)`. The React SPA receives this as JSON and renders the matching page component without a full page reload, giving the feel of a traditional SPA while keeping server-side routing and data fetching.

**Shared Props (via `HandleInertiaRequests.php`):**
- `auth.user` — logged-in employee session data
- `flash` — success/error flash messages from redirects

### 8.2 Key Page Components

| Page | Route | Purpose |
|---|---|---|
| `Dashboard.jsx` | `/` | Analytics charts and KPI cards |
| `IndexIR.jsx` | `/ir` | Employee's own IR list |
| `StaffIR.jsx` | `/ir/staff` | Supervisor's direct report IRs |
| `AdminIR.jsx` | `/ir/admin` | HR global IR list + bulk actions |
| `CreateIR.jsx` | `/ir/create` | New IR creation form |
| `EditIR.jsx` | `/ir/{hash}/edit` | Edit a disapproved IR |
| `ShowIR.jsx` | `/ir/{hash}` | IR detail + workflow action buttons |
| `ShowDA.jsx` | `/ir/{hash}/da` | DA detail + signature acknowledgment |
| `AdminMaintenance.jsx` | `/ir/maintenance/admins` | HR admin personnel CRUD |
| `CodeMaintenance.jsx` | `/ir/maintenance/codes` | Violation code CRUD |
| `Admin.jsx` | `/admin` | System administrators list |
| `Profile.jsx` | `/profile` | User profile + password change |

### 8.3 AJAX Endpoints (JSON — not Inertia)

These are called directly from React hooks using Axios:

| Endpoint | Hook | Purpose |
|---|---|---|
| `GET /ir/employees/search?q=&page=` | `useEmployee.js` | Employee autocomplete in create/edit form |
| `GET /ir/employees/{id}/work` | `useEmployee.js` | Load work details on employee select |
| `GET /ir/code-numbers?page=` | `useCodeNumbers.js` | Paginated violation code picker |

---

## 9. External Integrations

### 9.1 HRIS REST API (`HrisApiService.php`)

All requests use the `X-Internal-Key` header for authentication. The base URL is configured via `HRIS_API_URL` in `.env`.

| Method | Data Returned |
|---|---|
| `fetchEmployeeName(emp_no)` | Employee full name |
| `fetchWorkDetails(emp_no)` | Department, prodline, station, shift, team, company_id |
| `fetchApprovers(emp_no)` | `approver1_id` (Supervisor), `approver2_id` (Dept Head) |
| `fetchEmployeesBulk([ids])` | Batch name lookups — prevents N+1 on list pages |
| `fetchDirectReports(emp_no)` | List of direct report employees for a supervisor |
| `fetchActiveEmployees(q, page)` | Paginated search for the create IR form |

### 9.2 Authify SSO

| Scenario | Behavior |
|---|---|
| No token | Redirect to `{SSO_URL}?redirect={callback_url}` |
| Valid token | Set session + 7-day cookie, allow request |
| Invalid/expired token | Clear session, redirect to SSO login |
| Logout | Destroy session + redirect to Authify logout endpoint |

---

## 10. Route Map

### Auth Routes (`routes/auth.php`)
```
GET  /{app_name}/logout        → AuthenticationController@logout
GET  /{app_name}/unauthorized  → Unauthorized page
```

### General Routes (`routes/general.php`)
```
GET   /{app_name}/                  → DashboardController@index
GET   /{app_name}/profile           → ProfileController@index
POST  /{app_name}/change-password   → ProfileController@changePassword
GET   /{app_name}/admin             → AdminController@index      [AdminMiddleware]
GET   /{app_name}/new-admin         → AdminController@create     [AdminMiddleware]
POST  /{app_name}/add-admin         → AdminController@store      [AdminMiddleware]
POST  /{app_name}/remove-admin      → AdminController@destroy    [AdminMiddleware]
PATCH /{app_name}/change-admin-role → AdminController@update     [AdminMiddleware]
```

### IR Workflow Routes (`routes/irda.php`)
```
GET   /{app_name}/ir                         → IrController@index         (My IR list)
GET   /{app_name}/ir/staff                   → IrController@staff         (Staff IR list)
GET   /{app_name}/ir/admin                   → IrController@adminList     (Admin IR list)
GET   /{app_name}/ir/create                  → IrController@create
POST  /{app_name}/ir/store                   → IrController@store
GET   /{app_name}/ir/employees/search        → IrController@searchEmployees        [JSON]
GET   /{app_name}/ir/employees/{id}/work     → IrController@employeeWorkDetails    [JSON]
GET   /{app_name}/ir/code-numbers            → IrController@codeNumbers            [JSON]
GET   /{app_name}/ir/{hash}                  → IrController@show
GET   /{app_name}/ir/{hash}/da               → IrController@showDa
POST  /{app_name}/ir/bulk-action             → IrController@bulkAction
GET   /{app_name}/ir/{hash}/edit             → IrController@edit
POST  /{app_name}/ir/{hash}/resubmit         → IrController@resubmit
POST  /{app_name}/ir/{hash}/validate         → IrController@validateIr
POST  /{app_name}/ir/{hash}/loe              → IrController@submitLoe
POST  /{app_name}/ir/{hash}/assess           → IrController@supervisorAssess
POST  /{app_name}/ir/{hash}/dept-review      → IrController@deptHeadReview
POST  /{app_name}/ir/{hash}/revalidate       → IrController@hrRevalidate
POST  /{app_name}/ir/{hash}/issue-da         → IrController@issueDa
POST  /{app_name}/ir/{hash}/da/hr-approve    → IrController@hrManagerApprove
POST  /{app_name}/ir/{hash}/da/sv-ack        → IrController@svAcknowledge
POST  /{app_name}/ir/{hash}/da/dm-ack        → IrController@dmAcknowledge
POST  /{app_name}/ir/{hash}/da/acknowledge   → IrController@employeeAcknowledge
```

### Maintenance Routes (`routes/irda.php` — HR role required)
```
GET    /{app_name}/ir/maintenance/admins             → IrMaintenanceController@admins
POST   /{app_name}/ir/maintenance/admins             → IrMaintenanceController@adminStore
PUT    /{app_name}/ir/maintenance/admins/{id}        → IrMaintenanceController@adminUpdate
POST   /{app_name}/ir/maintenance/admins/{id}/toggle → IrMaintenanceController@adminToggle
DELETE /{app_name}/ir/maintenance/admins/{id}        → IrMaintenanceController@adminDelete
GET    /{app_name}/ir/maintenance/codes              → IrMaintenanceController@codes
POST   /{app_name}/ir/maintenance/codes              → IrMaintenanceController@codeStore
PUT    /{app_name}/ir/maintenance/codes/{id}         → IrMaintenanceController@codeUpdate
POST   /{app_name}/ir/maintenance/codes/{id}/toggle  → IrMaintenanceController@codeToggle
```

---

## 11. Environment Configuration

Key `.env` variables:

```env
# Application
APP_NAME=irda                     # Used as URL prefix for all routes
APP_URL=http://your-domain.com
APP_TIMEZONE=Asia/Manila

# Application Database (Read/Write)
DB_HOST=
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

# HRIS Masterlist Database (Read-Only)
MDB_HOST=
MDB_DATABASE=tspi_hr_db
MDB_USERNAME=
MDB_PASSWORD=

# Authify SSO Database (Read-Only)
ADB_HOST=
ADB_DATABASE=
ADB_USERNAME=
ADB_PASSWORD=

# SSO
SSO_COOKIE_NAME=authify_token
SSO_URL=http://authify-server:8001

# HRIS REST API
HRIS_API_URL=http://hris-api-server/api
HRIS_API_KEY=your-internal-api-key

# Session
SESSION_DRIVER=file
SESSION_LIFETIME=720              # 12 hours
```
