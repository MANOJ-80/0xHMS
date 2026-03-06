# Smart Patient Consultation Management System (SPCMS)

A full-stack hospital outpatient management application with real-time queue tracking, smart doctor assignment, and role-based workflows for administrators, receptionists, doctors, and patients.

**Stack:** React 18 + Vite + Tailwind CSS | Express + Mongoose + Socket.IO | MongoDB Atlas

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [NPM Scripts](#npm-scripts)
5. [Architecture Overview](#architecture-overview)
6. [Authentication & Authorization](#authentication--authorization)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Real-Time Events (Socket.IO)](#real-time-events-socketio)
10. [Frontend Pages & Routing](#frontend-pages--routing)
11. [Shared UI Components](#shared-ui-components)
12. [Design System](#design-system)
13. [Seed Data & Test Accounts](#seed-data--test-accounts)
14. [Consultation Workflow](#consultation-workflow)
15. [Smart Doctor Assignment](#smart-doctor-assignment)
16. [Error Handling](#error-handling)
17. [Known Limitations & Future Work](#known-limitations--future-work)
18. [Vercel Deployment](#vercel-deployment)
19. [Live Demo & Testing Credentials](#live-demo--testing-credentials)

---

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9 (workspace support required)
- MongoDB Atlas connection string (or a local MongoDB instance)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd HospitalManagement

# Install all dependencies (root, client, server)
npm install
```

### Configuration

Create `server/.env` (or copy from `.env.example` if available):

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Seed the Database

```bash
npm run seed --workspace server
```

This creates 1 department, 6 users (admin, receptionist, 3 doctors, 3 patients), and 3 system config entries. The seed is idempotent (safe to run repeatedly).

### Start Development

Open two terminals:

```bash
# Terminal 1 - Backend (port 5000)
npm run dev:server

# Terminal 2 - Frontend (port 5173)
npm run dev:client
```

Open http://localhost:5173 in your browser.

---

## Project Structure

```
HospitalManagement/
├── package.json                 # Root workspace config
├── PRD.md                       # Product requirements document
├── api-endpoints.md             # API endpoint specifications
├── database-schema.md           # Database schema specifications
│
├── server/
│   ├── package.json             # Server dependencies
│   ├── .env                     # Environment variables
│   └── src/
│       ├── server.js            # HTTP server + Socket.IO bootstrap
│       ├── app.js               # Express app, middleware, route mounting
│       ├── config/
│       │   ├── db.js            # Mongoose connection
│       │   └── env.js           # Environment variable validation
│       ├── middleware/
│       │   ├── auth.js          # JWT authentication + role authorization
│       │   ├── errorHandler.js  # Global error handler
│       │   ├── notFound.js      # 404 handler
│       │   └── validate.js      # Request body validation factory
│       ├── models/
│       │   ├── User.js          # User accounts (all roles)
│       │   ├── Doctor.js        # Doctor profiles + schedule templates
│       │   ├── Patient.js       # Patient records
│       │   ├── Department.js    # Hospital departments
│       │   ├── Appointment.js   # Scheduled appointments
│       │   ├── Checkin.js       # Walk-in and appointment check-ins
│       │   ├── QueueToken.js    # Queue tokens with position tracking
│       │   ├── Consultation.js  # Consultation sessions
│       │   ├── DoctorAssignment.js  # Assignment audit trail
│       │   ├── SystemConfig.js  # System configuration key-value store
│       │   ├── AuditLog.js      # System audit logs
│       │   └── Notification.js  # Notification records (unused)
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── checkinController.js
│       │   ├── consultationController.js
│       │   ├── queueController.js
│       │   ├── appointmentController.js
│       │   ├── doctorController.js
│       │   ├── patientController.js
│       │   ├── departmentController.js
│       │   ├── reportController.js
│       │   ├── configController.js
│       │   ├── auditController.js
│       │   └── healthController.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── checkinRoutes.js
│       │   ├── consultationRoutes.js
│       │   ├── queueRoutes.js
│       │   ├── appointmentRoutes.js
│       │   ├── doctorRoutes.js
│       │   ├── patientRoutes.js
│       │   ├── departmentRoutes.js
│       │   ├── reportRoutes.js
│       │   ├── configRoutes.js
│       │   ├── auditRoutes.js
│       │   └── healthRoutes.js
│       ├── services/
│       │   ├── assignmentService.js  # Smart doctor assignment logic
│       │   ├── queueService.js       # Queue recalculation
│       │   ├── socketService.js      # Shared Socket.IO emit helper
│       │   └── auditService.js       # Audit log creation
│       ├── utils/
│       │   ├── ApiError.js       # Custom error class with status codes
│       │   ├── asyncHandler.js   # Async/await wrapper for controllers
│       │   ├── response.js       # Standardized JSON response helper
│       │   ├── tokens.js         # JWT sign helpers
│       │   └── code.js           # Unique code generators
│       └── scripts/
│           └── seed.js           # Database seed script
│
└── client/
    ├── package.json              # Client dependencies
    ├── index.html                # HTML entry (Google Fonts preconnect)
    ├── vite.config.js            # Vite dev server config (port 5173)
    ├── tailwind.config.js        # Custom theme (colors, fonts, shadows)
    ├── postcss.config.js         # PostCSS with Tailwind + Autoprefixer
    └── src/
        ├── main.jsx              # React 18 entry, providers
        ├── App.jsx               # Router, layout, navigation, role guards
        ├── styles.css            # Tailwind imports + custom base styles
        ├── lib/
        │   ├── api.js            # Fetch wrapper with JWT + 401 handling
        │   └── socket.js         # Socket.IO client singleton
        ├── components/
        │   ├── AuthProvider.jsx  # Auth context (login, logout, user state)
        │   ├── SectionCard.jsx   # Glassmorphic card wrapper
        │   ├── StatusBadge.jsx   # Colour-mapped status pill
        │   ├── LoadingSpinner.jsx # Animated loading indicator
        │   └── AlertBanner.jsx   # Dismissible notification banner
        └── pages/
            ├── LoginPage.jsx          # Login form with role-based redirect
            ├── DashboardPage.jsx      # Admin overview / staff metrics
            ├── CheckinPage.jsx        # Front desk check-in workflow
            ├── AppointmentsPage.jsx   # Appointment booking & management
            ├── QueueBoardPage.jsx     # Real-time queue display board
            ├── PatientsPage.jsx       # Patient directory
            ├── DoctorsPage.jsx        # Doctor roster
            ├── DoctorDashboardPage.jsx    # Doctor consultation workflow
            └── PatientDashboardPage.jsx   # Patient self-service portal
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | Environment (`development`, `production`, `test`) |
| `CLIENT_URL` | No | `http://localhost:5173` | CORS origin for the frontend |
| `MONGODB_URI` | **Yes** | - | MongoDB connection string |
| `JWT_ACCESS_SECRET` | **Yes** | - | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | - | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |

The frontend uses one optional env var:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Backend API base URL |

---

## NPM Scripts

### Root (workspace orchestrator)

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `npm run dev --workspace server` | Start backend in watch mode |
| `npm run dev:server` | `npm run dev --workspace server` | Start backend in watch mode |
| `npm run dev:client` | `npm run dev --workspace client` | Start Vite dev server |
| `npm run build` | `npm run build --workspace client` | Build frontend for production |
| `npm run start` | `npm run start --workspace server` | Start backend (production) |

### Server

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `node --watch src/server.js` | Start with Node.js file watcher |
| `npm run start` | `node src/server.js` | Start without watcher |
| `npm run seed` | `node src/scripts/seed.js` | Seed the database |

### Client

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `vite` | Start Vite dev server (port 5173) |
| `npm run build` | `vite build` | Production build |
| `npm run preview` | `vite preview` | Preview production build |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  Vite + Tailwind CSS + React Router v6 + Socket.IO Client   │
│  Port 5173                                                   │
└─────────────────┬──────────────────────┬────────────────────┘
                  │ HTTP (REST)          │ WebSocket
                  ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server (Express)                        │
│  Port 5000                                                   │
│                                                              │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Middleware│→ │  Routes     │→ │Controllers│→ │ Services │  │
│  │ CORS     │  │ /api/v1/... │  │ Validation│  │ Assignment│  │
│  │ Helmet   │  │ 12 modules  │  │ Business  │  │ Queue    │  │
│  │ Auth/JWT │  │ 37 endpoints│  │ Logic     │  │ Socket   │  │
│  │ Morgan   │  │             │  │           │  │ Audit    │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────┘  │
│                                                              │
│  ┌──────────────────────┐  ┌────────────────────────────┐   │
│  │    Mongoose Models   │  │       Socket.IO Server      │   │
│  │    12 collections    │  │  Rooms: department, doctor,  │   │
│  │    with indexes      │  │         patient              │   │
│  └──────────┬───────────┘  └────────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB Atlas                            │
│                    12 collections                             │
└─────────────────────────────────────────────────────────────┘
```

### Middleware Stack (in order)

1. **CORS** — Allows `CLIENT_URL` origin with credentials
2. **Helmet** — Security headers
3. **Morgan** — HTTP request logging (`dev` format)
4. **express.json()** — JSON body parser
5. **express.urlencoded()** — URL-encoded body parser
6. **cookie-parser** — Cookie parsing
7. **Route handlers** — 12 route modules mounted under `/api/v1`
8. **notFound** — 404 catch-all
9. **errorHandler** — Global error normalizer

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Description of what happened",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [],
  "stack": "(only in non-production)"
}
```

---

## Authentication & Authorization

### Flow

1. Client sends `POST /api/v1/auth/login` with `{ email, password }`
2. Server verifies credentials, returns `{ user, tokens: { accessToken, refreshToken } }`
3. Client stores `accessToken` in `localStorage`
4. All subsequent requests include `Authorization: Bearer <accessToken>`
5. On 401 response, the client clears auth state and redirects to `/login`

### Middleware

- **`requireAuth`** — Verifies JWT, attaches decoded `{ id, email, role }` to `req.user`
- **`requireRole(...roles)`** — Checks `req.user.role` against allowed roles, returns 403 if denied

### Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| `admin` | System administrator | Full access to all endpoints |
| `receptionist` | Front desk staff | Check-ins, appointments, queue management, patient/doctor lists |
| `doctor` | Medical staff | Own queue, consultations, appointments, availability |
| `patient` | Registered patient | Own appointments, queue status, self-service booking |

### Security Details

- Passwords are hashed with `bcryptjs` (10 rounds)
- `passwordHash` field has `select: false` on the User model — never included in queries unless explicitly requested with `select('+passwordHash')`
- `toJSON` / `toObject` transforms strip `passwordHash` and `__v` from User documents
- JWT errors (`JsonWebTokenError`, `TokenExpiredError`) are caught by the global error handler and returned as 401

---

## Database Schema

### Collections Overview

| # | Collection | Purpose | Key Indexes |
|---|-----------|---------|-------------|
| 1 | `users` | All user accounts across roles | `email` (unique), `role+isActive`, `linkedPatientId` (sparse), `linkedDoctorId` (sparse) |
| 2 | `doctors` | Doctor profiles, schedules, room assignments | `userId` (unique), `doctorCode` (unique), `departmentId+isActive+availabilityStatus`, `specialization+isActive` |
| 3 | `patients` | Patient demographics and records | `patientCode` (unique), text index on `fullName+phone+email+patientCode` |
| 4 | `departments` | Hospital departments | `name` (unique), `code` (unique) |
| 5 | `appointments` | Scheduled appointments | `appointmentNumber` (unique), `patientId+status`, `doctorId+appointmentDate+status`, `departmentId+appointmentDate` |
| 6 | `checkins` | Check-in records (walk-in & scheduled) | `checkinNumber` (unique), `patientId+createdAt`, `departmentId+status` |
| 7 | `queuetokens` | Queue tokens with position tracking | `tokenNumber` (unique), `assignedDoctorId+queueStatus+isActive`, `departmentId+queueStatus+isActive`, `patientId+isActive` |
| 8 | `consultations` | Active/completed consultation sessions | `consultationNumber` (unique), `doctorId+status`, `patientId+createdAt`, `queueTokenId` |
| 9 | `doctorassignments` | Audit trail of doctor assignments | `queueTokenId`, `assignedDoctorId+createdAt` |
| 10 | `systemconfigs` | Key-value system configuration | `key` (unique) |
| 11 | `auditlogs` | System audit trail | default `_id` only |
| 12 | `notifications` | Notification records (currently unused) | default `_id` only |

### Entity Relationship Summary

```
User ──1:1──> Doctor (via linkedDoctorId / userId)
User ──1:1──> Patient (via linkedPatientId)
Doctor ──N:1──> Department
Appointment ──N:1──> Patient, Doctor, Department
Checkin ──N:1──> Patient, Department, Appointment (optional)
QueueToken ──N:1──> Patient, Doctor, Department, Checkin, Appointment (optional)
Consultation ──N:1──> Patient, Doctor, Department, QueueToken
DoctorAssignment ──N:1──> Patient, Doctor, Department, QueueToken
```

### Model Details

#### User

| Field | Type | Notes |
|-------|------|-------|
| `fullName` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `phone` | String | Optional |
| `passwordHash` | String | Required, `select: false` |
| `role` | String | `admin` \| `doctor` \| `receptionist` \| `patient` |
| `linkedPatientId` | ObjectId -> Patient | Null for non-patients |
| `linkedDoctorId` | ObjectId -> Doctor | Null for non-doctors |
| `isActive` | Boolean | Default `true` |
| `lastLoginAt` | Date | Updated on login |
| `refreshTokenVersion` | Number | For token invalidation |

#### Doctor

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId -> User | Required, unique |
| `doctorCode` | String | Required, unique (e.g. `DOC-RAO`) |
| `fullName` | String | Required |
| `specialization` | String | Required (e.g. `General Medicine`) |
| `departmentId` | ObjectId -> Department | Required |
| `consultationRoom` | String | Room identifier (e.g. `A-101`) |
| `availabilityStatus` | String | `available` \| `busy` \| `on_break` \| `offline` \| `overrun` |
| `maxQueueThreshold` | Number | Default 10 |
| `averageConsultationMinutes` | Number | Default 15 |
| `allowAutoAssignment` | Boolean | Default `true` |
| `scheduleTemplate` | Array | Embedded schedule sub-documents |
| `isActive` | Boolean | Default `true` |

**Schedule Template (embedded):**

| Field | Type | Notes |
|-------|------|-------|
| `dayOfWeek` | Number | 0 (Sunday) - 6 (Saturday) |
| `startTime` | String | `HH:MM` format |
| `endTime` | String | `HH:MM` format |
| `breakStart` | String | Optional |
| `breakEnd` | String | Optional |
| `slotMinutes` | Number | Default 15 |
| `isActive` | Boolean | Default `true` |

#### Patient

| Field | Type | Notes |
|-------|------|-------|
| `patientCode` | String | Required, unique (e.g. `PAT-001`) |
| `mrn` | String | Medical record number (optional) |
| `fullName` | String | Required |
| `dateOfBirth` | Date | Required |
| `gender` | String | `male` \| `female` \| `other` \| `prefer_not_to_say` |
| `phone` | String | Optional |
| `email` | String | Optional, lowercase |
| `address` | Object | `{ line1, line2, city, state, postalCode, country }` |
| `emergencyContact` | Object | `{ name, relationship, phone }` |
| `isActive` | Boolean | Default `true` |
| `notes` | String | Free-text notes |

#### Appointment

| Field | Type | Notes |
|-------|------|-------|
| `appointmentNumber` | String | Required, unique |
| `patientId` | ObjectId -> Patient | Required |
| `doctorId` | ObjectId -> Doctor | Optional (specialization-based booking) |
| `departmentId` | ObjectId -> Department | Required |
| `specialization` | String | Required |
| `bookingType` | String | `doctor` \| `specialization` |
| `visitType` | String | `scheduled` \| `walk_in` |
| `appointmentDate` | Date | Required |
| `slotStart` / `slotEnd` | Date | Time slot boundaries |
| `status` | String | `scheduled` \| `checked_in` \| `cancelled` \| `rescheduled` \| `no_show` \| `completed` |
| `bookingSource` | String | `patient_portal` \| `receptionist` \| `admin` |
| `preferredDoctorId` | ObjectId -> Doctor | Optional |
| `cancellationReason` | String | Set on cancel |

#### Checkin

| Field | Type | Notes |
|-------|------|-------|
| `checkinNumber` | String | Required, unique |
| `patientId` | ObjectId -> Patient | Required |
| `appointmentId` | ObjectId -> Appointment | Optional (null for walk-ins) |
| `doctorId` | ObjectId -> Doctor | Optional |
| `departmentId` | ObjectId -> Department | Required |
| `arrivedAt` | Date | Default `now` |
| `checkinMethod` | String | `reception` \| `kiosk` \| `qr` \| `self_service` |
| `isWalkIn` | Boolean | Default `false` |
| `urgencyLevel` | String | `normal` \| `urgent` |
| `status` | String | `checked_in` \| `queued` \| `cancelled` \| `expired` |
| `handledBy` | ObjectId -> User | Staff who handled check-in |

#### QueueToken

| Field | Type | Notes |
|-------|------|-------|
| `tokenNumber` | String | Required, unique (format: `A-OPD-001` or `U-OPD-001`) |
| `tokenSequence` | Number | Sequential number within department |
| `patientId` | ObjectId -> Patient | Required |
| `appointmentId` | ObjectId -> Appointment | Optional |
| `checkinId` | ObjectId -> Checkin | Required |
| `assignedDoctorId` | ObjectId -> Doctor | Null until assigned |
| `departmentId` | ObjectId -> Department | Required |
| `specialization` | String | Required |
| `queueType` | String | `scheduled` \| `walk_in` |
| `priorityLevel` | String | `normal` \| `urgent` |
| `queueStatus` | String | `waiting` \| `assigned` \| `called` \| `in_consultation` \| `transferred` \| `completed` \| `missed` |
| `queuePosition` | Number | Current position in doctor's queue |
| `estimatedWaitMinutes` | Number | Calculated wait time |
| `predictedConsultationStart` | Date | Estimated start time |
| `actualCalledAt` | Date | When the doctor called |
| `actualConsultationStartAt` | Date | When consultation began |
| `actualConsultationEndAt` | Date | When consultation ended |
| `transferHistory` | Array | `[{ fromDoctorId, toDoctorId, reason, transferredBy, transferredAt }]` |
| `isActive` | Boolean | Default `true` |

#### Consultation

| Field | Type | Notes |
|-------|------|-------|
| `consultationNumber` | String | Required, unique |
| `patientId` | ObjectId -> Patient | Required |
| `doctorId` | ObjectId -> Doctor | Required |
| `appointmentId` | ObjectId -> Appointment | Optional |
| `queueTokenId` | ObjectId -> QueueToken | Required |
| `departmentId` | ObjectId -> Department | Required |
| `status` | String | `in_consultation` \| `completed` \| `cancelled` \| `transferred` |
| `startedAt` | Date | Default `now` |
| `completedAt` | Date | Set on completion |
| `consultationNotes` | String | Clinical notes |

#### DoctorAssignment

| Field | Type | Notes |
|-------|------|-------|
| `patientId` | ObjectId -> Patient | Required |
| `appointmentId` | ObjectId -> Appointment | Optional |
| `queueTokenId` | ObjectId -> QueueToken | Required |
| `departmentId` | ObjectId -> Department | Required |
| `specialization` | String | Required |
| `assignmentType` | String | `initial` \| `reassignment` \| `transfer` |
| `assignedDoctorId` | ObjectId -> Doctor | Required |
| `previousDoctorId` | ObjectId -> Doctor | For reassignments/transfers |
| `decisionReason` | String | Why this doctor was chosen |
| `assignedByType` | String | `system` \| `doctor` \| `receptionist` \| `admin` \| `patient` |
| `assignedBy` | ObjectId -> User | Who triggered the assignment |

#### Department

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required, unique |
| `code` | String | Required, unique (e.g. `OPD`) |
| `description` | String | Optional |
| `isActive` | Boolean | Default `true` |

#### SystemConfig

| Field | Type | Notes |
|-------|------|-------|
| `key` | String | Required, unique |
| `value` | Mixed | Any value type |
| `description` | String | Human-readable description |
| `updatedBy` | ObjectId -> User | Last modifier |

---

## API Reference

Base URL: `http://localhost:5000/api/v1`

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Server health check |

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register-patient` | None | Register a new patient account |
| POST | `/auth/login` | None | Login, returns JWT tokens |
| GET | `/auth/me` | Bearer | Get current user profile |

**POST `/auth/login` request:**
```json
{ "email": "admin@spcms.local", "password": "Admin@123" }
```

**POST `/auth/login` response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "fullName": "...", "email": "...", "role": "admin" },
    "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
  }
}
```

### Departments

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/departments` | None | - | List all departments |
| GET | `/departments/:id` | Bearer | admin, receptionist | Get department by ID |
| POST | `/departments` | Bearer | admin | Create department |
| PATCH | `/departments/:id` | Bearer | admin | Update department |

### Doctors

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/doctors` | None | - | List all doctors |
| GET | `/doctors/:id` | Bearer | admin, receptionist, doctor | Get doctor by ID |
| GET | `/doctors/:id/slots` | None | - | Get available appointment slots |
| GET | `/doctors/:id/queue` | Bearer | admin, receptionist, doctor | Get doctor's current queue |
| POST | `/doctors` | Bearer | admin | Create doctor profile |
| PATCH | `/doctors/:id` | Bearer | admin | Update doctor profile |
| PATCH | `/doctors/:id/availability` | Bearer | admin, doctor | Update availability status |

### Patients

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/patients` | Bearer | admin, doctor, receptionist | List patients |
| GET | `/patients/:id` | Bearer | admin, doctor, receptionist, patient | Get patient by ID |
| POST | `/patients` | Bearer | admin, receptionist | Create patient record |
| PATCH | `/patients/:id` | Bearer | admin, receptionist | Update patient record |

### Appointments

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/appointments/available-slots` | None | - | Get available time slots |
| GET | `/appointments` | Bearer | admin, doctor, receptionist, patient | List appointments |
| GET | `/appointments/:id` | Bearer | admin, doctor, receptionist, patient | Get appointment by ID |
| POST | `/appointments` | Bearer | admin, receptionist, patient | Book an appointment |
| PATCH | `/appointments/:id/cancel` | Bearer | admin, receptionist, patient | Cancel an appointment |

**POST `/appointments` request:**
```json
{
  "patientId": "...",
  "departmentId": "...",
  "doctorId": "...",
  "specialization": "General Medicine",
  "appointmentDate": "2026-03-10",
  "slotStart": "2026-03-10T09:00:00.000Z",
  "slotEnd": "2026-03-10T09:15:00.000Z",
  "bookingType": "doctor",
  "bookingSource": "receptionist"
}
```

### Check-ins

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/checkins` | Bearer | admin, receptionist | List check-ins |
| POST | `/checkins` | Bearer | admin, receptionist, patient | Create check-in |

**POST `/checkins` request:**
```json
{
  "patientId": "...",
  "departmentId": "...",
  "specialization": "General Medicine",
  "urgencyLevel": "normal",
  "isWalkIn": true,
  "preferredDoctorId": "...",
  "notes": "Optional notes"
}
```

**Check-in creates three records atomically:**
1. `Checkin` record
2. `QueueToken` (with token number like `A-OPD-001`)
3. `DoctorAssignment` (via smart assignment)

### Queue

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/queue/board` | None | - | Public queue board (all active tokens) |
| GET | `/queue/tokens` | Bearer | all | List queue tokens (filterable) |
| POST | `/queue/tokens/auto-assign` | Bearer | admin, receptionist | Auto-assign a waiting token to a doctor |
| PATCH | `/queue/tokens/:id/assign` | Bearer | admin, receptionist | Manually assign token to a doctor |
| PATCH | `/queue/tokens/:id/call` | Bearer | admin, receptionist, doctor | Mark token as called |
| PATCH | `/queue/tokens/:id/miss` | Bearer | admin, receptionist, doctor | Mark token as missed |
| PATCH | `/queue/tokens/:id/priority` | Bearer | admin, receptionist, doctor | Update token priority level |

### Consultations

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/consultations` | Bearer | admin, receptionist, doctor | List consultations |
| POST | `/consultations/start` | Bearer | doctor | Start a consultation |
| PATCH | `/consultations/:id/complete` | Bearer | doctor | Complete a consultation |

**POST `/consultations/start` request:**
```json
{ "queueTokenId": "..." }
```

**PATCH `/consultations/:id/complete` request:**
```json
{ "consultationNotes": "Clinical notes from the session" }
```

### Reports

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/reports/overview` | None | - | Public metrics (checked-in today, avg wait, active doctors, urgent count) |
| GET | `/reports/dashboard` | Bearer | admin | Full dashboard with doctor availability breakdown |

### System Config

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/system-configs` | Bearer | admin | List all config entries |
| PATCH | `/system-configs/:key` | Bearer | admin | Update a config value |

### Audit Logs

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/audit-logs` | Bearer | admin | List audit log entries |

---

## Real-Time Events (Socket.IO)

The server uses Socket.IO for real-time queue updates. The client connects to the same host as the API (port 5000).

### Rooms

Clients join rooms to receive targeted updates:

| Room | Join Event | Description |
|------|-----------|-------------|
| `department:<id>` | `join:department` | All tokens in a department |
| `doctor:<id>` | `join:doctor` | Tokens assigned to a specific doctor |
| `patient:<id>` | `join:patient` | Tokens belonging to a specific patient |

### Server-to-Client Events

| Event | Payload | Emitted When |
|-------|---------|-------------|
| `queue:updated` | `{}` | Check-in, assignment, call, miss, consultation start/complete, priority change |

The client responds to `queue:updated` by refetching queue data via REST. This is a signal-based pattern rather than a data-push pattern.

### Emit Helper

All controllers use `socketService.emitQueueUpdate(req, { departmentId, doctorId, patientId })` to emit to the relevant rooms after any queue-affecting operation.

---

## Frontend Pages & Routing

### Route Table

| Path | Page | Roles | Description |
|------|------|-------|-------------|
| `/login` | LoginPage | Unauthenticated | Email/password login |
| `/` | DashboardPage | admin, receptionist | Admin dashboard with metrics |
| `/checkin` | CheckinPage | admin, receptionist | Walk-in and appointment check-in |
| `/appointments` | AppointmentsPage | admin, receptionist, doctor | Appointment booking and management |
| `/queue-board` | QueueBoardPage | All authenticated | Real-time queue display |
| `/patients` | PatientsPage | admin, receptionist | Patient directory |
| `/doctors` | DoctorsPage | admin, receptionist | Doctor roster |
| `/doctor-dashboard` | DoctorDashboardPage | doctor | Consultation workflow |
| `/patient-dashboard` | PatientDashboardPage | patient | Self-service portal |

### Role-Based Redirects

After login, users are redirected based on their role:
- `patient` -> `/patient-dashboard`
- `doctor` -> `/doctor-dashboard`
- `admin` / `receptionist` -> `/`

The catch-all route (`*`) also redirects based on role if the user is authenticated.

### Navigation Items by Role

| Role | Nav Items |
|------|-----------|
| admin / receptionist | Overview, Check-in, Appointments, Queue Board, Patients, Doctors |
| doctor | Dr. Dashboard, Appointments, Queue Board |
| patient | My Dashboard |

### Page Details

#### LoginPage
Login form with email and password. Displays seed data hints for test accounts. Uses `AlertBanner` for error display. Role-based redirect on success.

#### DashboardPage
- **Admin view:** 4 metric cards (checked-in today, avg wait, active doctors, urgent cases) + doctor availability breakdown table + feature lane cards
- **Non-admin view:** Same 4 metrics from the public overview endpoint

#### CheckinPage
Front desk workflow. Form with: patient selector, department, specialization (populated from doctors in selected department), optional doctor preference, urgency level toggle, walk-in checkbox, notes. On success, displays the generated queue token number and auto-redirects to the queue board after 2 seconds.

#### AppointmentsPage
Two-column layout. Left: booking form (patient, department, doctor, date, time). Right: appointments table with status badges and cancel buttons for scheduled appointments.

#### QueueBoardPage
Real-time grid of queue token cards. Each card shows token number, patient name, assigned doctor (or "Awaiting doctor assignment"), status badge, and estimated wait time. Subscribes to Socket.IO `queue:updated` events via `join:department` rooms.

#### PatientsPage
Read-only table: name, phone, email, active/inactive status badges.

#### DoctorsPage
Card grid: doctor name, specialization, availability status badge, consultation room.

#### DoctorDashboardPage
Two-column layout for doctors:
- **Left:** Patient queue list ordered by position. Each entry shows token number (last segment), patient name, wait time, priority badge. "Call Next" button for the first waiting patient.
- **Right:** Active consultation panel with pulsing indicator, clinical notes textarea, "Complete Consultation" button.

Subscribes to `join:doctor` Socket.IO room.

#### PatientDashboardPage
Two-column layout for patients:
- **Left:** Live queue status (active tokens with doctor, room, status, wait time) + upcoming appointments with cancel buttons.
- **Right:** Self-service appointment booking form (department, doctor, date, time).

Subscribes to `join:patient` Socket.IO room.

---

## Shared UI Components

### `AuthProvider` (`components/AuthProvider.jsx`)
React context provider wrapping the entire app. Manages `user` state, `login(email, password)`, `logout()`. On mount, checks localStorage for an existing token and calls `GET /auth/me` to hydrate user state. Exposes `useAuth()` hook.

### `SectionCard` (`components/SectionCard.jsx`)
Glassmorphic card wrapper with rounded corners, backdrop blur, and soft shadow. Props: `title`, `eyebrow` (uppercase label in coral), `children`.

### `StatusBadge` (`components/StatusBadge.jsx`)
Pill-shaped status indicator with automatic color mapping:

| Status Values | Color |
|---------------|-------|
| `waiting`, `scheduled`, `normal` | Teal |
| `in_consultation`, `cancelled`, `busy`, `urgent`, `inactive` | Coral |
| `completed`, `available`, `active` | Moss (green) |
| `missed`, `checked_out`, `no_show`, `offline` | Ink (gray) |
| `on_break` | Sand |

Props: `status`, `label` (override text), `tone` (override color), `className`.

### `LoadingSpinner` (`components/LoadingSpinner.jsx`)
Animated pulsing dot with "Loading..." text. Props: `message`, `fullPage` (centers in 60vh container).

### `AlertBanner` (`components/AlertBanner.jsx`)
Dismissible inline notification banner. Variants: `error` (coral), `success` (moss), `info` (teal), `warning` (sand). Props: `message`, `variant`, `onDismiss`. Returns `null` if no message is provided.

---

## Design System

### Fonts

| Font | Usage | Loaded From |
|------|-------|-------------|
| **Sora** | Headings, display text | Google Fonts (preconnected in `index.html`) |
| **Manrope** | Body text, UI elements | Google Fonts |

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| `canvas` | `#f5efe4` | Page background base |
| `ink` | `#172121` | Primary text |
| `teal` | `#1e6f73` | Primary accent, links, active states |
| `moss` | `#3f5f45` | Success states, completed badges |
| `coral` | `#dd6e42` | Warnings, urgent, destructive actions |
| `sand` | `#d8c3a5` | Secondary backgrounds, on-break states |

### Background

The app uses a `bg-mesh` custom gradient:
- Dual radial gradients: coral (top-left, 20% opacity) + teal (top-right, 15% opacity)
- Over a linear gradient from canvas to sand

### UI Style

- **Glassmorphism:** `bg-white/80 backdrop-blur border-white/60`
- **Rounded:** `rounded-[28px]` for cards and panels
- **Shadow:** Custom `shadow-panel` (large soft drop shadow)

---

## Seed Data & Test Accounts

Run `npm run seed --workspace server` to populate the database.

### Users

| Role | Name | Email | Password |
|------|------|-------|----------|
| Admin | System Admin | `admin@spcms.local` | `Admin@123` |
| Receptionist | Front Desk Reception | `reception@spcms.local` | `Reception@123` |
| Doctor | Dr. Arun Rao | `arun.rao@spcms.local` | `Doctor@123` |
| Doctor | Dr. Sara Iqbal | `sara.iqbal@spcms.local` | `Doctor@123` |
| Doctor | Dr. Njeri Singh | `njeri.singh@spcms.local` | `Doctor@123` |
| Patient | John Doe | `john.doe@example.com` | `Patient@123` |
| Patient | Jane Smith | `jane.smith@example.com` | `Patient@123` |
| Patient | Alice Johnson | `alice.j@example.com` | `Patient@123` |

### Doctors

| Code | Name | Specialization | Room | Department |
|------|------|---------------|------|------------|
| DOC-RAO | Dr. Arun Rao | General Medicine | A-101 | OPD |
| DOC-IQB | Dr. Sara Iqbal | Cardiology | B-204 | OPD |
| DOC-NJS | Dr. Njeri Singh | Dermatology | C-112 | OPD |

All doctors have Mon-Fri schedules: 09:00-16:00, break 12:30-13:00, 15-minute slots.

### Patients

| Code | Name | Email |
|------|------|-------|
| PAT-001 | John Doe | john.doe@example.com |
| PAT-002 | Jane Smith | jane.smith@example.com |
| PAT-003 | Alice Johnson | alice.j@example.com |

### System Configs

| Key | Value | Description |
|-----|-------|-------------|
| `queue.noShowGraceMinutes` | 15 | Minutes before a checked-in patient is marked missed |
| `assignment.reassignThresholdMinutes` | 15 | Minimum wait reduction required to reassign |
| `hospital.defaultSlotMinutes` | 15 | Default appointment slot duration |

---

## Consultation Workflow

The complete patient consultation journey follows these steps:

```
1. REGISTER      Patient creates account or staff registers them
       │
2. BOOK          Appointment booked (optional for walk-ins)
       │
3. CHECK IN      Patient arrives, staff or self-service check-in
       │
       ├── Creates Checkin record
       ├── Creates QueueToken (A-OPD-001 format)
       └── Creates DoctorAssignment (via smart assignment)
       │
4. WAIT          Patient waits; real-time position updates via Socket.IO
       │
5. CALL          Doctor calls next patient from their queue
       │
       └── QueueToken status: waiting -> called
       │
6. CONSULT       Doctor starts consultation
       │
       ├── Creates Consultation record
       └── QueueToken status: called -> in_consultation
       │
7. COMPLETE      Doctor completes consultation with notes
       │
       ├── Consultation status: in_consultation -> completed
       ├── QueueToken status: in_consultation -> completed
       └── Queue positions recalculated for remaining patients
       │
8. (OPTIONAL) TRANSFER    Doctor transfers to another doctor
       │
9. (OPTIONAL) MISS        Patient doesn't respond when called
```

### Token Number Format

- Normal priority: `A-{deptCode}-{sequence}` (e.g., `A-OPD-001`)
- Urgent priority: `U-{deptCode}-{sequence}` (e.g., `U-OPD-001`)

The sequence resets daily per department.

---

## Smart Doctor Assignment

When a patient checks in, the system automatically assigns them to the best available doctor.

### Algorithm (`assignmentService.findBestDoctor`)

1. **Filter eligible doctors:** Active, in the correct department, matching specialization (if provided), `availabilityStatus` is `available` or `busy`, and `allowAutoAssignment` is `true`

2. **Check preferred doctor:** If the patient requested a specific doctor and that doctor is eligible and under their `maxQueueThreshold`, assign them directly

3. **Filter by threshold:** Remove any doctor whose current active queue count >= their `maxQueueThreshold`

4. **Score remaining doctors:**
   - Primary sort: estimated wait time (ascending)
   - Tiebreaker: active queue count (ascending)

5. **Graceful degradation:** If all doctors are over threshold, fall back to the least-loaded doctor rather than failing

### Queue Recalculation (`queueService.recalculateDoctorQueue`)

After every assignment, call, miss, or consultation completion:
1. Fetch all active tokens for the doctor, sorted by priority (urgent first) then creation time
2. Re-index `queuePosition` (1-based)
3. Calculate `estimatedWaitMinutes` = `position * averageConsultationMinutes`
4. Calculate `predictedConsultationStart` = `now + estimatedWaitMinutes`
5. Emit `queue:updated` to all relevant Socket.IO rooms

---

## Error Handling

### Backend Error Classes

- **`ApiError(statusCode, message, errors)`** — Custom error class thrown by controllers
- **`asyncHandler(fn)`** — Wraps async controller functions to catch rejected promises and forward to `next()`

### Global Error Handler (`errorHandler.js`)

The error handler normalizes all errors into the standard response format:

| Error Type | HTTP Status | Example |
|-----------|-------------|---------|
| `ApiError` | Custom (400, 404, 409, etc.) | "Patient not found" |
| Mongoose `ValidationError` | 400 | Missing required fields |
| Mongoose `CastError` | 400 | Invalid ObjectId format |
| MongoDB `E11000` | 409 | Duplicate key violation |
| `JsonWebTokenError` | 401 | Malformed token |
| `TokenExpiredError` | 401 | Expired token |
| Unhandled errors | 500 | Unexpected server errors |

Stack traces are included in non-production responses. Server-side `console.error` for 500+ status codes (suppressed in test environment).

### Frontend Error Handling

- `api.js` detects 401 responses, clears the stored token, and redirects to `/login`
- All pages use `AlertBanner` to display errors from failed API calls
- Loading states are managed with `LoadingSpinner`

---

## Known Limitations & Future Work

These items are identified but not yet implemented:

1. **Validation middleware not wired** — `validate.js` exists but is not connected to route definitions. Controllers do their own ad-hoc validation.

2. **No MongoDB transactions** — The check-in flow creates Checkin + QueueToken + DoctorAssignment as separate saves. A failure between saves could leave the database in an inconsistent state.

3. **No pagination** — List endpoints return all records. Large datasets will cause performance issues.

4. **WebSocket connections are unauthenticated** — Any client can join any Socket.IO room without JWT verification.

5. **No refresh token rotation endpoint** — The backend signs refresh tokens but there's no `/auth/refresh` endpoint to exchange them.

6. **No test suite** — No unit or integration tests exist.

7. **Notification model is dead code** — The `Notification` schema exists but is never referenced by any controller, service, or route.

8. **No per-route role guards on frontend** — Navigation items are filtered by role, but routes themselves are accessible to any authenticated user via direct URL entry.

9. **Single department seeded** — Only the OPD department exists in seed data. Multi-department workflows are supported by the schema but untested.

---

## Vercel Deployment

The frontend and backend are deployed as **two separate Vercel projects** from the same repository.

### Important: Socket.IO on Vercel

Vercel uses serverless functions — they are stateless and short-lived. **Socket.IO (WebSocket) does not work on Vercel.** The codebase handles this automatically:

- In **local development**, Socket.IO works normally for instant real-time updates.
- On **Vercel**, the frontend falls back to **REST polling** (every 5 seconds by default) via the `useQueuePolling` hook. The hook tries Socket.IO first, waits 3 seconds for a connection, and switches to polling if it fails.

You can customize the polling interval with the `VITE_POLL_INTERVAL` env var (in milliseconds).

### Project Structure for Vercel

```
HospitalManagement/
├── server/
│   ├── vercel.json        ← Backend Vercel config
│   └── src/server.js      ← Exports default handler for serverless
│
└── client/
    ├── vercel.json        ← Frontend Vercel config
    └── dist/              ← Vite build output
```

### Step 1: Deploy the Backend

1. **Create a new Vercel project** for the backend.

2. **Set the Root Directory** to `server` in the Vercel project settings.

3. **Configure build settings:**
   - Framework Preset: `Other`
   - Build Command: (leave empty — no build step needed)
   - Output Directory: (leave empty)

4. **Set environment variables** in the Vercel dashboard:

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `MONGODB_URI` | `mongodb+srv://...` | **Required.** Your MongoDB Atlas connection string |
   | `JWT_ACCESS_SECRET` | `<strong-random-string>` | **Required.** Use a unique, long secret |
   | `JWT_REFRESH_SECRET` | `<strong-random-string>` | **Required.** Different from access secret |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | **Required.** Comma-separated if you have multiple frontends (e.g. `https://your-app.vercel.app,http://localhost:5173`) |
   | `NODE_ENV` | `production` | Recommended |
   | `JWT_ACCESS_EXPIRES_IN` | `15m` | Optional (default: `15m`) |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` | Optional (default: `7d`) |

5. **Deploy.** The `vercel.json` in `server/` routes all requests to `src/server.js`, which exports a serverless handler function.

6. **Note the backend URL** (e.g. `https://spcms-api.vercel.app`). You'll need this for the frontend.

### Step 2: Deploy the Frontend

1. **Create a second Vercel project** for the frontend.

2. **Set the Root Directory** to `client` in the Vercel project settings.

3. **Configure build settings:**
   - Framework Preset: `Vite`
   - Build Command: `vite build`
   - Output Directory: `dist`

4. **Set environment variables** in the Vercel dashboard:

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `VITE_API_BASE_URL` | `https://spcms-api.vercel.app/api/v1` | **Required.** Your deployed backend URL + `/api/v1` |
   | `VITE_POLL_INTERVAL` | `5000` | Optional. Polling interval in ms (default: `5000`) |

5. **Deploy.** The `vercel.json` in `client/` serves the Vite build and rewrites all routes to `index.html` for SPA routing.

### Step 3: Update Backend CORS

After both projects are deployed, **update the backend's `CLIENT_URL`** env var to include the frontend's production URL:

```
CLIENT_URL=https://your-frontend.vercel.app
```

If you also want to develop locally while the backend is deployed, use comma-separated origins:

```
CLIENT_URL=https://your-frontend.vercel.app,http://localhost:5173
```

### Step 4: Seed the Production Database

Run the seed script locally with the production `MONGODB_URI`:

```bash
MONGODB_URI="mongodb+srv://..." JWT_ACCESS_SECRET="..." JWT_REFRESH_SECRET="..." node server/src/scripts/seed.js
```

Or set up the env vars in a local `.env` file pointing to the production database and run:

```bash
npm run seed --workspace server
```

### Environment Variables Summary

#### Backend (Vercel Project — Root: `server/`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | - | JWT signing secret (access tokens) |
| `JWT_REFRESH_SECRET` | Yes | - | JWT signing secret (refresh tokens) |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `NODE_ENV` | No | `development` | `production` recommended for deployment |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |

#### Frontend (Vercel Project — Root: `client/`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes | `http://localhost:5000/api/v1` | Backend API URL with `/api/v1` suffix |
| `VITE_POLL_INTERVAL` | No | `5000` | Queue polling interval in ms |

### Vercel Config Files

**`server/vercel.json`** — Routes all requests to the Express serverless handler:

```json
{
  "version": 2,
  "builds": [
    { "src": "src/server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "src/server.js" }
  ]
}
```

**`client/vercel.json`** — Vite SPA with client-side routing fallback:

```json
{
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

## Live Demo & Testing Credentials

### Live URLs

| Service | URL |
|---------|-----|
| Frontend | [https://hms-client-theta.vercel.app](https://hms-client-theta.vercel.app) |
| Backend API | [https://hms-server-iota.vercel.app](https://hms-server-iota.vercel.app) |
| Health Check | [https://hms-server-iota.vercel.app/api/v1/health](https://hms-server-iota.vercel.app/api/v1/health) |

### Test Credentials

All accounts below are pre-seeded. Use the frontend login page to sign in.

#### Admin

| Field | Value |
|-------|-------|
| Email | `admin@spcms.local` |
| Password | `Admin@123` |

Full system access: manage departments, doctors, patients, view audit logs, reports, and system configuration.

#### Receptionist

| Field | Value |
|-------|-------|
| Email | `reception@spcms.local` |
| Password | `Reception@123` |

Can register patients, book appointments, perform check-ins, and monitor the queue board.

#### Doctors

| Name | Email | Password | Specialization | Room |
|------|-------|----------|----------------|------|
| Dr. Arun Rao | `arun.rao@spcms.local` | `Doctor@123` | General Medicine | A-101 |
| Dr. Sara Iqbal | `sara.iqbal@spcms.local` | `Doctor@123` | Cardiology | B-204 |
| Dr. Njeri Singh | `njeri.singh@spcms.local` | `Doctor@123` | Dermatology | C-112 |

Can view their queue, call patients, start/complete consultations, add notes, and transfer patients.

#### Patients

| Name | Email | Password |
|------|-------|----------|
| John Doe | `john.doe@example.com` | `Patient@123` |
| Jane Smith | `jane.smith@example.com` | `Patient@123` |
| Alice Johnson | `alice.j@example.com` | `Patient@123` |

Can view their appointments, check queue position, and see consultation history.

### Quick Test Workflow

1. **Login as Receptionist** (`reception@spcms.local` / `Reception@123`)
2. Go to **Check In** page and check in a patient (e.g. John Doe) to the OPD department
3. **Login as Doctor** (`arun.rao@spcms.local` / `Doctor@123`) in another browser/tab
4. See the patient appear in the doctor's queue, click **Call**, then **Start Consultation**
5. Add notes and **Complete** the consultation
6. **Login as Patient** (`john.doe@example.com` / `Patient@123`) to view the consultation record
