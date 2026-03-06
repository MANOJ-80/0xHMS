# Database Schema - SPCMS

## 1. Stack Context

This schema is designed for the following stack:

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MongoDB Atlas
- ODM: Mongoose
- Auth: JWT with refresh token support
- Realtime: Socket.IO for queue updates

The schema is optimized for the MVP defined in `PRD.md`, with emphasis on:

- patient registration and profile management
- appointment scheduling
- doctor schedules and availability
- real-time queue management
- patient-to-doctor assignment
- consultation lifecycle tracking
- notifications, reporting, and audit logging

## 2. Modeling Approach

MongoDB is flexible, but this system needs reliable operational records. For that reason:

- core workflow entities should be stored in separate collections
- historical and audit data should remain immutable where possible
- computed live queue views can be derived from queue and consultation collections
- small repeated structures such as contact info, schedules, and policy settings can be embedded
- high-volume operational objects such as appointments, queue tokens, and consultations should remain normalized

## 3. Collections Overview

The MVP should use these main collections:

1. `users`
2. `patients`
3. `doctors`
4. `departments`
5. `appointments`
6. `checkins`
7. `queueTokens`
8. `consultations`
9. `notifications`
10. `auditLogs`
11. `systemConfigs`
12. `doctorAssignments`

## 4. Collection Designs

### 4.1 `users`

Used for authentication and role-based access control.

```js
{
  _id: ObjectId,
  fullName: String,
  email: String,
  phone: String,
  passwordHash: String,
  role: 'admin' | 'doctor' | 'receptionist' | 'patient',
  linkedPatientId: ObjectId | null,
  linkedDoctorId: ObjectId | null,
  isActive: Boolean,
  lastLoginAt: Date | null,
  refreshTokenVersion: Number,
  createdAt: Date,
  updatedAt: Date
}
```

Notes:

- `patient` users can map to `patients`
- `doctor` users can map to `doctors`
- staff accounts should be managed only by admins
- store passwords as hashes only

Indexes:

- unique: `email`
- unique sparse: `phone`
- index: `role`
- index: `linkedPatientId`
- index: `linkedDoctorId`

### 4.2 `patients`

Stores patient identity, contact, and operational profile.

