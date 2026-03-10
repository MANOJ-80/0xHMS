# System Workflows — SPCMS

This document describes every end-to-end workflow in the Smart Patient Care Management System.
Each section covers the user journey, API endpoints involved, frontend pages, business rules, state transitions, and notifications.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Patient Registration](#2-patient-registration)
3. [Doctor & Staff Management](#3-doctor--staff-management)
4. [Appointment Booking](#4-appointment-booking)
5. [Check-in & Doctor Assignment](#5-check-in--doctor-assignment)
6. [Queue Token Lifecycle](#6-queue-token-lifecycle)
7. [Consultation](#7-consultation)
8. [Prescription](#8-prescription)
9. [Notifications](#9-notifications)
10. [Real-time Updates](#10-real-time-updates)
11. [Dashboard & Reports](#11-dashboard--reports)
12. [Doctor Availability](#12-doctor-availability)
13. [Appendix: State Machines](#appendix-state-machines)

---

## 1. Authentication

### 1.1 Login

**Endpoint:** `POST /api/v1/auth/login`

**Frontend page:** `LoginPage.jsx`

**Flow:**

1. User enters email and password on the login form.
2. Frontend sends `POST /auth/login` with `{ email, password }`.
3. Backend looks up the user by `email` (case-insensitive). Verifies `isActive` flag and bcrypt password hash.
4. On success, backend updates `lastLoginAt` and returns:
   ```json
   {
     "user": { "_id", "fullName", "email", "role", "linkedPatientId", "linkedDoctorId" },
     "tokens": { "accessToken": "<jwt>", "refreshToken": "<jwt>" }
   }
   ```
5. JWT payload contains `{ sub, role, linkedPatientId, linkedDoctorId }`.
6. Frontend stores `accessToken` in `localStorage`. The `apiFetch()` wrapper auto-attaches `Authorization: Bearer <token>` to every request and redirects to `/login` on 401.

**Role-based redirects after login:**

| Role | Redirect target |
|---|---|
| `patient` | `/patient-dashboard` |
| `doctor` | `/doctor-dashboard` |
| `admin` | `/` (main dashboard) |
| `receptionist` | `/` (main dashboard) |

**Error cases:**
- Missing email or password → 400
- User not found or inactive → 401 "Invalid credentials"
- Wrong password → 401 "Invalid credentials"

### 1.2 Current User

**Endpoint:** `GET /api/v1/auth/me`

Used by `AuthProvider.jsx` on page load to validate the stored token and hydrate the user context. Returns the current user object (minus password hash).

---

## 2. Patient Registration

There are two registration paths in the system.

### 2.1 Self-Registration (Patient Portal)

**Endpoint:** `POST /api/v1/auth/register-patient`

**Frontend page:** `LoginPage.jsx` (registration tab/link)

**Flow:**

1. Patient fills out the registration form: full name, email, password, date of birth, and optionally phone and gender.
2. Frontend sends `POST /auth/register-patient`.
3. Backend validates required fields (`fullName`, `email`, `password`, `dateOfBirth`).
4. Checks email uniqueness — 409 if email already exists.
5. Creates two records:
   - **Patient** record with a generated `patientCode` (format: `PAT-{timestamp}`).
   - **User** record with `role: 'patient'`, `linkedPatientId` pointing to the new Patient, and bcrypt-hashed password (10 rounds).
6. Returns `{ user, patient, tokens: { accessToken, refreshToken } }` — the patient is immediately logged in.

**Business rules:**
- Email must be unique across all users.
- This is the only public (unauthenticated) registration endpoint.

### 2.2 Staff-Created Patient (Reception Desk)

**Endpoint:** `POST /api/v1/patients`

**Frontend page:** `PatientsPage.jsx`

**Access:** `admin`, `receptionist`

**Flow:**

1. Receptionist creates a patient record via the Patients management page.
2. Sends `POST /patients` with patient demographic data.
3. Backend creates a **Patient** record only — no User account is created.
4. This patient can be used for appointments and check-ins but cannot log into the portal.

**Use case:** Walk-in patients who do not need portal access, or when the receptionist registers on behalf of the patient.

---

## 3. Doctor & Staff Management

### 3.1 Create Doctor

**Endpoint:** `POST /api/v1/doctors`

**Frontend page:** `DoctorsPage.jsx`

**Access:** `admin`

**Required fields:** `userId`, `doctorCode`, `fullName`, `specialization`, `departmentId`.

**Optional fields (with defaults):**
- `consultationRoom` (default `''`)
- `maxQueueThreshold` (default `10`)
- `averageConsultationMinutes` (default `15`)
- `allowAutoAssignment` (default `true`)
- `scheduleTemplate` (default `[]`)

### 3.2 Update Doctor Profile

**Endpoint:** `PATCH /api/v1/doctors/:id`

**Access:** `admin`, or the doctor themselves (self-only enforcement).

**Business rule:** If the requester is a doctor, they can only update their own profile (`req.params.id` must match their Doctor record). Otherwise → 403.

**Updatable fields:** `fullName`, `specialization`, `departmentId`, `consultationRoom`, `maxQueueThreshold`, `averageConsultationMinutes`, `allowAutoAssignment`, `scheduleTemplate`, `isActive`.

### 3.3 Schedule Template

Each doctor has a `scheduleTemplate` array defining their weekly availability:

```json
{
  "dayOfWeek": "Monday",
  "startTime": "09:00",
  "endTime": "16:00",
  "breakStart": "12:30",
  "breakEnd": "13:00",
  "slotMinutes": 15,
  "isActive": true
}
```

Slots are generated dynamically from this template via `GET /doctors/:id/slots?date=YYYY-MM-DD`.

---

## 4. Appointment Booking

### 4.1 Create Appointment

**Endpoint:** `POST /api/v1/appointments`

**Frontend page:** `AppointmentsPage.jsx`

**Access:** `patient`, `receptionist`, `admin`

**Flow:**

1. User selects a department, specialization, and date.
2. Frontend fetches available slots via `GET /doctors/:id/slots?date=YYYY-MM-DD`.
3. User selects a slot and optionally a preferred doctor.
4. Frontend sends `POST /appointments` with:
   ```json
   {
     "patientId": "...",
     "departmentId": "...",
     "specialization": "...",
     "appointmentDate": "2026-03-10",
     "slotStart": "2026-03-10T09:00:00.000Z",
     "slotEnd": "2026-03-10T09:15:00.000Z",
     "doctorId": "..." // optional — "Preferred Doctor"
   }
   ```
5. Backend generates `appointmentNumber` (format: `APT-*`).

**Optional fields (with defaults):**
- `bookingType` — `'doctor'` if doctorId provided, else `'specialization'`
- `visitType` — `'scheduled'`
- `status` — `'scheduled'`
- `bookingSource` — `'patient_portal'`
- `preferredDoctorId` — `null`
- `notes` — `''`

**Business rules:**

- **Double-booking prevention:** When `doctorId`, `slotStart`, and `slotEnd` are all provided, the system checks for overlapping appointments (same doctor, status `scheduled` or `checked_in`, overlapping time range). If overlap exists → 409 "This doctor already has an appointment in the selected slot."
- The `doctorId` at booking time is a **preference**, not a guaranteed assignment. The actual doctor assignment happens at check-in.

**Frontend messaging:** The doctor field is labeled "Preferred Doctor" and includes messaging: "Assigned at check-in" to set correct expectations.

**Notification triggered:** `appointment_confirmation` → patient is notified of the confirmed appointment.

**State:** Appointment starts in `scheduled` status.

### 4.2 Available Slots

**Endpoint:** `GET /api/v1/doctors/:id/slots?date=YYYY-MM-DD`

**Access:** Authenticated users

**Logic:**

1. Load the doctor's `scheduleTemplate` for the target day of week.
2. If no active schedule exists for that day → return empty `slots: []`.
3. Load existing booked appointments for the doctor on that date (status `scheduled` or `checked_in`).
4. Generate time slots from `startTime` to `endTime` in `slotMinutes` increments.
5. Filter out slots that:
   - Overlap with already-booked appointments.
   - Fall during the break period (`breakStart` to `breakEnd`).
   - Would extend past `endTime`.
6. Return `[{ slotStart, slotEnd }, ...]`.

### 4.3 Cancel Appointment

**Endpoint:** `PATCH /api/v1/appointments/:id/cancel`

**Access:** `patient` (own), `receptionist`, `admin`

**Business rules:**
- Cannot cancel an already-cancelled appointment → 400.
- Cannot cancel a completed appointment → 400.

**State transition:** `scheduled` or `checked_in` → `cancelled`.

**Fields updated:** `status`, `cancellationReason` (from `req.body.reason` or defaults to `'Cancelled by user'`).

**Notification triggered:** `cancellation` → patient is notified of the cancellation.

---

## 5. Check-in & Doctor Assignment

This is the critical workflow that replaced the old auto-assign/queue-board model. The receptionist **must** explicitly assign a patient to a specific doctor at check-in time.

### 5.1 Create Check-in

**Endpoint:** `POST /api/v1/checkins`

**Frontend page:** `CheckinPage.jsx`

**Access:** `receptionist`, `admin`

**Flow:**

1. Receptionist opens the Check-in page, which displays a **Doctor Availability Panel** showing each doctor's current status (`available`, `busy`, `on_break`, `offline`, `overrun`) and queue length.
2. Receptionist selects the patient (search by name/code) and the appointment (if scheduled).
3. Receptionist **must** select a doctor from the availability panel. This is mandatory — the form cannot be submitted without a doctor.
4. Optionally sets urgency level (`normal` or `urgent`) and check-in method.
5. Frontend sends `POST /checkins`:

```json
{
  "patientId": "...",
  "departmentId": "...",
  "doctorId": "...",        // MANDATORY
  "appointmentId": "...",   // optional
  "isWalkIn": false,
  "urgencyLevel": "normal",
  "checkinMethod": "reception",
  "notes": ""
}
```

**Backend processing:**

1. Validate `patientId` and `departmentId` are present → 400 if missing.
2. Resolve `doctorId`: from body, or from linked appointment's `doctorId`. If still null → 400 "receptionist must assign a specific doctor."
3. Validate patient exists → 404 if not.
4. Call `assignSpecificDoctor(resolvedDoctorId)` which verifies the doctor is active and available → 400 if not.
5. Create **Checkin** record:
   - `checkinNumber` (format: `CHK-*`)
   - `status` → set to `'queued'`
   - `handledBy` → from `req.user.sub`
6. Create **QueueToken** record:
   - `tokenNumber` format: `U-XXX-001` (urgent) or `A-XXX-001` (normal), where `XXX` = last 3 chars of departmentId uppercased
   - `queueStatus: 'assigned'` — immediately assigned, not waiting
   - `assignedDoctorId` → the selected doctor
   - `queueType` → `'walk_in'` or `'scheduled'`
   - `priorityLevel` → matches urgency level
7. If appointment is linked → update appointment status to `'checked_in'`.
8. Log the assignment via `logAssignment()` with `assignmentType: 'initial'`, `decisionReason: 'receptionist direct assignment'`.
9. Recalculate the doctor's queue ordering via `recalculateDoctorQueue()`.
10. Create audit log entry.
11. Emit real-time `queue:updated` event via Socket.IO.

**Notification triggered:** `doctor_assignment` → patient is notified which doctor they've been assigned to and which consultation room to proceed to.

### 5.2 Doctor Assignment Lock

Once a patient is checked in and assigned to a doctor, that assignment is **locked**:

- **Only the assigned doctor** can start a consultation for that patient (enforced in `consultationController.startConsultation`).
- **Only the assigned doctor** can complete the consultation (enforced in `consultationController.completeConsultation`).
- **Only the assigned doctor** sees the patient in their queue (enforced in `doctorController.getDoctorQueue`).
- Other doctors receive a **403** if they attempt to access another doctor's assigned patient.

### 5.3 Reassignment

**Endpoint:** `PATCH /api/v1/queue/tokens/:id/assign`

**Access:** `receptionist`, `admin`

**Use case:** When the originally assigned doctor becomes unavailable (emergency, extended break, etc.), the receptionist can reassign the patient's queue token to a different doctor.

**Required body:** `{ "assignedDoctorId": "...", "reason": "..." }`

**Processing:**
1. Validates the new doctor exists → 400 if missing.
2. Delegates to `assignQueueTokenToDoctor()` which updates the token's `assignedDoctorId`.
3. Recalculates both the old and new doctor's queues.
4. Emits real-time update.
5. Triggers `doctor_assignment` notification with the new doctor information.

---

## 6. Queue Token Lifecycle

Queue tokens track a patient's progress from check-in to consultation completion.

### 6.1 State Machine

```
assigned → called → in_consultation → completed
                                    ↘ missed
   (any active state) ────────────→ missed
```

| Status | Meaning | Set by |
|---|---|---|
| `assigned` | Patient checked in, assigned to doctor | Check-in flow |
| `called` | Doctor has called the patient | `PATCH /queue/tokens/:id/called` |
| `in_consultation` | Consultation in progress | `POST /consultations/start` |
| `completed` | Consultation finished | `PATCH /consultations/:id/complete` |
| `missed` | Patient didn't show up when called | `PATCH /queue/tokens/:id/missed` |

### 6.2 Token Operations

#### Call Patient
**Endpoint:** `PATCH /api/v1/queue/tokens/:id/called`

Sets `queueStatus: 'called'` and `actualCalledAt`. Emits real-time update.

**Notification:** `queue_next` → "You are next in queue for {doctorName}. Please proceed to Consultation Room {room}."

#### Mark Missed
**Endpoint:** `PATCH /api/v1/queue/tokens/:id/missed`

Sets `queueStatus: 'missed'` and `isActive: false`. Recalculates doctor queue. Emits real-time update.

**Notification:** `missed_appointment` → "You did not arrive within the allotted time... Your slot has been skipped. Please contact reception to reschedule."

#### Update Priority
**Endpoint:** `PATCH /api/v1/queue/tokens/:id/priority`

**Required body:** `{ "priorityLevel": "normal" | "urgent" }`

Updates priority and recalculates queue ordering. No notification triggered.

### 6.3 Queue Ordering

Tokens are always ordered by:
1. `priorityLevel: -1` — urgent patients first
2. `createdAt: 1` — FIFO within same priority

Active tokens are those with `isActive: true` and `queueStatus` in `['waiting', 'assigned', 'called', 'in_consultation']`.

---

## 7. Consultation

### 7.1 Start Consultation

**Endpoint:** `POST /api/v1/consultations/start`

**Frontend page:** `DoctorDashboardPage.jsx` — doctor clicks "Start Consultation" on a patient in their queue.

**Required body:** `{ "queueTokenId": "..." }`

**Flow:**

1. Look up the queue token → 404 if not found.
2. Validate status is not `completed` or `missed` → 400.
3. Validate status is not already `in_consultation` → 400.
4. Validate token has `assignedDoctorId` → 400 if null.
5. **Doctor-patient lock:** If requester is a doctor, verify they match `assignedDoctorId` → 403 "This patient is assigned to a different doctor."
6. Create **Consultation** record:
   - `consultationNumber` (format: `CON-*`)
   - Carries over `patientId`, `doctorId`, `appointmentId`, `queueTokenId`, `departmentId` from the token.
7. Update queue token: `queueStatus: 'in_consultation'`, `actualConsultationStartAt: now`.
8. Update doctor: `availabilityStatus: 'busy'`.
9. Create audit log and emit real-time update.

**Notifications:** None.

### 7.2 Complete Consultation

**Endpoint:** `PATCH /api/v1/consultations/:id`

**Frontend page:** `DoctorDashboardPage.jsx` — doctor clicks "Complete" after finishing.

**Optional body:** `{ "consultationNotes": "..." }`

**Flow:**

1. Look up the consultation → 404 if not found.
2. **Doctor-patient lock:** If requester is a doctor, verify they match `consultation.doctorId` → 403.
3. Update consultation: `status: 'completed'`, `completedAt: now`, save `consultationNotes`.
4. Update queue token: `queueStatus: 'completed'`, `actualConsultationEndAt: now`, `isActive: false`.
5. Update doctor: `availabilityStatus: 'available'`.
6. If appointment is linked → update appointment status to `'completed'`.
7. Recalculate doctor queue, create audit log, emit real-time update.
8. Check if a prescription already exists for this consultation. Return `prescriptionPending` flag.

**Notifications:** None.

**Response includes:**
```json
{
  "consultation": { ... },
  "prescription": null,
  "prescriptionPending": true
}
```

This tells the frontend to prompt the doctor to write a prescription.

### 7.3 List Consultations

**Endpoint:** `GET /api/v1/consultations`

**Access scoping:**
- **Doctors** see only their own consultations (`doctorId` filter).
- **Patients** see only their own consultations (`patientId` filter via `linkedPatientId`).
- **Admin/Receptionist** see all consultations.

---

## 8. Prescription

### 8.1 Create Prescription

**Endpoint:** `POST /api/v1/prescriptions`

**Frontend page:** `DoctorDashboardPage.jsx` — manual prescription form shown after consultation completion.

**Access:** `doctor`, `admin`

**Note:** Receptionists do **NOT** have access to prescriptions (removed from routes and sidebar).

**Required body:**

```json
{
  "consultationId": "...",
  "diagnosis": "Upper respiratory tract infection",
  "medicines": [
    {
      "medicineName": "Amoxicillin 500mg",
      "dosage": "1 tablet",
      "frequency": "3 times daily",
      "duration": "7 days"
    }
  ]
}
```

**Optional fields:**
- `treatmentNotes` (default `''`)
- `followUpDate` (default `null`)
- `followUpInstructions` (default `''`)
- `doctorSignature` (default `''`)
- `hospitalName` (default `'SPCMS Hospital'`)

**Flow:**

1. Validate required fields: `consultationId`, `diagnosis`, `medicines` (non-empty array) → 400 if missing.
2. Validate each medicine has `medicineName`, `dosage`, `frequency`, `duration` → 400 if any sub-field missing.
3. Look up the consultation → 404 if not found.
4. **Duplicate check:** `Prescription.findOne({ consultationId })` → 409 "A prescription already exists for this consultation."
5. Create prescription record via `prescriptionService.createPrescriptionRecord()`, deriving `patientId`, `doctorId`, `appointmentId`, `departmentId` from the consultation.
6. Create audit log.

**Notification triggered:** `prescription_ready` → "Your prescription from {doctorName} is now available. You can view it in the patient portal."

**Medicine format:** All medicines are entered manually (free-text fields), not selected from a drug database. This is by design for the MVP.

### 8.2 Update Prescription

**Endpoint:** `PATCH /api/v1/prescriptions/:id`

**Access:** `doctor` (own prescriptions only), `admin`

**Ownership enforcement:** If the requester is a doctor, they must be the creating doctor → 403 otherwise.

**Updatable fields:** `diagnosis`, `medicines`, `treatmentNotes`, `followUpDate`, `followUpInstructions`, `doctorSignature`.

Medicine validation is re-applied on update.

### 8.3 View Prescriptions

**Endpoint:** `GET /api/v1/prescriptions` — list with role-based scoping.

**Endpoint:** `GET /api/v1/patients/:id/prescriptions` — all prescriptions for a specific patient.

**Frontend pages:**
- `PrescriptionsPage.jsx` — list and detail view. Patients can **download prescriptions as text**.
- `PatientDashboardPage.jsx` — prescription detail view within the active visit section.
- `DoctorDashboardPage.jsx` — prescription form and history.

### 8.4 One Prescription Per Consultation

A strict 1:1 relationship is enforced between consultations and prescriptions. Attempting to create a second prescription for the same consultation returns 409.

---

## 9. Notifications

### 9.1 Notification Types

| Type | Trigger | Subject | Message Template |
|---|---|---|---|
| `appointment_confirmation` | Appointment created | "Appointment Confirmed" | "Your appointment with {doctorName} is confirmed for {date} at {time}. Please arrive 10 minutes early." |
| `appointment_reminder` | Scheduled (cron/manual) | "Appointment Reminder" | "Reminder: your appointment with {doctorName} is scheduled today at {time}." |
| `doctor_assignment` | Check-in or reassignment | "Doctor Assigned" | "Hello {patientName}, You have been assigned to {doctorName}. Consultation Room: {room \|\| 'To be announced'}." |
| `queue_next` | Token marked as called | "Your Turn is Next" | "You are next in queue for {doctorName}. Please proceed to Consultation Room {room}." |
| `missed_appointment` | Token marked as missed | "Missed Appointment" | "You did not arrive within the allotted time... Your slot has been skipped. Please contact reception to reschedule." |
| `prescription_ready` | Prescription created | "Prescription Available" | "Your prescription from {doctorName} is now available. You can view it in the patient portal." |
| `cancellation` | Appointment cancelled | "Appointment Cancelled" | "Your appointment with {doctorName} on {date} has been cancelled." |
| `general` | Manual/system | (varies) | (varies) |

### 9.2 Channels

| Channel | Implementation |
|---|---|
| `system` | In-app only — stored in database, displayed in Notifications page |
| `sms` | Twilio/MSG91/SNS stub — **currently logs to console only** |
| `whatsapp` | Twilio WhatsApp stub — **currently logs to console only** |

**Channel resolution:** Uses `resolveChannel(patient)` which returns the default notification channel from environment config if the patient has a phone number, otherwise falls back to `'system'`.

### 9.3 Notification Lifecycle

1. `sendNotification()` creates a `Notification` record with status `'pending'`.
2. If not scheduled for a future time, immediately dispatches via the resolved channel.
3. Status updated to `'sent'` on success or `'failed'` on error.
4. Failed notifications can be retried via `retryNotification(notificationId)` — respects `maxRetries`, increments `retryCount`.

### 9.4 Frontend

**Page:** `NotificationsPage.jsx`

**Features:**
- Filter notifications by type.
- Detail panel for each notification.
- Admin can retry failed notifications.

---

## 10. Real-time Updates

### 10.1 Socket.IO Architecture

**Server:** `socketService.js` — `emitQueueUpdate()` broadcasts to Socket.IO rooms.

**Client:** `socket.js` — connection manager. `useQueuePolling.js` — polling fallback.

### 10.2 Events

| Event | Payload | Rooms |
|---|---|---|
| `queue:updated` | `{ departmentId, doctorId, patientId }` | `department:{id}`, `doctor:{id}`, `patient:{id}` |

### 10.3 Triggers

The `queue:updated` event is emitted on:

- Check-in creation
- Queue token reassignment
- Token called
- Token missed
- Consultation started
- Consultation completed
- Priority updated

### 10.4 Fallback

The frontend uses `useQueuePolling.js` as a polling fallback when WebSocket connections are unreliable. This periodically fetches queue state via REST endpoints.

---

## 11. Dashboard & Reports

### 11.1 Admin/Receptionist Dashboard

**Endpoint:** `GET /api/v1/reports/dashboard`

**Frontend page:** `DashboardPage.jsx`

**KPI cards displayed:**

| KPI | Calculation |
|---|---|
| **Checked In Today** | Count of Checkin records created today |
| **Consultations Done** | Count of Consultations with status `completed` and `completedAt` today |
| **Doctors Active** | Count of Doctors where `isActive: true` and status in `['available', 'busy', 'overrun']` |
| **Urgent Cases** | Count of active queue tokens with `priorityLevel: 'urgent'` |

**Additional data:**
- `activeQueueLength` — total active tokens across all queues.
- `averageWaitMinutes` — estimated: `max(8, round((activeQueueLength × 12) / max(doctorsActive, 1)))`, or `0` if no active tokens.
- `doctorsByAvailability` — aggregation of doctor counts grouped by availability status.

### 11.2 Doctor Dashboard

**Frontend page:** `DoctorDashboardPage.jsx`

**Displays:**
- "My Patients" — only patients assigned to this doctor (via `GET /doctors/:id/queue`).
- Queue actions: Call, Start Consultation, Complete, Mark Missed.
- Manual prescription form (inline, after consultation completion).
- Consultation history.

### 11.3 Patient Dashboard

**Frontend page:** `PatientDashboardPage.jsx`

**Displays:**
- Active visit section showing current queue status and assigned doctor.
- Upcoming appointments.
- Prescription detail view with download capability.
- Notification feed.

---

## 12. Doctor Availability

### 12.1 Statuses

| Status | Meaning |
|---|---|
| `available` | Ready to see patients |
| `busy` | Currently in consultation (auto-set) |
| `on_break` | Temporarily away |
| `offline` | Not working |
| `overrun` | Running behind schedule |

### 12.2 Automatic Transitions

| Trigger | Status change |
|---|---|
| Consultation started (`POST /consultations/start`) | → `busy` |
| Consultation completed (`PATCH /consultations/:id`) | → `available` |

### 12.3 Manual Transitions

**Endpoint:** `PATCH /api/v1/doctors/:id/availability`

**Body:** `{ "availabilityStatus": "on_break" | "offline" | "overrun" | "available" }`

Can be changed manually by the doctor or admin via the API.

### 12.4 Visibility

The **Check-in page** shows a Doctor Availability Panel so receptionists can see each doctor's real-time status and current queue length before making assignment decisions.

---

## Appendix: State Machines

### A.1 Appointment Status

```
scheduled → checked_in → completed
    ↓
cancelled
```

| Transition | Trigger |
|---|---|
| `scheduled` → `checked_in` | Check-in created with linked appointment |
| `checked_in` → `completed` | Consultation completed |
| `scheduled` → `cancelled` | Appointment cancelled |

### A.2 Queue Token Status

```
assigned → called → in_consultation → completed
                                    ↘ missed
   (any active) ──────────────────→ missed
```

| Transition | Trigger |
|---|---|
| `assigned` → `called` | `PATCH /queue/tokens/:id/called` |
| `called` → `in_consultation` | `POST /consultations/start` |
| `in_consultation` → `completed` | `PATCH /consultations/:id` (complete) |
| Any active → `missed` | `PATCH /queue/tokens/:id/missed` |

### A.3 Consultation Status

```
active → completed
```

| Transition | Trigger |
|---|---|
| `active` → `completed` | `PATCH /consultations/:id` with completion |

### A.4 Doctor Availability

```
available ⇄ busy      (auto: consultation start/complete)
available → on_break   (manual)
available → offline    (manual)
available → overrun    (manual)
on_break → available   (manual)
offline → available    (manual)
overrun → available    (manual)
```

### A.5 Checkin Status

```
(created) → queued
```

The check-in record is set to `'queued'` immediately after creation. Further lifecycle tracking is handled by the linked queue token.

---

## End-to-End Happy Path

For reference, here is the complete happy path for a scheduled appointment:

1. **Patient registers** → `POST /auth/register-patient` → gets account + tokens.
2. **Patient books appointment** → `POST /appointments` → status: `scheduled`. Notification: `appointment_confirmation`.
3. **Patient arrives at hospital.** Receptionist opens Check-in page.
4. **Receptionist checks in patient** → `POST /checkins` → selects available doctor. Creates Checkin (`queued`) + QueueToken (`assigned`). Appointment → `checked_in`. Notification: `doctor_assignment`.
5. **Doctor sees patient in "My Patients"** list. Clicks "Call". → `PATCH /queue/tokens/:id/called` → token: `called`. Notification: `queue_next`.
6. **Doctor starts consultation** → `POST /consultations/start` → token: `in_consultation`. Doctor → `busy`.
7. **Doctor completes consultation** → `PATCH /consultations/:id` → token: `completed`. Doctor → `available`. Appointment → `completed`. `prescriptionPending: true`.
8. **Doctor writes prescription** → `POST /prescriptions` → manual medicine entry. Notification: `prescription_ready`.
9. **Patient views prescription** in patient portal. Can download as text.

For a **walk-in patient** without a prior appointment, the flow starts at step 3 (receptionist creates the patient if needed, then checks in directly with `isWalkIn: true`).

For a **reassignment** scenario, the receptionist uses `PATCH /queue/tokens/:id/assign` to move the patient to a different doctor at any point before consultation completion.
