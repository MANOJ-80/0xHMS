# API Endpoint Plan - SPCMS

## 1. Stack Context

This API plan is designed for:

- React + Vite frontend
- Tailwind CSS UI layer
- Node.js + Express backend
- MongoDB Atlas with Mongoose
- JWT authentication
- Socket.IO for real-time queue updates

Recommended API base path:

```txt
/api/v1
```

## 2. API Design Principles

- use REST for primary CRUD and workflow actions
- keep auth and role checks centralized in middleware
- use controller-service-model separation in the Express app
- use Socket.IO only for live queue events, not as the only source of truth
- return consistent JSON responses
- keep workflow actions explicit instead of overloading generic update endpoints

Suggested response shape:

```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {}
}
```

Suggested error shape:

```json
{
  "success": false,
  "message": "Slot is no longer available",
  "errors": []
}
```

## 3. Roles and Access Model

- `patient`: self-service registration, appointments, queue status, notifications
- `doctor`: queue view, status updates, consultation actions, availability changes
- `receptionist`: patient registration, appointment help, check-in, walk-ins, urgent flags, queue monitoring
- `admin`: full access to users, doctors, reports, system configs, audit logs

## 4. Auth Endpoints

### `POST /auth/register-patient`

Create patient account and linked patient profile.

Access:

- public