```js
{
  _id: ObjectId,
  patientCode: String,
  mrn: String,
  fullName: String,
  dateOfBirth: Date,
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say',
  phone: String,
  email: String,
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  isActive: Boolean,
  notes: String,
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

Notes:

- `patientCode` can be a human-readable hospital patient ID
- `mrn` can be optional if the hospital already has a medical record numbering convention

Indexes:

- unique: `patientCode`
- unique sparse: `mrn`
- index: `fullName`
- index: `phone`
- index: `email`

### 4.3 `departments`

Useful even in a single-department MVP because it supports future scaling cleanly.

```js
{
  _id: ObjectId,
  name: String,
  code: String,
  description: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique: `code`
- unique: `name`

### 4.4 `doctors`

Stores operational doctor profile and availability metadata.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  doctorCode: String,
  fullName: String,
  specialization: String,
  departmentId: ObjectId,
  consultationRoom: String,
  consultationFee: Number | null,
  availabilityStatus: 'available' | 'busy' | 'on_break' | 'offline' | 'overrun',
  maxQueueThreshold: Number,
  averageConsultationMinutes: Number,
  allowAutoAssignment: Boolean,
  scheduleTemplate: [
    {
      dayOfWeek: Number,
      startTime: String,
      endTime: String,
      breakStart: String | null,
      breakEnd: String | null,
      slotMinutes: Number,
      isActive: Boolean
    }
  ],
  leaves: [
    {
      startDate: Date,
      endDate: Date,
      reason: String,
      status: 'approved' | 'blocked'
    }
  ],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Notes:

- `scheduleTemplate` is embedded because it is tightly coupled to a single doctor and updated as a unit
- future versions can split recurring schedules and leave records into separate collections if needed

Indexes:

- unique: `doctorCode`
- unique: `userId`
- index: `specialization`
- index: `departmentId`
- index: `availabilityStatus`
- index: `{ departmentId: 1, specialization: 1 }`

### 4.5 `appointments`

Central record for booked visits.

```js
{
  _id: ObjectId,
  appointmentNumber: String,
  patientId: ObjectId,
  doctorId: ObjectId | null,
  departmentId: ObjectId,
  specialization: String,
  bookingType: 'doctor' | 'specialization',
  visitType: 'scheduled' | 'walk_in',
  appointmentDate: Date,
  slotStart: Date,
  slotEnd: Date,
  status: 'scheduled' | 'checked_in' | 'cancelled' | 'rescheduled' | 'no_show' | 'completed',
  bookingSource: 'patient_portal' | 'receptionist' | 'admin',
  preferredDoctorId: ObjectId | null,
  reassignedDoctorId: ObjectId | null,
  cancellationReason: String | null,
  rescheduledFromAppointmentId: ObjectId | null,
  notes: String,
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

Notes:

- `visitType` distinguishes booked visits from same-day walk-ins that still create an appointment-like record
- keeping walk-ins here simplifies reporting and patient history

Indexes:

- unique: `appointmentNumber`
- index: `patientId`
- index: `doctorId`
- index: `departmentId`
- index: `appointmentDate`
- index: `status`
- compound: `{ doctorId: 1, slotStart: 1, slotEnd: 1 }`
- compound: `{ patientId: 1, appointmentDate: -1 }`

Validation rules:

- if `bookingType = doctor`, then `doctorId` is required
- if `visitType = scheduled`, then `slotStart` and `slotEnd` are required
- overlapping appointments for the same doctor and time window must be prevented in service logic

### 4.6 `checkins`

Captures patient arrival and check-in channel.

```js
{
  _id: ObjectId,
  checkinNumber: String,
  patientId: ObjectId,
  appointmentId: ObjectId | null,
  doctorId: ObjectId | null,
  departmentId: ObjectId,
  arrivedAt: Date,
  checkinMethod: 'reception' | 'kiosk' | 'qr' | 'self_service',
  isWalkIn: Boolean,
  urgencyLevel: 'normal' | 'urgent',
  status: 'checked_in' | 'queued' | 'cancelled' | 'expired',
  handledBy: ObjectId | null,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique: `checkinNumber`
- index: `patientId`
- index: `appointmentId`
- index: `departmentId`
- index: `arrivedAt`
- compound: `{ departmentId: 1, arrivedAt: -1 }`

### 4.7 `queueTokens`

Represents a patient in the live consultation queue.

```js
{
  _id: ObjectId,
  tokenNumber: String,
  tokenSequence: Number,
  patientId: ObjectId,
  appointmentId: ObjectId | null,
  checkinId: ObjectId,
  assignedDoctorId: ObjectId | null,
  departmentId: ObjectId,
  specialization: String,
  queueType: 'scheduled' | 'walk_in',
  priorityLevel: 'normal' | 'urgent',
  queueStatus: 'waiting' | 'assigned' | 'called' | 'in_consultation' | 'transferred' | 'completed' | 'missed',
  queuePosition: Number,
  estimatedWaitMinutes: Number,
  predictedConsultationStart: Date | null,
  actualCalledAt: Date | null,
  actualConsultationStartAt: Date | null,
  actualConsultationEndAt: Date | null,
  transferHistory: [
    {
      fromDoctorId: ObjectId,
      toDoctorId: ObjectId,
      reason: String,
      transferredBy: ObjectId,
      transferredAt: Date
    }
  ],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Notes:

- this is the main collection for real-time queue rendering
- `queuePosition` should be treated as derived and recalculated by queue services when needed

Indexes:

- unique: `tokenNumber`
- index: `patientId`
- index: `assignedDoctorId`
- index: `departmentId`
- index: `queueStatus`
- index: `createdAt`
- compound: `{ assignedDoctorId: 1, queueStatus: 1, createdAt: 1 }`
- compound: `{ departmentId: 1, queueStatus: 1, priorityLevel: 1, createdAt: 1 }`

### 4.8 `consultations`

Tracks actual consultation lifecycle and outcome timestamps.

```js
{
  _id: ObjectId,
  consultationNumber: String,
  patientId: ObjectId,
  doctorId: ObjectId,
  appointmentId: ObjectId | null,
  queueTokenId: ObjectId,
  departmentId: ObjectId,
  status: 'in_consultation' | 'completed' | 'cancelled' | 'transferred',
  startedAt: Date,
  completedAt: Date | null,
  cancelledAt: Date | null,
  transferReason: String | null,
  consultationNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique: `consultationNumber`
- index: `patientId`
- index: `doctorId`
- index: `queueTokenId`
- index: `departmentId`
- index: `status`
- compound: `{ doctorId: 1, startedAt: -1 }`

### 4.9 `doctorAssignments`

Stores assignment decisions for traceability and analytics.

```js
{
  _id: ObjectId,
  patientId: ObjectId,
  appointmentId: ObjectId | null,
  queueTokenId: ObjectId,
  departmentId: ObjectId,
  specialization: String,
  assignmentType: 'initial' | 'reassignment' | 'transfer',
  assignedDoctorId: ObjectId,
  previousDoctorId: ObjectId | null,
  decisionReason: String,
  estimatedWaitBefore: Number | null,
  estimatedWaitAfter: Number | null,
  assignedByType: 'system' | 'doctor' | 'receptionist' | 'admin',
  assignedBy: ObjectId | null,
  createdAt: Date
}
```

Indexes:

- index: `queueTokenId`
- index: `patientId`
- index: `assignedDoctorId`
- index: `assignmentType`
- compound: `{ departmentId: 1, createdAt: -1 }`

### 4.10 `notifications`

Tracks outbound messages and delivery status.

```js
{
  _id: ObjectId,
  patientId: ObjectId,
  appointmentId: ObjectId | null,
  queueTokenId: ObjectId | null,
  type: 'appointment_confirmation' | 'appointment_reminder' | 'queue_alert' | 'doctor_assignment' | 'cancellation' | 'reschedule' | 'general',
  channel: 'sms' | 'email' | 'system',
  recipient: String,
  subject: String | null,
  message: String,
  status: 'pending' | 'sent' | 'failed' | 'delivered',
  providerMessageId: String | null,
  errorMessage: String | null,
  scheduledFor: Date | null,
  sentAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- index: `patientId`
- index: `appointmentId`
- index: `queueTokenId`
- index: `status`
- compound: `{ status: 1, scheduledFor: 1 }`

### 4.11 `auditLogs`

Required for traceability, especially for queue changes and urgency overrides.

```js
{
  _id: ObjectId,
  actorId: ObjectId | null,
  actorRole: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'system',
  action: String,
  entityType: String,
  entityId: ObjectId | null,
  metadata: Object,
  ipAddress: String | null,
  userAgent: String | null,
  createdAt: Date
}
```

Indexes:

- index: `actorId`
- index: `entityType`
- index: `entityId`
- index: `createdAt`
- compound: `{ entityType: 1, entityId: 1, createdAt: -1 }`

### 4.12 `systemConfigs`

Central place for configurable queue and assignment rules.

```js
{
  _id: ObjectId,
  key: String,
  value: Mixed,
  description: String,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

Suggested keys:

- `queue.noShowGraceMinutes`
- `queue.urgentPriorityEnabled`
- `assignment.reassignThresholdMinutes`
- `assignment.maxQueueThresholdDefault`
- `notifications.appointmentReminderLeadMinutes`
- `hospital.defaultSlotMinutes`

Indexes:

- unique: `key`

## 5. Recommended Relationships

- `users.linkedPatientId -> patients._id`
- `users.linkedDoctorId -> doctors._id`
- `doctors.departmentId -> departments._id`
- `appointments.patientId -> patients._id`
- `appointments.doctorId -> doctors._id`
- `checkins.appointmentId -> appointments._id`
- `queueTokens.checkinId -> checkins._id`
- `queueTokens.assignedDoctorId -> doctors._id`
- `consultations.queueTokenId -> queueTokens._id`
- `doctorAssignments.queueTokenId -> queueTokens._id`

## 6. Derived Data and Calculation Strategy

The following values should be computed rather than treated as the only source of truth:

- `queuePosition`
- `estimatedWaitMinutes`
- `predictedConsultationStart`
- doctor workload summaries
- dashboard metrics

Recommended logic:

- compute queue ordering from active `queueTokens`
- estimate waiting time using doctor queue length + average consultation duration
- store snapshots back into `queueTokens` for fast UI reads
- recompute after each major event: check-in, assignment, transfer, consultation start, consultation completion, no-show mark

## 7. MongoDB Design Notes for MERN

### Use Mongoose Timestamps

Enable `{ timestamps: true }` for all mutable collections.

### Use Soft Delete Selectively

For MVP, prefer `isActive` over deleting:

- patients
- doctors
- users
- departments

Do not hard-delete operational records like:

- appointments
- checkins
- queueTokens
- consultations
- auditLogs

### Transaction Usage

Use MongoDB transactions for critical multi-document operations:

- patient check-in + queue token creation
- assignment + queue update + assignment log
- consultation start + queue token status update
- consultation complete + appointment completion + next queue recalculation

### Atlas Recommendations

- use one cluster per environment where possible
- enable daily backups
- use IP allowlists and least-privilege database users
- separate `dev`, `staging`, and `prod` databases

## 8. Suggested Mongoose Schema File Structure

```txt
server/
  src/
    models/
      User.js
      Patient.js
      Doctor.js
      Department.js
      Appointment.js
      Checkin.js
      QueueToken.js
      Consultation.js
      DoctorAssignment.js
      Notification.js
      AuditLog.js
      SystemConfig.js
```

## 9. Example Enum Definitions

```js
export const USER_ROLES = ['admin', 'doctor', 'receptionist', 'patient']

export const DOCTOR_AVAILABILITY = [
  'available',
  'busy',
  'on_break',
  'offline',
  'overrun',
]

export const APPOINTMENT_STATUS = [
  'scheduled',
  'checked_in',
  'cancelled',
  'rescheduled',
  'no_show',
  'completed',
]

export const QUEUE_STATUS = [
  'waiting',
  'assigned',
  'called',
  'in_consultation',
  'transferred',
  'completed',
  'missed',
]
```

## 10. Reporting-Friendly Fields

To simplify reporting in MongoDB Atlas and dashboards, keep these fields denormalized where useful:

- patient full name snapshot on queue token
- doctor full name snapshot on appointment or queue token
- specialization snapshot on appointment, queue token, and consultation
- department name snapshot for exports if needed

These snapshot fields should be optional and treated as reporting helpers, not primary relational keys.

## 11. Initial Seed Data

The MVP should seed:

- one admin user
- one outpatient department
- a few doctor profiles with different specializations
- default queue and assignment settings in `systemConfigs`
- optional receptionist test accounts

## 12. Future Schema Extensions

The schema can later be extended with:

- multi-branch hospital support
- room scheduling
- EMR integration references
- payment status references
- file attachments and prescriptions
- predictive wait-time models

## 13. Recommended Implementation Order

1. `users`
2. `patients`
3. `departments`
4. `doctors`
5. `appointments`
6. `checkins`
7. `queueTokens`
8. `consultations`
9. `doctorAssignments`
10. `notifications`
11. `auditLogs`
12. `systemConfigs`

This order supports the booking flow first, then check-in, queueing, consultation, and reporting.
