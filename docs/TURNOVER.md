# IRDA System — Turnover Documentation

> **System:** Incident Report & Disciplinary Action (IRDA)
> **Last Updated:** 2026-05-18
> **Audience:** Developers, HR Admins, and System Administrators taking over the system

---

## Table of Contents

1. [System Purpose](#1-system-purpose)
2. [User Roles Reference](#2-user-roles-reference)
3. [Complete IR Workflow — Step by Step](#3-complete-ir-workflow--step-by-step)
4. [DA Workflow — Step by Step](#4-da-workflow--step-by-step)
5. [Process Flow Per Role](#5-process-flow-per-role)
   - 5.1 [Employee](#51-employee)
   - 5.2 [HR Personnel](#52-hr-personnel)
   - 5.3 [HR Manager](#53-hr-manager)
   - 5.4 [Supervisor (SV)](#54-supervisor-sv)
   - 5.5 [Department Head (DH)](#55-department-head-dh)
   - 5.6 [Division Manager (DM)](#56-division-manager-dm)
   - 5.7 [System Administrator](#57-system-administrator)
6. [IR Status Reference](#6-ir-status-reference)
7. [DA Status Reference](#7-da-status-reference)
8. [Special Cases & Business Rules](#8-special-cases--business-rules)
9. [Admin Maintenance Processes](#9-admin-maintenance-processes)
10. [Dashboard & Analytics](#10-dashboard--analytics)
11. [Handover Checklist](#11-handover-checklist)

---

## 1. System Purpose

The **IRDA (Incident Report & Disciplinary Action) System** is a digital workflow platform that manages the lifecycle of employee incidents and the corresponding disciplinary actions. It replaces paper-based processes with a traceable, role-enforced digital chain of approvals.

**Two Core Tracks:**
- **IR Track** — Incident is filed, validated, assessed, and approved. Produces an official record.
- **DA Track** — Once IR is approved, a Disciplinary Action is issued and must be signed/acknowledged by all parties.

Both tracks run in sequence on the same IR record, identified by a unique IR number (`YY-NNNN`).

---

## 2. User Roles Reference

Roles are **dynamically resolved** per IR — the same person may have different roles on different IRs depending on their relationship to the subject employee.

| Role | How Assigned | Scope |
|---|---|---|
| **Employee** | Automatically — when `emp_no` on IR matches logged-in user | The IR filed against them |
| **HR** | Registered in `ir_admins` table with `role = 'hr'` | All IRs system-wide |
| **HR Manager** | Registered in `ir_admins` table with `role = 'hr_mngr'` | All IRs system-wide |
| **Supervisor (SV)** | HRIS `approver1_id` for the employee on the IR | IRs of their direct reports |
| **Department Head (DH)** | HRIS `approver2_id` for the employee on the IR | IRs of employees under their dept |
| **Division Manager (DM)** | Not auto-resolved — involved at DA acknowledgment | DA acknowledgment only |
| **System Admin** | Registered in the system `admin` table | System-level management only |
| **View-Only** | Default for anyone with none of the above roles | Read only, no actions |

---

## 3. Complete IR Workflow — Step by Step

The following is the full lifecycle of an IR from creation to DA acknowledgment.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                    INCIDENT REPORT WORKFLOW                           │
  └──────────────────────────────────────────────────────────────────────┘

  STEP 1: HR Creates IR
  ─────────────────────
  HR fills out the Create IR form:
  • Searches for and selects the employee (from HRIS)
  • System auto-fills: dept, prodline, station, shift, team, company
  • System auto-fetches: Supervisor (approver1) and Dept Head (approver2) from HRIS
  • HR fills: what happened, when, where, how
  • HR selects violations: code number + DA type for each violation
  • IR is saved with status: PENDING (0)
  • IR Number is generated: YY-NNNN
  
       ▼

  STEP 2: Employee Notified
  ─────────────────────────
  Employee can see the IR in their "My IR" list.
  IR is in PENDING status — employee can view but cannot act yet.
  
       ▼

  STEP 3: HR Validates IR
  ───────────────────────
  HR reviews the IR in the Admin IR list.
  HR may:
  ┌─ APPROVE: IR moves to VALIDATED (1)
  │           → Employee is notified to submit Letter of Explanation (LOE)
  │
  └─ DISAPPROVE: IR stays PENDING with disapprove_remarks
                 → Employee can edit and resubmit the IR
  
       ▼  (if Approved)

  STEP 4: Employee Submits Letter of Explanation (LOE)
  ─────────────────────────────────────────────────────
  Employee logs in, opens their IR, and submits 5 sequential written explanations.
  Each LOE entry is stored in ir_reasons (seq 1–5).
  LOE submission is logged with a timestamp on ir_list.date_of_LOE.
  
       ▼

  STEP 5: Supervisor Assesses
  ────────────────────────────
  Supervisor logs in and sees the IR in their Staff IR list.
  Supervisor writes:
  • Assessment (text) — their evaluation of the incident
  • Recommendation (text) — their suggested disciplinary action
  The ir_approval record for role='sv' is updated (status → Approved).
  
       ▼

  STEP 6: HR Re-Validates (After Supervisor Assessment)
  ──────────────────────────────────────────────────────
  HR reviews the assessment and recommendation.
  HR may:
  ┌─ PROCEED: IR is queued for Department Head approval
  │
  └─ MARK INVALID: IR status → INVALID (3). Workflow ends.
  
       ▼  (if Proceed)

  STEP 7: Department Head Approves
  ──────────────────────────────────
  Department Head logs in, reviews the IR.
  Department Head:
  ┌─ APPROVES: IR status → APPROVED (2)
  │            → IR workflow is complete
  │            → DA workflow begins
  │
  └─ DISAPPROVES: With remarks. IR may return for re-review.
  
       ▼  (if Approved)

  ─────────────────────────────────────────────────────────────
  IR WORKFLOW COMPLETE — DA WORKFLOW BEGINS
  ─────────────────────────────────────────────────────────────

  STEP 8: HR Issues DA
  ─────────────────────
  HR logs in and issues a Disciplinary Action.
  A record is created in ir_da_requests with da_status = 0 (Pending).
  
       ▼

  STEP 9: HR Manager Signs DA
  ────────────────────────────
  HR Manager logs in, opens the DA view, and signs.
  da_status → 1 (HR Manager Signed).
  
       ▼

  STEP 10: Supervisor Acknowledges DA
  ────────────────────────────────────
  Supervisor logs in, opens the DA view, and acknowledges.
  da_status → 2 (Supervisor Acknowledged).
  
       ▼

  STEP 11: Division Manager Acknowledges DA
  ──────────────────────────────────────────
  Division Manager logs in, opens the DA view, and acknowledges.
  da_status → 3 (DM Acknowledged).
  
       ▼

  STEP 12: Employee Acknowledges DA
  ───────────────────────────────────
  Employee logs in, opens the DA view, and acknowledges receipt.
  da_status → 4 (Employee Acknowledged).
  acknowledge_da = true, acknowledge_date = today.
  
       ▼

  WORKFLOW COMPLETE — IR is fully resolved.
```

---

## 4. DA Workflow — Step by Step

The DA workflow runs after the IR is fully approved (IR status = 2).

```
  IR Approved (ir_status = 2)
         │
         ▼
  [HR] Issue DA ──────────────────── da_status = 0 (DA record created)
         │
         ▼
  [HR_MNGR] Sign DA ──────────────── da_status = 1
         │
         ▼
  [SV] Acknowledge DA ─────────────── da_status = 2
         │
         ▼
  [DM] Acknowledge DA ─────────────── da_status = 3
         │
         ▼
  [Employee] Acknowledge DA ──────── da_status = 4
         │                          acknowledge_da = true
         ▼
  DA COMPLETE
```

**DA Types:**
| Value | Label |
|---|---|
| 1 | Verbal Warning |
| 2 | Written Warning |
| 3 | 3-Day Suspension |
| 4 | 7-Day Suspension |
| 5 | Dismissal |

---

## 5. Process Flow Per Role

---

### 5.1 Employee

**How the system identifies you:** Your `emp_id` from the SSO session matches the `emp_no` on the IR.

**Pages accessible:**
- `My IR` (`/ir`) — see all IRs filed against you
- `View IR` (`/ir/{hash}`) — view IR details
- `Edit IR` (`/ir/{hash}/edit`) — only when IR was disapproved by HR
- `View DA` (`/ir/{hash}/da`) — see your DA

**What you can do and when:**

| Action | When Available | What Happens |
|---|---|---|
| **View IR** | Always | Read the incident details, violations, and approvals |
| **Edit & Resubmit IR** | IR is Pending + was disapproved by HR | Update incident details and resubmit |
| **Submit Letter of Explanation (LOE)** | IR is Validated (HR approved) | Fill in 5 explanation fields and submit |
| **Acknowledge DA** | da_status = 3 (DM has acknowledged) | Confirm receipt of DA — final step |

**Step-by-step for employee:**
```
1. Log in via SSO
2. Go to "My IR" in the sidebar
3. See all IRs filed against you
4. When IR status is "Validated" → Open IR → Submit your Letter of Explanation (5 fields)
5. If HR disapproves IR → Open IR → "Edit" → Correct details → Resubmit
6. When DA is issued and ready → Go to DA view → Acknowledge
```

---

### 5.2 HR Personnel

**How the system identifies you:** Your `emp_id` is registered in `ir_admins` with `role = 'hr'`.

**Pages accessible:**
- `Dashboard` (`/`) — analytics and counts
- `Admin IR` (`/ir/admin`) — global IR list with bulk actions
- `My IR` (`/ir`) — IRs filed against you personally
- `View IR` (`/ir/{hash}`) — detail + action buttons
- `View DA` (`/ir/{hash}/da`) — DA detail + issue DA button
- `Admin Maintenance` (`/ir/maintenance/admins`) — manage HR admin personnel
- `Code Maintenance` (`/ir/maintenance/codes`) — manage violation codes
- `Create IR` (`/ir/create`) — file a new IR

**What you can do and when:**

| Action | When Available | What Happens |
|---|---|---|
| **Create IR** | Anytime | File a new IR for an employee |
| **Validate IR (Approve)** | IR is Pending | IR status → Validated. Employee notified to submit LOE |
| **Validate IR (Disapprove)** | IR is Pending | IR stays Pending with your remarks. Employee can edit |
| **Re-validate after Assessment** | Supervisor has assessed | Choose: Proceed (continue to DH) or Mark Invalid |
| **Mark Invalid** | After SV Assessment | IR status → Invalid. Workflow ends |
| **Issue DA** | IR is Approved (status = 2) | Creates DA record. HR Manager is next to sign |
| **Bulk: Validate Valid** | Admin IR list | Mark selected IRs as valid in bulk |
| **Bulk: Validate Invalid** | Admin IR list | Mark selected IRs as invalid in bulk |
| **Bulk: Approve DA** | Admin IR list | Approve selected DAs in bulk |
| **Manage IR Admins** | Anytime | Add/remove/toggle HR and HR Manager personnel |
| **Manage Violation Codes** | Anytime | Add/edit/toggle violation code entries |

**Step-by-step for HR creating and processing an IR:**
```
1. Log in via SSO → Go to Dashboard or Admin IR
2. Click "Create IR" → Search for the employee
3. System auto-fills their work details and approval chain (SV, DH)
4. Fill incident details (what, when, where, how) + add violations (code + DA type)
5. Submit IR → IR is created with status Pending
6. Go to Admin IR list → Find the new IR
7. Open IR → Click "Validate" and choose Approve or Disapprove
8. If Approved: wait for employee LOE, then SV assessment
9. After SV assesses: open IR → "Re-validate" → choose Proceed or Invalid
10. If Proceed: wait for DH approval
11. After DH approves: open IR → "Issue DA"
12. Wait for HR Manager to sign, then SV ack, then DM ack, then employee ack
```

---

### 5.3 HR Manager

**How the system identifies you:** Your `emp_id` is registered in `ir_admins` with `role = 'hr_mngr'`.

**Pages accessible:**
- `Dashboard` (`/`) — analytics
- `Admin IR` (`/ir/admin`) — global IR list (view only at this list level)
- `View IR` (`/ir/{hash}`) — IR detail (view only — HR Managers do not act on the IR itself)
- `View DA` (`/ir/{hash}/da`) — DA detail + **Sign DA** button

**What you can do and when:**

| Action | When Available | What Happens |
|---|---|---|
| **Sign DA** | DA has been issued (da_status = 0) | da_status → 1. Supervisor is next to acknowledge |

**Step-by-step for HR Manager:**
```
1. Log in via SSO
2. Go to Admin IR list → Filter by status "For DA Signing" (or check notifications)
3. Open the IR → Navigate to DA view (/da)
4. Review DA details
5. Click "Sign DA"
6. Workflow continues to Supervisor acknowledgment
```

---

### 5.4 Supervisor (SV)

**How the system identifies you:** Your `emp_id` matches `approver1_id` returned by HRIS for the employee on the IR.

**Pages accessible:**
- `Staff IR` (`/ir/staff`) — list of IRs for your direct reports
- `View IR` (`/ir/{hash}`) — IR detail + action buttons
- `View DA` (`/ir/{hash}/da`) — DA detail + acknowledge button

**What you can do and when:**

| Action | When Available | What Happens |
|---|---|---|
| **Assess IR** | IR is Validated + employee has submitted LOE | Fill assessment + recommendation. ir_approval for 'sv' → Approved |
| **Acknowledge DA** | da_status = 1 (HR Manager has signed) | da_status → 2. Division Manager is next |

**Step-by-step for Supervisor:**
```
1. Log in via SSO
2. Go to "Staff IR" in the sidebar
3. Filter your direct report's IRs by status or employee name
4. When IR is validated and LOE is submitted: Open IR → Fill "Assessment" and "Recommendation" → Submit
5. When DA is ready for your acknowledgment: Go to DA view → Click "Acknowledge"
```

---

### 5.5 Department Head (DH)

**How the system identifies you:** Your `emp_id` matches `approver2_id` returned by HRIS for the employee on the IR.

**Pages accessible:**
- `Staff IR` (`/ir/staff`) — IRs visible for employees under your department
- `View IR` (`/ir/{hash}`) — IR detail + approval button

**What you can do and when:**

| Action | When Available | What Happens |
|---|---|---|
| **Approve IR** | HR has re-validated and chosen "Proceed" | IR status → Approved (2). DA workflow begins |
| **Disapprove IR** | HR has re-validated and chosen "Proceed" | With remarks. IR may need re-review |

**Step-by-step for Department Head:**
```
1. Log in via SSO
2. Go to "Staff IR"
3. Find IRs awaiting your approval (status will indicate DH step)
4. Open IR → Review all details, LOE, SV assessment and recommendation
5. Click "Approve" or "Disapprove" with optional remarks
6. If Approved: IR is now ready for DA issuance by HR
```

---

### 5.6 Division Manager (DM)

**How the system identifies you:** Contextually identified during the DA acknowledgment step. DM is not auto-resolved from HRIS — the system determines DM access at the DA acknowledgment step.

**Pages accessible:**
- `View DA` (`/ir/{hash}/da`) — DA detail + acknowledge button (when it's your turn)

**What you can do and when:**

| Action | When Available | What Happens |
|---|---|---|
| **Acknowledge DA** | da_status = 2 (Supervisor has acknowledged) | da_status → 3. Employee is next to acknowledge |

**Step-by-step for Division Manager:**
```
1. Log in via SSO
2. Navigate to the DA view using the IR link shared by HR
3. Review DA details
4. Click "Acknowledge" to sign off on the DA
5. Employee will then be notified to complete their acknowledgment
```

---

### 5.7 System Administrator

**How the system identifies you:** Your `emp_id` is registered in the system `admin` table. Guarded by `AdminMiddleware`.

**Pages accessible:**
- `Admin` (`/admin`) — system administrator list
- All other pages accessible by your primary role (if also an HR person)

**What you can do:**

| Action | When Available | What Happens |
|---|---|---|
| **Add System Admin** | Anytime | Register a new system administrator |
| **Remove System Admin** | Anytime | Deregister an administrator |
| **Change Admin Role** | Anytime | Promote/demote admin role |
| **Toggle Maintenance Mode** | Anytime | Set system status to maintenance — blocks all users except bypass routes |

**Step-by-step for System Admin:**
```
1. Log in via SSO
2. Go to "Admin" in the sidebar
3. View current system administrators
4. Use "Add Admin" to register new admins
5. Use action buttons to remove or change roles
6. Maintenance mode toggle is available via system status settings
```

---

## 6. IR Status Reference

| Status Code | Label | Meaning |
|---|---|---|
| `0` | **Pending** | IR was filed. Awaiting HR validation |
| `1` | **Validated** | HR approved. Waiting for LOE → SV Assessment → DH Approval |
| `2` | **Approved** | DH approved. IR complete. DA workflow can begin |
| `3` | **Invalid** | HR marked invalid after SV assessment. Workflow ends |
| `4` | **Cancelled** | IR was cancelled. Workflow ends |

**Display Status Resolution:**
The system computes a human-readable status label from the combination of `ir_status`, the `ir_approvals` records, and the `da_status`. This means the same `ir_status = 1` may display differently depending on which approval step is currently active (e.g., "Awaiting LOE", "Awaiting SV Assessment", "For DH Approval").

---

## 7. DA Status Reference

| Status Code | Label | Next Actor |
|---|---|---|
| `0` | **Pending / Not Issued** | HR (issue DA) |
| `1` | **HR Manager Signed** | Supervisor (acknowledge) |
| `2` | **Supervisor Acknowledged** | Division Manager (acknowledge) |
| `3` | **DM Acknowledged** | Employee (acknowledge) |
| `4` | **Employee Acknowledged** | — Complete — |

---

## 8. Special Cases & Business Rules

### IR-Only Companies
Companies with IDs listed in `IrConstants::IR_ONLY_COMPANY_IDS` (currently `[5]`) **skip the DA workflow entirely**. The IR goes through the full approval chain but no DA is issued after IR approval.

### DA Types and Suspension Days
When a DA type of 3-Day or 7-Day Suspension is selected, the `days_no` and `DATE_of_suspension` fields on `ir_list` are populated. These drive the suspension scheduling.

### Offense Number Tracking
The `offense_no` field on `ir_list` tracks how many times the employee has committed the same violation (1st, 2nd, 3rd offense). The `ir_code_no` table stores the expected penalty per offense number.

### LOE (Letter of Explanation)
- Submitted by the employee after HR validates the IR
- Contains exactly 5 sequential reason entries (`ir_reasons.seq = 1` to `5`)
- Can be re-submitted — old reasons are deleted and replaced
- Timestamp is stored on `ir_list.date_of_LOE`

### Bulk Actions (HR Only)
From the Admin IR list, HR can:
- Select multiple IRs and validate them as **valid** or **invalid** in one action
- Select multiple IRs and **approve their DAs** in bulk
- Optionally use "select all" with active filters for mass operations

### Disapproval Flow
- If HR disapproves the IR, the `disapprove_remarks` field is populated
- The employee can view the remarks, edit the IR, and resubmit
- Resubmit resets the IR to Pending status for HR to re-validate

### Maintenance Mode
- When `system_status.status = 'maintenance'`, all routes except logout and system status return a 503 maintenance page
- Useful for scheduled downtime or DB migrations

---

## 9. Admin Maintenance Processes

### Managing HR Admins (`/ir/maintenance/admins`)

HR can manage who has HR access in the system.

| Action | How |
|---|---|
| **Add HR personnel** | Enter employee number + select role (`hr` or `hr_mngr`) → Submit |
| **Change role** | Edit the admin record → Change role dropdown → Save |
| **Deactivate** | Toggle the active switch — person loses HR access but record is preserved |
| **Delete** | Remove the record entirely from `ir_admins` |

> Only employees registered here have the `hr` or `hr_mngr` role in the system.
> Being in HRIS as an HR employee does NOT automatically grant access — they must be registered here.

### Managing Violation Codes (`/ir/maintenance/codes`)

HR maintains the master list of violation codes used when creating IRs.

| Action | How |
|---|---|
| **Add code** | Fill code number, violation description, category, root cause, and offense progressions → Submit |
| **Edit code** | Open edit form → Update fields → Save |
| **Toggle active/inactive** | Toggle switch — inactive codes will not appear in the IR creation form |

> Code numbers must be unique (e.g., `A-01`, `B-05`).
> Offense progression fields define what DA type is expected per offense count.

---

## 10. Dashboard & Analytics

The dashboard (`/`) is accessible to HR and HR Manager roles. It shows:

| Widget | Data |
|---|---|
| **Status Counts** | Total IRs by status: Pending, In Progress, Approved, Invalid, Cancelled |
| **Monthly Trend** | Line chart of IR creation count per month (last 12 months) |
| **Top 10 Violations** | Bar chart of most frequent violation codes |
| **DA Type Distribution** | Breakdown of DA types issued (Verbal, Written, Suspension, Dismissal) |
| **Violation Type Split** | Administrative vs Quality violations |
| **Acknowledged DAs** | Count of fully acknowledged DAs |

Data is computed in `DashboardController::stats()` and passed to `Dashboard.jsx` as props.

---

## 11. Handover Checklist

Use this checklist when handing over the IRDA system to a new team or developer.

### Environment Setup
- [ ] `.env` configured with correct DB credentials for all three MySQL connections (`mysql`, `masterlist`, `authify`)
- [ ] HRIS API URL and key set in `.env`
- [ ] Authify SSO URL set in `.env`
- [ ] `APP_NAME` matches the URL prefix used in deployment
- [ ] `npm install` and `npm run build` (or `npm run dev` for local)
- [ ] `composer install` and `php artisan migrate`
- [ ] `php artisan serve` or configured with nginx/apache

### Access Verification
- [ ] Authify SSO is reachable and tokens are being validated
- [ ] HRIS API is reachable and returning employee data
- [ ] At least one `ir_admins` record exists with `role = 'hr'` for initial admin access
- [ ] At least one system `admin` record exists

### Data Verification
- [ ] `ir_code_no` table has violation codes loaded
- [ ] `system_status` table has one row with `status = 'online'`

### Key People to Know
- **IR Admin (HR)** — Registered in `ir_admins` with `role = 'hr'`. Manages IR lifecycle.
- **IR Admin (HR Manager)** — Registered in `ir_admins` with `role = 'hr_mngr'`. Signs DAs.
- **System Admin** — Registered in the `admin` table. Manages system-level settings.

### Known Business Rules to Remember
- [ ] Company ID 5 uses **IR-only flow** — no DA is issued after approval
- [ ] LOE always has exactly 5 entries — previous entries are replaced on resubmit
- [ ] Role resolution is dynamic per IR — not a system-wide assignment
- [ ] HR personnel must be explicitly registered in `ir_admins` — HRIS department alone does not grant access
- [ ] IR numbers reset per year (`YY-NNNN` counter)
- [ ] Maintenance mode blocks all users — use only during planned downtime

### Code Entry Points
| Starting Point | File |
|---|---|
| All route definitions | `routes/irda.php`, `routes/general.php`, `routes/auth.php` |
| Workflow business logic | `app/Services/IrRequestService.php` |
| Role + action resolution | `IrRequestService::resolveCurrentUserRole()` and `resolveAvailableActions()` |
| Database queries | `app/Repositories/IrRequestRepository.php` |
| Status constants | `app/Constants/IrConstants.php` |
| HRIS API calls | `app/Services/HrisApiService.php` |
| SSO authentication | `app/Http/Middleware/AuthMiddleware.php` |
| Frontend entry | `resources/js/app.jsx` |
| Main IR page | `resources/js/Pages/IR/ShowIR.jsx` |