Body:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "securePassword",
  "dateOfBirth": "1995-06-12",
  "gender": "male"
}
```

### `POST /auth/login`

Authenticate any user role.

### `POST /auth/refresh-token`

Issue new access token.

### `POST /auth/logout`

Invalidate refresh session.

### `GET /auth/me`

Return current authenticated user profile.

Access:

- all authenticated users

## 5. User and Admin Management Endpoints

### `GET /users`

List users with filters.

Access:

- admin

Query params:

- `role`
- `isActive`
- `search`
- `page`
- `limit`

### `POST /users`

Create staff user.

Access:

- admin

### `GET /users/:id`

Get single user.

### `PATCH /users/:id`

Update role, status, or basic profile.

### `PATCH /users/:id/deactivate`

Soft deactivate user.

## 6. Patient Endpoints

### `POST /patients`

Create patient profile.

Access:

- admin, receptionist

### `GET /patients`

Search patients.

Access:

- admin, receptionist, doctor

Query params:

- `search`
- `phone`
- `email`
- `patientCode`
- `page`
- `limit`

### `GET /patients/:id`

Get patient detail.

Access:

- admin, receptionist, doctor, patient self

### `PATCH /patients/:id`

Update patient profile.

Access:

- admin, receptionist, patient self

### `GET /patients/:id/appointments`

List patient appointment history.

### `GET /patients/:id/queue-status`

Return active token, queue position, assigned doctor, and estimated wait.

## 7. Department Endpoints

### `GET /departments`

List departments.

Access:

- authenticated users

### `POST /departments`

Create department.

Access:

- admin

### `PATCH /departments/:id`

Update department.

Access:

- admin

## 8. Doctor Endpoints

### `GET /doctors`

List doctors with specialization and availability filters.

Access:

- authenticated users

Query params:

- `departmentId`
- `specialization`
- `availabilityStatus`
- `search`

### `POST /doctors`

Create doctor profile linked to user.

Access:

- admin

### `GET /doctors/:id`

Get doctor details.

### `PATCH /doctors/:id`

Update doctor profile.

Access:

- admin

### `PATCH /doctors/:id/availability`

Update doctor availability.

Access:

- doctor self, admin

Body:

```json
{
  "availabilityStatus": "available"
}
```

### `PATCH /doctors/:id/schedule`

Update schedule template.

Access:

- admin

### `GET /doctors/:id/queue`

Return doctor's active queue.

Access:

- doctor self, receptionist, admin

### `GET /doctors/:id/slots`

Return available booking slots for a date.

Query params:

- `date`

## 9. Appointment Endpoints

### `POST /appointments`

Create appointment.

Access:

- patient, receptionist, admin

Body:

```json
{
  "patientId": "optional-if-patient-self",
  "departmentId": "...",
  "bookingType": "doctor",
  "doctorId": "...",
  "specialization": "Cardiology",
  "appointmentDate": "2026-03-10",
  "slotStart": "2026-03-10T10:00:00.000Z",
  "slotEnd": "2026-03-10T10:15:00.000Z",
  "notes": "Follow-up visit"
}
```

Rules:

- validate slot availability
- prevent overlapping doctor appointments
- auto-fill patient ID from auth context for patient role

### `GET /appointments`

List appointments.

Access:

- patient self, receptionist, doctor, admin

Query params:

- `status`
- `doctorId`
- `patientId`
- `departmentId`
- `date`
- `from`
- `to`
- `page`
- `limit`

### `GET /appointments/:id`

Get single appointment.

### `PATCH /appointments/:id`

Update limited appointment fields before check-in.

Access:

- patient self, receptionist, admin

### `PATCH /appointments/:id/reschedule`

Reschedule an appointment.

### `PATCH /appointments/:id/cancel`

Cancel an appointment.

Body:

```json
{
  "reason": "Patient unavailable"
}
```

### `GET /appointments/available-slots`

Fetch available slots by doctor or specialization.

Query params:

- `departmentId`
- `doctorId`
- `specialization`
- `date`

## 10. Check-In Endpoints

### `POST /checkins`

Check in a patient and create a queue candidate.

Access:

- receptionist, admin, patient self for self-service

Body:

```json
{
  "appointmentId": "optional",
  "patientId": "required for staff check-in",
  "departmentId": "...",
  "doctorId": "optional",
  "checkinMethod": "reception",
  "isWalkIn": false,
  "urgencyLevel": "normal"
}
```

### `GET /checkins`

List recent check-ins.

Access:

- receptionist, admin

### `GET /checkins/:id`

Get check-in detail.

### `PATCH /checkins/:id/cancel`

Cancel or invalidate a check-in.

## 11. Queue Endpoints

### `POST /queue-tokens`

Create queue token after check-in.

Access:

- system service, receptionist, admin

Note:

- in production, this may be called internally by the check-in service rather than directly by UI

### `GET /queue-tokens`

List active queue tokens.

Access:

- receptionist, admin, doctor

Query params:

- `departmentId`
- `doctorId`
- `queueStatus`
- `priorityLevel`

### `GET /queue-tokens/:id`

Get token detail.

### `PATCH /queue-tokens/:id/assign`

Assign or reassign token to doctor.

Access:

- system service, receptionist, admin

Body:

```json
{
  "assignedDoctorId": "...",
  "reason": "lower wait time"
}
```

### `PATCH /queue-tokens/:id/mark-called`

Mark patient as called.

Access:

- doctor, receptionist

### `PATCH /queue-tokens/:id/mark-missed`

Mark patient as missed or no-show.

Access:

- receptionist, doctor, admin

### `PATCH /queue-tokens/:id/priority`

Update priority level.

Access:

- receptionist, doctor, admin

Body:

```json
{
  "priorityLevel": "urgent",
  "reason": "critical condition"
}
```

### `GET /queue/board`

Public or internal waiting board feed.

Access:

- configurable public display or authenticated staff

Query params:

- `departmentId`
- `doctorId`

### `GET /queue/summary`

Return queue metrics for dashboards.

Access:

- receptionist, admin

## 12. Doctor Assignment Endpoints

### `POST /assignments/auto`

Run assignment engine for a queue token.

Access:

- system service, receptionist, admin

Body:

```json
{
  "queueTokenId": "..."
}
```

### `GET /assignments`

List assignment logs.

Access:

- admin, receptionist

Query params:

- `doctorId`
- `patientId`
- `assignmentType`
- `from`
- `to`

### `GET /assignments/:id`

Get assignment record.

## 13. Consultation Endpoints

### `POST /consultations/start`

Start consultation for a queue token.

Access:

- doctor self

Body:

```json
{
  "queueTokenId": "..."
}
```

Behavior:

- create consultation record
- set queue token status to `in_consultation`
- mark doctor status `busy`

### `PATCH /consultations/:id/complete`

Complete consultation.

Access:

- doctor self

Body:

```json
{
  "consultationNotes": "Consultation completed successfully"
}
```

Behavior:

- set consultation end time
- set queue token status `completed`
- mark appointment `completed` if linked
- trigger next queue recalculation

### `PATCH /consultations/:id/transfer`

Transfer patient to another doctor.

Access:

- doctor self, admin

Body:

```json
{
  "toDoctorId": "...",
  "reason": "specialization adjustment"
}
```

### `GET /consultations`

List consultations.

Access:

- doctor self, admin, receptionist

### `GET /consultations/:id`

Get consultation detail.

## 14. Notification Endpoints

### `GET /notifications`

List notifications.

Access:

- admin, receptionist, patient self for own notifications

### `POST /notifications/send`

Send immediate notification.

Access:

- system service, admin

### `PATCH /notifications/:id/retry`

Retry failed notification.

Access:

- admin

## 15. Reporting Endpoints

### `GET /reports/dashboard`

Main admin dashboard metrics.

Access:

- admin

Suggested response fields:

- average waiting time
- average check-in time
- active queue length
- consultations completed today
- no-show rate
- doctor utilization summary

### `GET /reports/wait-times`

Wait-time report by doctor, day, or department.

### `GET /reports/doctor-utilization`

Doctor load and utilization report.

### `GET /reports/no-shows`

No-show and missed queue report.

### `GET /reports/exports/consultations`

Export consultation records.

Access:

- admin

## 16. Audit and Config Endpoints

### `GET /audit-logs`

List audit entries.

Access:

- admin

Query params:

- `actorId`
- `entityType`
- `entityId`
- `from`
- `to`

### `GET /system-configs`

List system config values.

Access:

- admin

### `PATCH /system-configs/:key`

Update a system config value.

Access:

- admin

## 17. Realtime Events Plan

Socket.IO should publish updates for the following events:

- `queue:updated`
- `queue:token-called`
- `queue:token-missed`
- `queue:priority-changed`
- `doctor:availability-updated`
- `consultation:started`
- `consultation:completed`
- `assignment:created`
- `notification:sent`

Suggested rooms:

- `department:<departmentId>`
- `doctor:<doctorId>`
- `patient:<patientId>`

## 18. Suggested Backend Module Structure

```txt
server/
  src/
    modules/
      auth/
      users/
      patients/
      departments/
      doctors/
      appointments/
      checkins/
      queue/
      assignments/
      consultations/
      notifications/
      reports/
      audit/
      configs/
```

## 19. Priority Build Order for APIs

Build in this order:

1. auth
2. patients
3. doctors
4. departments
5. appointments
6. check-ins
7. queue tokens
8. consultations
9. assignments
10. notifications
11. reports
12. audit logs and configs

This sequence matches the MVP workflow and enables early end-to-end testing.

## 20. Minimum MVP Endpoints

If you want a strict MVP cut, start with these endpoints first:

- `POST /auth/login`
- `GET /auth/me`
- `POST /patients`
- `GET /patients`
- `GET /doctors`
- `GET /doctors/:id/slots`
- `POST /appointments`
- `GET /appointments`
- `PATCH /appointments/:id/cancel`
- `POST /checkins`
- `GET /queue-tokens`
- `PATCH /queue-tokens/:id/assign`
- `GET /doctors/:id/queue`
- `POST /consultations/start`
- `PATCH /consultations/:id/complete`
- `GET /reports/dashboard`

## 21. Frontend Route Mapping Suggestion

For the Vite frontend, these UI sections map naturally to the API design:

- `/login`
- `/patient/dashboard`
- `/patient/appointments`
- `/patient/queue-status`
- `/doctor/dashboard`
- `/doctor/queue`
- `/receptionist/dashboard`
- `/admin/dashboard`
- `/admin/doctors`
- `/admin/reports`
- `/admin/settings`

## 22. Final Recommendation

For this MERN build, use:

- REST endpoints for all business actions
- Mongoose service methods for workflow validation
- MongoDB transactions for critical queue state changes
- Socket.IO for real-time UI refresh
- separate middleware for `auth`, `requireRole`, `validateRequest`, and `auditAction`

This gives you a clean backend that fits Vite + React on the frontend and MongoDB Atlas in production.
