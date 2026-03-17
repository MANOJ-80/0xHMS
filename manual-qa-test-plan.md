# SPCMS Manual QA Test Plan

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Test Accounts](#2-test-accounts)
3. [TC-0: Prerequisites & Global Checks](#tc-0-prerequisites--global-checks)
4. [TC-1: Login & Authentication](#tc-1-login--authentication)
5. [TC-2: Sidebar Navigation & Layout](#tc-2-sidebar-navigation--layout)
6. [TC-3: Admin/Receptionist Dashboard](#tc-3-adminreceptionist-dashboard)
7. [TC-4: Patients Page (Admin/Receptionist)](#tc-4-patients-page)
8. [TC-5: Doctors Page (Admin/Receptionist)](#tc-5-doctors-page)
9. [TC-6: Check-In Page (Admin/Receptionist)](#tc-6-check-in-page)
10. [TC-7: Appointments Page (Admin/Receptionist/Doctor)](#tc-7-appointments-page)
11. [TC-8: Doctor Assignment & Patient Lock](#tc-8-doctor-assignment--patient-lock)
12. [TC-9: Doctor Dashboard](#tc-9-doctor-dashboard)
13. [TC-10: Patient Dashboard](#tc-10-patient-dashboard)
14. [TC-11: Notifications Page](#tc-11-notifications-page)
15. [TC-12: Prescriptions Page](#tc-12-prescriptions-page)
16. [TC-13: End-to-End Workflow](#tc-13-end-to-end-workflow)
17. [TC-14: Real-Time Updates](#tc-14-real-time-updates)
18. [TC-15: Role-Based Access Control](#tc-15-role-based-access-control)
19. [TC-16: Error Handling & Edge Cases](#tc-16-error-handling--edge-cases)
20. [TC-17: Responsive Design & Mobile](#tc-17-responsive-design--mobile)
21. [Known Issues & Observations](#known-issues--observations)

---

## 1. Test Environment Setup

### Prerequisites

- Node.js 18+ installed
- MongoDB running locally (or accessible via connection string)
- Two browser windows/tabs (or one normal + one incognito for multi-role testing)

### Start the Application

```bash
# Terminal 1: Start backend
cd server
cp .env.example .env          # Ensure MONGODB_URI, JWT secrets are set
npm install
npm run seed                   # Seeds test users, department, doctors, patients
npm run dev                    # Starts on http://localhost:5000

# Terminal 2: Start frontend
cd client
npm install
npm run dev                    # Starts on http://localhost:5173
```

### Verify Health

- Open `http://localhost:5000/api/v1/health` in browser -- should return JSON with `"success": true`
- Open `http://localhost:5173` -- should redirect to login page

---

## 2. Test Accounts

All accounts are created by the seed script (`npm run seed`).

| Role | Name | Email | Password |
|------|------|-------|----------|
| Admin | System Admin | `admin@spcms.local` | `Admin@123` |
| Receptionist | Front Desk Reception | `reception@spcms.local` | `Reception@123` |
| Doctor 1 | Dr. Arun Rao | `arun.rao@spcms.local` | `Doctor@123` |
| Doctor 2 | Dr. Sara Iqbal | `sara.iqbal@spcms.local` | `Doctor@123` |
| Doctor 3 | Dr. Njeri Singh | `njeri.singh@spcms.local` | `Doctor@123` |
| Patient 1 | John Doe | `john.doe@example.com` | `Patient@123` |
| Patient 2 | Jane Smith | `jane.smith@example.com` | `Patient@123` |
| Patient 3 | Alice Johnson | `alice.j@example.com` | `Patient@123` |

---

## TC-0: Prerequisites & Global Checks

### TC-0.1: Application Loads

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Open `http://localhost:5173` in browser | Page loads without console errors | |
| 2 | Observe the page | Redirects to `/login` since no user is logged in | |
| 3 | Check the page title/branding | Login page visible with SPCMS branding, glassmorphic card design | |

### TC-0.2: Global Styling

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Inspect the login page background | Mesh gradient background (coral top-left, teal top-right, canvas-to-sand bottom) | |
| 2 | Inspect fonts | Headings use Sora display font; body text uses Manrope | |
| 3 | Inspect card styling | White/translucent card with `backdrop-blur`, rounded corners (~28px), panel shadow | |
| 4 | Check the color palette | Canvas (#f5efe4) background, ink (#172121) text, teal accents | |

---

## TC-1: Login & Authentication

### TC-1.1: Login Validation

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Leave both fields empty, click "Sign in" | Toast error: "Email is required" | |
| 2 | Enter email only, leave password empty, click "Sign in" | Toast error: "Password is required" | |
| 3 | Enter valid email + wrong password, click "Sign in" | Toast error: "Invalid credentials" | |
| 4 | Enter non-existent email + any password, click "Sign in" | Toast error: "Invalid credentials" | |

### TC-1.2: Successful Login (Admin)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Enter `admin@spcms.local` / `Admin@123`, click "Sign in" | Button shows "Signing in..." while loading | |
| 2 | Wait for login to complete | Toast success: "Welcome back!" | |
| 3 | Observe redirect | Redirected to `/` (Overview/Dashboard page) | |
| 4 | Check sidebar | Sidebar shows "SPCMS" branding, role "Administrator", user name "System Admin" | |
| 5 | Check sidebar nav items | Shows: Overview, Check-in, Appointments, Patients, Doctors, Notifications, Prescriptions (7 items) | |

### TC-1.3: Successful Login (Receptionist)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Log out first (click logout in sidebar) | Redirected to `/login` | |
| 2 | Enter `reception@spcms.local` / `Reception@123`, click "Sign in" | Redirected to `/` | |
| 3 | Check sidebar | Role shows "Front Desk", same 8 nav items as admin | |

### TC-1.4: Successful Login (Doctor)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Log out and login as `arun.rao@spcms.local` / `Doctor@123` | Redirected to `/doctor-dashboard` | |
| 2 | Check sidebar nav items | Shows: Dashboard, Appointments, Prescriptions, Notifications (4 items) | |
| 3 | Check role label | "Doctor" displayed under name | |

### TC-1.5: Successful Login (Patient)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Log out and login as `john.doe@example.com` / `Patient@123` | Redirected to `/patient-dashboard` | |
| 2 | Check sidebar nav items | Shows: My Dashboard, Prescriptions, Notifications (3 items) | |
| 3 | Check role label | "Patient" displayed under name | |

### TC-1.6: Logout

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click the logout button (bottom of sidebar, coral on hover) | Redirected to `/login` | |
| 2 | Try navigating to `/` directly in URL | Redirected back to `/login` | |
| 3 | Check localStorage | `accessToken` key is removed | |

### TC-1.7: Session Expiry

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as any user | Lands on home page | |
| 2 | Open DevTools > Application > Local Storage, manually delete `accessToken` | No immediate change | |
| 3 | Trigger any navigation or page that makes an API call | Redirected to `/login` (401 triggers redirect) | |

---

## TC-2: Sidebar Navigation & Layout

### TC-2.1: Sidebar Visual Structure

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as admin | Sidebar visible on left side (desktop width) | |
| 2 | Check brand area | "SP" badge (teal background, white text) + "SPCMS" text | |
| 3 | Check user section at bottom | Avatar circle with first letter of name, full name, role label, logout button | |
| 4 | Check active nav item | Current page nav item has dark background (bg-ink, white text) | |
| 5 | Click a different nav item | Previous item loses active style, new item gains active style | |

### TC-2.2: Sidebar Icons

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Verify each nav item has an SVG icon next to the label | All 8 items (admin view) show unique icons | |
| 2 | Icons should be consistent size | All icons are same size (~20x20px), stroke-based | |

### TC-2.3: Content Area

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Check main content area | Content fills remaining space to the right of sidebar | |
| 2 | Scroll content area with a long page (e.g., Appointments with data) | Content scrolls independently; sidebar stays fixed | |
| 3 | Check background | Mesh gradient background visible behind content | |

---

## TC-3: Admin/Receptionist Dashboard

**Login as: Admin (`admin@spcms.local`)**

### TC-3.1: Dashboard Loading

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Navigate to Overview (`/`) | Loading spinner with "Loading dashboard..." shown briefly | |
| 2 | Wait for data to load | Dashboard content appears | |

### TC-3.2: Greeting

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Check the top heading | Shows "Welcome back, System" (first name extracted from "System Admin") | |

### TC-3.3: Admin Dashboard — Staff Registration Form

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as admin, navigate to Overview | "Add New Staff" form is displayed (KPIs are NOT shown for admin) |
| 2 | Check form fields | Role dropdown (Doctor/Receptionist), Name, Email, Password, Phone fields visible |
| 3 | Select role "Doctor" | Additional fields appear: Specialization and Department |
| 4 | Select role "Receptionist" | Specialization and Department fields hidden |
| 5 | Fill in all fields for a new doctor, submit | Toast success: "Staff member registered!" |
| 6 | Login as receptionist, navigate to Overview | KPI cards and dashboard data shown (NOT the staff form) | |

---

## TC-4: Patients Page

**Login as: Admin or Receptionist**

### TC-4.1: Page Load

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Patients" in sidebar | Loading spinner: "Loading patients..." | |
| 2 | Data loads | Patient table displayed with columns: Code, Name, Phone, Email, Status | |
| 3 | Check eyebrow text | Shows "{N} record(s)" where N is total patient count | |

### TC-4.2: Patient Data Display

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Verify seeded patients visible | John Doe (PAT-001), Jane Smith (PAT-002), Alice Johnson (PAT-003) | |
| 2 | Check status badges | Active patients show green "active" badge | |
| 3 | Missing phone/email | Shows "N/A" for any missing fields | |

### TC-4.3: Search Functionality

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Type "John" in search box | Table filters to show only John Doe | |
| 2 | Clear search, type "PAT-002" | Filters to Jane Smith only | |
| 3 | Type a phone number of a patient | Filters to matching patient | |
| 4 | Type "zzzznonexistent" | Shows "No patients match your search." | |
| 5 | Clear search | All patients shown again | |
| 6 | Verify search resets page to 1 | If on page 2, typing in search goes back to page 1 | |

### TC-4.4: Pagination

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If fewer than 12 patients | Pagination component not shown (hidden when totalPages <= 1) | |
| 2 | If 13+ patients exist | Pagination shows page numbers, prev/next buttons | |
| 3 | Click next page | Table shows next 12 patients; page indicator updates | |
| 4 | Click prev on page 1 | Prev button is disabled (30% opacity) | |

---

## TC-5: Doctors Page

**Login as: Admin or Receptionist**

### TC-5.1: Page Load

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Doctors" in sidebar | Loading spinner: "Loading doctors..." | |
| 2 | Data loads | Doctor cards displayed in a grid (3 columns on desktop) | |
| 3 | Eyebrow text | Shows "{N} doctor(s)" | |

### TC-5.2: Doctor Card Content

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Find Dr. Arun Rao's card | Shows "Dr. Arun Rao", "General Medicine", availability badge, room "A-101" | |
| 2 | Find Dr. Sara Iqbal's card | Shows "Cardiology", room "B-204" | |
| 3 | Find Dr. Njeri Singh's card | Shows "Dermatology", room "C-112" | |
| 4 | Check availability badges | All seeded doctors start as "available" (green/moss badge) | |
| 5 | Check max queue threshold | Should show "10" (seeded default) | |
| 6 | Check department | Shows "Outpatient Department" (or department name) | |

### TC-5.3: Filter Buttons

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Verify filter buttons visible | "All", "Available", "Busy", "On Break", "Offline" buttons with counts | |
| 2 | "All" is active by default | Dark background (bg-ink text-white), shows total count | |
| 3 | Click "Available" | Only available doctors shown; "Available" button becomes active | |
| 4 | Click "Offline" | Shows doctors with offline status (may be 0 initially) | |
| 5 | Click "All" again | All doctors shown again | |
| 6 | Verify counts update | Each filter button shows accurate count matching filtered results | |

---

## TC-6: Check-In Page

**Login as: Admin or Receptionist**

### TC-6.1: Page Load

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Check-in" in sidebar | Loading spinner: "Loading check-in form..." | |
| 2 | Form loads | Check-in form with all dropdowns populated | |

### TC-6.2: Form Elements

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Patient dropdown | Lists all patients as "FullName (PatientCode)" | |
| 2 | Department dropdown | Lists "Outpatient Department" (and any others) | |
| 3 | Specialization dropdown | Lists unique specializations from doctors + "Any" option | |
| 4 | Preferred Doctor dropdown | Lists doctors filtered by selected specialization + "Auto-assign best available" default | |
| 5 | Urgency Level dropdown | Shows "normal" and "urgent" options | |
| 6 | Walk-in checkbox | Checked by default, label "Walk-in patient" | |
| 7 | Notes textarea | Empty, placeholder "Symptoms or special requirements..." | |
| 8 | "Check In Patient" button | Enabled when form is valid | |

### TC-6.3: Doctor Filtering by Specialization

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Select "General Medicine" specialization | Doctor dropdown shows only Dr. Arun Rao | |
| 2 | Select "Cardiology" specialization | Doctor dropdown shows only Dr. Sara Iqbal | |
| 3 | Select "Any" specialization | Doctor dropdown shows all doctors | |

### TC-6.4: Form Validation

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Deselect patient (if possible) and submit | Toast error: "Select a patient" | |
| 2 | Deselect department and submit | Toast error: "Select a department" | |

### TC-6.5: Successful Walk-In Check-In

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Select patient: John Doe | Selected in dropdown | |
| 2 | Select department: Outpatient Department | Selected | |
| 3 | Select doctor: Dr. Arun Rao (mandatory) | Doctor selected in dropdown | |
| 4 | Leave urgency as "normal", walk-in checked | Defaults accepted | |
| 5 | Click "Check In Patient" | Button shows "Checking in..." | |
| 6 | Wait for response | Toast success: "Checked in! Token: {tokenNumber}" (e.g., "A-xxx-001") with Dr. Arun Rao assigned | |
| 7 | Verify assignment | Login as Dr. Arun Rao; John Doe appears in "My Patients" with "assigned" status | |

### TC-6.6: Urgent Check-In

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Navigate back to Check-in | Form is reset | |
| 2 | Select patient: Jane Smith, department, urgency: "urgent" | Form filled | |
| 3 | Submit check-in | Toast success with token (should start with "U-" prefix for urgent) | |
| 4 | Check on assigned doctor's dashboard | Jane Smith's token shows "urgent" badge, appears before normal-priority tokens in "My Patients" | |

### TC-6.7: Check-In with Preferred Doctor

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Navigate to Check-in | Form loads | |
| 2 | Select patient: Alice Johnson | Selected | |
| 3 | Select specialization: "Cardiology" | Doctor dropdown filters | |
| 4 | Select preferred doctor: Dr. Sara Iqbal | Selected | |
| 5 | Submit | Token assigned to Dr. Sara Iqbal specifically | |
| 6 | Verify on Dr. Sara Iqbal's dashboard | Login as Dr. Sara Iqbal; Alice Johnson appears in "My Patients" as an assigned patient | |

---

## TC-7: Appointments Page

**Login as: Admin or Receptionist**

### TC-7.1: Page Load

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Appointments" in sidebar | Loading spinner: "Loading appointments..." | |
| 2 | Data loads | Booking form on top, appointments table below | |

### TC-7.2: Booking Form Elements

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Patient dropdown | Lists all patients as "FullName (PatientCode)" | |
| 2 | Department dropdown | Lists departments | |
| 3 | Doctor dropdown | "Any Available Doctor" default + all doctors listed | |
| 4 | Date input | Defaults to today; min date is today (cannot select past dates) | |
| 5 | Time input | Defaults to "09:00" | |
| 6 | "Book Appointment" button | Visible and enabled | |

### TC-7.3: Booking Validation

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Clear patient dropdown, submit | Toast error: "Select a patient" | |
| 2 | Select patient, clear department, submit | Toast error: "Select a department" | |
| 3 | Clear date, submit | Toast error: "Select a date" | |
| 4 | Clear time, submit | Toast error: "Select a time" | |

### TC-7.4: Successful Booking

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Select patient: John Doe | Selected | |
| 2 | Select department: Outpatient Department | Selected | |
| 3 | Select doctor: Dr. Arun Rao | Selected | |
| 4 | Set date: today, time: 10:00 | Set | |
| 5 | Click "Book Appointment" | Button shows "Booking..." | |
| 6 | Wait for response | Toast success: "Appointment booked successfully" | |
| 7 | Check table below | New appointment row: John Doe, Dr. Arun Rao, today 10:00, status "scheduled" | |
| 8 | Check notifications page (later) | An "appointment_confirmation" notification should have been created for John Doe | |

### TC-7.5: Double Booking Prevention

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Book another appointment with same doctor, same date/time (10:00) | Toast error about slot conflict (409 response) | |
| 2 | Book with same doctor but different time (10:30) | Should succeed (no overlap for 15-min slots) | |

### TC-7.6: Cancel Appointment (with Reason)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Find a "scheduled" appointment in the table | "Cancel" button visible (coral text) | |
| 2 | Click "Cancel" | Confirmation modal appears with a **required textarea** for cancellation reason | |
| 3 | Try to confirm without entering a reason | Confirm button disabled or toast error | |
| 4 | Enter reason: "Doctor unavailable" | Textarea filled | |
| 5 | Click "Yes, Cancel" (confirm) | Toast success: "Appointment cancelled" | |
| 6 | Check table | Appointment status now shows "cancelled" badge | |
| 7 | Verify patient notification | A `cancellation` notification is sent to the patient with the reason | |

### TC-7.7: Appointment Table

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Check columns | No., Patient, Doctor, Date/Time, Status, Action | |
| 2 | Status badges | "scheduled" = teal, "cancelled" = coral, "completed" = moss | |
| 3 | Empty state | If no appointments: "No appointments found." | |

### TC-7.8: Pagination

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If 11+ appointments | Pagination visible (PAGE_SIZE = 10) | |
| 2 | Navigate pages | Table updates, page indicator changes | |
| 3 | If 10 or fewer | Pagination hidden | |

---

## TC-8: Doctor Assignment & Patient Lock

**Login as: Admin or Receptionist (for check-in); Doctor (to verify)**

### TC-8.1: Explicit Doctor Assignment at Check-In

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Navigate to Check-in page | Check-in form loads with doctor dropdown | |
| 2 | Select a patient and department | Form fields populated | |
| 3 | Observe doctor dropdown | Lists available doctors with availability status; no "Auto-assign" option | |
| 4 | Attempt to submit without selecting a doctor | Toast error: doctor selection is required | |
| 5 | Select Dr. Arun Rao and submit | Toast success: "Checked in! Token: ..." with Dr. Arun Rao assigned | |

### TC-8.2: Patient Visible Only to Assigned Doctor

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as Dr. Arun Rao (the assigned doctor) | Doctor Dashboard loads | |
| 2 | Check "My Patients" panel | The checked-in patient appears in the queue | |
| 3 | Login as Dr. Sara Iqbal (a different doctor) | Doctor Dashboard loads | |
| 4 | Check "My Patients" panel | The patient does NOT appear — doctors only see their own assigned patients | |

### TC-8.3: Multiple Assignments to Different Doctors

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | (Receptionist) Check in Patient A assigned to Dr. Arun Rao | Token created for Dr. Arun Rao | |
| 2 | (Receptionist) Check in Patient B assigned to Dr. Sara Iqbal | Token created for Dr. Sara Iqbal | |
| 3 | Login as Dr. Arun Rao | Only Patient A visible in "My Patients" | |
| 4 | Login as Dr. Sara Iqbal | Only Patient B visible in "My Patients" | |

### TC-8.4: Prescription Access Control

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as receptionist | Sidebar loads | |
| 2 | Check sidebar nav items | "Prescriptions" is NOT listed for receptionist role | |
| 3 | Manually navigate to `/prescriptions` | Redirected to receptionist home (`/`) — access denied | |
| 4 | Login as doctor | "Prescriptions" IS listed in sidebar | |
| 5 | Login as patient | "Prescriptions" IS listed in sidebar (own prescriptions only) | |

---

## TC-9: Doctor Dashboard

**Login as: Doctor (`arun.rao@spcms.local` / `Doctor@123`)**

### TC-9.1: Page Load

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as doctor | Redirected to `/doctor-dashboard` | |
| 2 | Loading state | "Loading queue..." spinner | |
| 3 | Dashboard loads | Availability toggle, "My Queue" panel, consultation panel visible | |

### TC-9.2: Availability Toggle

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Current status | "available" button highlighted in green (moss) | |
| 2 | Click "busy" | Toast: "Status changed to busy"; button turns coral | |
| 3 | Click "on_break" | Toast: "Status changed to on_break"; button turns sand | |
| 4 | Click "offline" | Toast: "Status changed to offline"; button turns dark gray | |
| 5 | Click "available" again | Toast: "Status changed to available"; button turns green | |
| 6 | Check Doctors page (in another tab as admin) | Doctor's availability badge reflects the current status | |

### TC-9.3: Empty Queue

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If no patients assigned to this doctor | "No patients in queue" with dashed border | |
| 2 | Consultation area | "Call the next patient to begin" with dashed border | |

### TC-9.4: Queue with Patients

**Prerequisite**: Check in patients assigned to this doctor (via admin/receptionist in another tab).

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | After check-in, queue updates | Patient appears in "My Queue" list | |
| 2 | Queue item shows | Token number (last segment), patient name, estimated wait, priority badge | |
| 3 | First patient in queue | Has a "Call Next" button visible | |
| 4 | Other patients | Show status badges but no "Call Next" button | |
| 5 | Urgent patients | Appear before normal patients in the list | |

### TC-9.5: Start Consultation (Call Next)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Call Next" on first patient | Toast: "Consultation started" | |
| 2 | Queue item updates | Shows "In Session" status badge instead of "Call Next" | |
| 3 | Active Consultation panel | Pulsing coral dot with "In progress" text, patient name, and clinical notes textarea appear **alongside** the prescription form | |
| 4 | Prescription form visible | Diagnosis, Treatment Notes, Medicines, "Save Prescription & Complete" and "Complete without Rx" buttons visible inline | |
| 5 | No separate "Complete Consultation" button | The old standalone "Mark Consultation Complete" button is removed | |

### TC-9.6: Indian Medicine Autocomplete

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | In the Medicine Name field, type "Dol" | Dropdown shows "Dolo 650" from local Indian dictionary | |
| 2 | Select "Dolo 650" from dropdown | Medicine name, Reason ("Fever"), Dosage ("650mg"), Frequency ("As needed (SOS)"), Duration ("3 days") are all auto-filled | |
| 3 | Type "Para" in another medicine row | Dropdown shows "Paracetamol 500mg" from local dictionary + US API results | |
| 4 | Click a dosage/frequency/duration field | A `<datalist>` dropdown with common options appears | |
| 5 | Type a rare medicine not in local dictionary (e.g. "Lisin") | US-based RxTerms API results appear in dropdown | |

### TC-9.7 Save Prescription & Complete (Merged Flow)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Enter diagnosis: "Acute viral fever" | Entered | |
| 2 | Leave diagnosis empty, click "Save Prescription & Complete" | Toast error: "Diagnosis is required" | |
| 3 | Add medicine via autocomplete (e.g. Dolo 650) | Fields auto-fill | |
| 4 | Ensure Reason for Chosen is filled | Required field — cannot be empty | |
| 5 | Click "Save Prescription & Complete" | Toast: "Prescription saved & consultation completed" | |
| 6 | Queue and consultation state | Consultation marked completed, queue token completed, doctor set to available, prescription saved — all in one action | |

### TC-9.8: Complete Without Prescription

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Start another consultation (repeat 9.5) | Consultation view with inline prescription form | |
| 2 | Click "Complete without Rx" | Toast: "Consultation completed (no prescription)" | |
| 3 | Queue state | Consultation marked completed, no prescription created | |

### TC-9.9: Prescription Validation (Incomplete Medicine)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Enter diagnosis, enter medicine name but leave dosage empty | Medicine partially filled | |
| 2 | Click "Save Prescription" | Toast error: "Complete all fields for {medicineName}" | |

---

## TC-10: Patient Dashboard

**Login as: Patient (`john.doe@example.com` / `Patient@123`)**

### TC-10.1: Page Load

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as patient | Redirected to `/patient-dashboard` | |
| 2 | Loading state | "Loading your dashboard..." spinner (full page) | |
| 3 | Dashboard loads | Multiple sections visible: Queue Status, Appointments, Booking, Prescriptions, Notifications | |

### TC-10.2: Live Queue Status Section

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If patient is checked in | Token card(s) shown with: token number, doctor name (or "Assigning doctor..."), room, status badge, estimated wait | |
| 2 | If patient is not checked in | "You are not currently checked into any queue." | |
| 3 | Urgent token | Shows "URGENT" banner in top-right corner (coral) | |

### TC-10.3: Upcoming Appointments Section

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If patient has scheduled appointments | Shows doctor name, date/time, "Cancel" button per appointment | |
| 2 | Only "scheduled" status shown | Cancelled/completed appointments not listed here | |
| 3 | If no upcoming appointments | "No upcoming appointments." | |

### TC-10.4: Cancel Appointment (Patient)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Cancel" on an upcoming appointment | Confirmation modal: "Cancel Appointment" | |
| 2 | Message reads | "Are you sure you want to cancel this appointment? This action cannot be undone." | |
| 3 | Click "Yes, Cancel" | Toast: "Appointment cancelled" | |
| 4 | Appointment disappears from upcoming list | No longer shown | |

### TC-10.5: Book Appointment (Patient Portal)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Locate booking form section | Department dropdown, Doctor dropdown, Date, Time inputs, "Confirm Booking" button | |
| 2 | Department pre-selected | First department auto-selected on load | |
| 3 | Doctor dropdown | "Any Available" default + all doctors listed | |
| 4 | Clear department, submit | Toast error: "Select a department" | |
| 5 | Fill all fields: Outpatient Dept, Dr. Sara Iqbal, tomorrow, 11:00 | Form filled | |
| 6 | Click "Confirm Booking" | Toast: "Appointment booked successfully!" | |
| 7 | Upcoming appointments updates | New appointment appears in the list | |

### TC-10.6: Recent Prescriptions Section

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If prescriptions exist for patient | Shows up to 3 recent prescriptions | |
| 2 | Each prescription shows | Prescription number (RX-...), diagnosis, doctor name, date | |
| 3 | Medicine chips | Shows up to 3 medicine names as chips/badges, then "+N more" if more | |
| 4 | If no prescriptions | "No prescriptions yet." | |

### TC-10.7: Recent Notifications Section

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If notifications exist | Shows up to 5 recent notifications | |
| 2 | Each notification shows | Type (readable label), message snippet (truncated to ~60 chars), channel badge | |
| 3 | Channel badge colors | sent = green (moss), failed = red (coral), other = sand | |
| 4 | If no notifications | "No notifications yet." | |

### TC-10.8: Real-Time Updates (Patient)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Keep patient dashboard open | Visible | |
| 2 | In admin tab, check in John Doe | Patient dashboard should auto-update | |
| 3 | Queue status section updates | New token card appears within 5 seconds | |

---

## TC-11: Notifications Page

### TC-11.1: Admin View

**Login as: Admin**

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Notifications" in sidebar | Loading spinner: "Loading notifications..." | |
| 2 | Page loads | Split layout: notification list on left, detail panel on right | |
| 3 | All notifications visible | Shows notifications for ALL patients (admin sees everything) | |

### TC-11.2: Patient View

**Login as: Patient (`john.doe@example.com`)**

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Notifications" in sidebar | Loading spinner then notification list | |
| 2 | Only own notifications | Patient sees only their own notifications (filtered by patientId) | |

### TC-11.3: Notification List Display

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Each notification item shows | Status badge, channel badge, type label, patient name, timestamp | |
| 2 | Type labels are human-readable | e.g., "Appointment Confirmed", "Doctor Assigned", "Prescription Ready" | |
| 3 | Status badge colors | sent = green, pending = sand, failed = coral | |
| 4 | Channel badges | sms = teal, whatsapp = moss, in_app/system = ink | |

### TC-11.4: Filter by Type

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Filter bar shows | "All" + buttons for each unique notification type found in data | |
| 2 | Click a specific type filter (e.g., "Appointment Confirmed") | Only matching notifications shown | |
| 3 | Page resets to 1 | Pagination resets when filter changes | |
| 4 | Click "All" | All notifications shown again | |

### TC-11.5: Notification Detail Panel

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | No notification selected | Right panel shows "Select a notification to view details" with dashed border | |
| 2 | Click a notification in the list | Item gets highlighted ring (teal); detail panel populates | |
| 3 | Detail shows | Type, patient name, channel badge, status, full message text | |
| 4 | Created timestamp | Formatted date/time shown | |
| 5 | Delivered timestamp | Shown if notification was delivered | |
| 6 | Retry count | Shown if retry count > 0: "{count} / {maxRetries}" | |

### TC-11.6: Retry Failed Notification (Admin Only)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | As admin, select a "failed" notification (if any exist) | Detail panel shows | |
| 2 | "Retry" button visible | Only for admin AND status is "failed" | |
| 3 | Click "Retry" | Toast: "Notification retried" | |
| 4 | As non-admin (patient, doctor, receptionist) | Retry button NOT visible for failed notifications | |

### TC-11.7: Pagination

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If 11+ notifications | Pagination visible (PAGE_SIZE = 10) | |
| 2 | Navigate pages | List updates, selection clears | |

### TC-11.8: Empty State

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If no notifications exist | "No notifications found." | |

---

## TC-12: Prescriptions Page

### TC-12.1: Staff View (Admin/Receptionist/Doctor)

**Login as: Admin**

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Prescriptions" in sidebar | Loading spinner: "Loading prescriptions..." | |
| 2 | Page loads | Split layout: prescription list on left, detail panel on right | |
| 3 | All prescriptions visible | Admin sees all prescriptions | |

### TC-12.2: Patient View

**Login as: Patient**

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "Prescriptions" | Page loads | |
| 2 | Only own prescriptions | Patient sees only their own prescriptions | |

### TC-12.3: Prescription List Display

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Each prescription shows | Prescription number (monospace, RX-...), diagnosis, patient name, doctor name | |
| 2 | Status badge | Shows "active" (green) by default | |
| 3 | Date | Created date shown | |
| 4 | Medicine count | Summary like "3 medicines prescribed" | |

### TC-12.4: Prescription Detail Panel

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | No selection | "Select a prescription to view details" with dashed border | |
| 2 | Click a prescription | Item highlighted; detail panel populates | |
| 3 | Header | Prescription number, diagnosis (large display font), status badge | |
| 4 | Patient and doctor names | Both shown in detail | |
| 5 | Medicines list | Each medicine card shows: name, dosage, frequency, duration, route badge (teal), instructions (italic, if present) | |
| 6 | Treatment notes | Shown if present | |
| 7 | Follow-up section | If follow-up exists: teal background section with date and/or notes | |
| 8 | Timestamps | Created date; updated date only shown if different from created | |

### TC-12.5: Pagination

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If 11+ prescriptions | Pagination visible (PAGE_SIZE = 10) | |
| 2 | Navigate pages | List updates | |

### TC-12.6: Empty State

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | If no prescriptions | "No prescriptions found." | |

---

## TC-13: End-to-End Workflow

This section tests the complete patient consultation journey across multiple roles. **Use two browser windows** (or normal + incognito).

### TC-13.1: Full Consultation Workflow

**Window A: Admin/Receptionist** (`reception@spcms.local`)
**Window B: Doctor** (`arun.rao@spcms.local`)

| # | Step (Actor) | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | (A) Login as receptionist | Lands on Dashboard | |
| 2 | (A) Go to Appointments, book appointment for John Doe with Dr. Arun Rao, today, 14:00 | Toast: "Appointment booked successfully" | |
| 3 | (B) Login as Dr. Arun Rao | Lands on Doctor Dashboard | |
| 4 | (B) Verify availability is "available" | Green button active | |
| 5 | (A) Go to Check-in, check in John Doe for Outpatient Dept | Toast: "Checked in! Token: ..." | |
| 6 | (A) Check-in confirmed | Toast confirms token with Dr. Arun Rao assigned | |
| 7 | (B) Doctor Dashboard auto-updates | John Doe appears in "My Queue" | |
| 8 | (B) Click "Call Next" | Toast: "Consultation started"; active consultation panel appears | |
| 9 | (B) Doctor Dashboard shows | Token status changes to "in_consultation" in "My Patients" | |
| 10 | (B) Enter clinical notes: "Patient has mild fever" | Notes entered | |
| 11 | (B) Click "Complete Consultation" | Toast: "Consultation completed"; prescription form appears | |
| 12 | (B) Doctor Dashboard shows | Token status changes to "completed" in "My Patients" | |
| 13 | (B) Fill prescription: diagnosis "Viral fever", medicine "Paracetamol 500mg, thrice daily, 5 days" | Form filled | |
| 14 | (B) Click "Save Prescription" | Toast: "Prescription created and patient notified" | |
| 15 | Open patient login (`john.doe@example.com`) in new tab | Patient dashboard shows | |
| 16 | Check patient's prescriptions section | The new prescription (RX-...) with "Viral fever" visible | |
| 17 | Check patient's notifications section | Notifications include: appointment_confirmation, doctor_assignment, prescription_ready | |
| 18 | (A) Go to Notifications page | All generated notifications visible for John Doe | |

### TC-13.2: Multiple Patients in Queue

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | (A) Check in 3 patients sequentially for same doctor | 3 tokens created | |
| 2 | (B) Doctor Dashboard shows 3 patients in queue | Ordered by priority then FIFO | |
| 3 | Check estimated wait times | Each successive patient has increasing wait time (multiples of ~10-15 min) | |
| 4 | (B) Process first patient (call, consult, complete, skip Rx) | First patient removed from active queue | |
| 5 | Remaining patients' wait times decrease | Queue positions recalculated | |
| 6 | (B) Process second patient | Queue shrinks further | |

### TC-13.3: Urgent Patient Priority

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | (A) Check in a normal patient first | Token in queue | |
| 2 | (A) Check in an urgent patient second | Urgent token created | |
| 3 | (B) Doctor Dashboard queue | Urgent patient appears BEFORE the normal patient despite being checked in later | |
| 4 | Doctor Dashboard | Urgent token has "urgent" badge and coral ring in "My Patients" | |

---

## TC-14: Real-Time Updates

### TC-14.1: Socket.IO Connection

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Open Doctor Dashboard page | Dashboard visible with "My Patients" section | |
| 2 | Open browser DevTools > Network > WS tab | Socket.IO WebSocket connection visible (or polling transport) | |

### TC-14.2: Cross-Tab Queue Updates

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Tab 1: Doctor Dashboard open (doctor login) | Dashboard visible | |
| 2 | Tab 2: Check in a patient assigned to this doctor (receptionist) | Perform check-in | |
| 3 | Tab 1: Without refreshing | New patient appears in "My Patients" (within 5 seconds) | |

### TC-14.3: Doctor Dashboard Real-Time

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Tab 1: Doctor Dashboard (doctor login) | Queue visible | |
| 2 | Tab 2: Check in a patient for this doctor | Perform check-in | |
| 3 | Tab 1: Without refreshing | New patient appears in "My Queue" | |

### TC-14.4: Patient Dashboard Real-Time

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Tab 1: Patient Dashboard (patient login) | Dashboard visible | |
| 2 | Tab 2: Check in this patient (admin) | Perform check-in | |
| 3 | Tab 1: Without refreshing | Queue status section updates with new token | |

### TC-14.5: Polling Fallback

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Stop the backend Socket.IO (or block WS in DevTools) | Socket connection fails | |
| 2 | Wait 3-5 seconds | App falls back to REST polling (every 5 seconds) | |
| 3 | Make changes in another tab | Updates still appear within polling interval | |

---

## TC-15: Role-Based Access Control

### TC-15.1: URL Direct Access

| # | Step (as Patient) | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as patient | On `/patient-dashboard` | |
| 2 | Manually navigate to `/` (admin dashboard) | Redirected to `/patient-dashboard` (role home) | |
| 3 | Navigate to `/checkin` | Redirected to `/patient-dashboard` | |
| 4 | Navigate to `/patients` | Redirected to `/patient-dashboard` | |
| 5 | Navigate to `/doctors` | Redirected to `/patient-dashboard` | |
| 6 | Navigate to `/doctor-dashboard` | Redirected to `/patient-dashboard` | |
| 7 | Navigate to `/notifications` | Allowed (no RoleGuard, all roles can access) | |
| 8 | Navigate to `/prescriptions` | Allowed (no RoleGuard, all roles can access) | |

### TC-15.2: URL Direct Access (as Doctor)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as doctor | On `/doctor-dashboard` | |
| 2 | Navigate to `/` | Redirected to `/doctor-dashboard` | |
| 3 | Navigate to `/checkin` | Redirected to `/doctor-dashboard` | |
| 4 | Navigate to `/patients` | Redirected to `/doctor-dashboard` | |
| 5 | Navigate to `/doctors` | Redirected to `/doctor-dashboard` | |
| 6 | Navigate to `/appointments` | Allowed (doctors have access) | |
| 7 | Navigate to `/queue-board` | Redirected to `/doctor-dashboard` (page no longer exists) | |
| 8 | Navigate to `/patient-dashboard` | Redirected to `/doctor-dashboard` | |

### TC-15.3: URL Direct Access (as Receptionist)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as receptionist | On `/` (dashboard) | |
| 2 | Navigate to `/doctor-dashboard` | Redirected to `/` | |
| 3 | Navigate to `/patient-dashboard` | Redirected to `/` | |
| 4 | All other routes in sidebar | Accessible | |

### TC-15.4: Wildcard Route

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Navigate to `/nonexistent-page` | Redirected to role's home page | |

---

## TC-16: Error Handling & Edge Cases

### TC-16.1: API Errors

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Stop the backend server while frontend is running | Next API call shows toast error | |
| 2 | Navigate to any page | Error toast appears, page may show loading state or empty state | |
| 3 | Restart backend | Next navigation/refresh loads data normally | |

### TC-16.2: Network Errors

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Open DevTools > Network, set "Offline" | Simulate no network | |
| 2 | Try to perform an action (book appointment, check-in) | Error toast appears | |
| 3 | Go back online | Actions work normally | |

### TC-16.3: Duplicate Prescription Attempt

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Complete a consultation and create a prescription | Prescription saved | |
| 2 | Attempt to create another prescription for the same consultation via API | Should get 409 error (enforced server-side) | |

### TC-16.4: Cancel Already-Cancelled Appointment

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Find a cancelled appointment | No "Cancel" button visible (UI prevents this) | |

### TC-16.5: Start Consultation on Completed Token

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Token already completed | "Call Next" button not shown (only appears for first active queue item) | |

### TC-16.6: Empty Form Submissions

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Check-in with no patient selected | Toast: "Select a patient" | |
| 2 | Book appointment with no date | Toast: "Select a date" | |
| 3 | Prescription with no diagnosis | Toast: "Diagnosis is required" | |
| 4 | Prescription with empty medicines | Toast: "Add at least one medicine" | |

---

## TC-17: Responsive Design & Mobile

### TC-17.1: Mobile Sidebar (< 1024px width)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Resize browser to < 1024px width (or use DevTools mobile emulation) | Sidebar collapses (hidden off-screen) | |
| 2 | Top header bar appears | 56px height header with hamburger menu button | |
| 3 | Click hamburger button | Sidebar slides in from left (with backdrop overlay) | |
| 4 | Click backdrop overlay | Sidebar closes | |
| 5 | Open sidebar, click a nav item | Sidebar auto-closes after navigation | |
| 6 | Check content area | Full width on mobile (no sidebar taking space) | |

### TC-17.2: Desktop Sidebar (>= 1024px width)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | View at >= 1024px width | Sidebar always visible on left (64 width = 256px) | |
| 2 | No hamburger button | Hamburger menu not visible on desktop | |
| 3 | No overlay | No backdrop overlay | |

### TC-17.3: Responsive Grids

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Doctor Dashboard "My Patients" at full width | Queue items laid out in available space | |
| 2 | Doctor Dashboard "My Patients" at ~768px | Items stack or reflow to fit | |
| 3 | Doctor Dashboard "My Patients" at ~480px | Single column, full width | |
| 4 | Doctor cards at full width | 3 columns | |
| 5 | Doctor cards at ~768px | 2 columns | |
| 6 | Doctor cards at ~480px | 1 column | |
| 7 | Dashboard metric cards | 4 columns desktop, 2 on tablet, 1 on mobile | |

### TC-17.4: Forms on Mobile

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Check-in form on mobile | Dropdowns and inputs stack vertically, full width | |
| 2 | Booking form on mobile | Same -- inputs stack, submit button full width | |
| 3 | Prescription form on mobile | Medicine fields stack, add/remove buttons accessible | |

### TC-17.5: Tables on Mobile

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Appointments table on narrow screen | Table may horizontally scroll or overflow | |
| 2 | Patients table on narrow screen | Same -- check usability with horizontal scroll | |

### TC-17.6: Split Layout Pages on Mobile

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Notifications page on mobile | List and detail may stack vertically or require scroll | |
| 2 | Prescriptions page on mobile | Same behavior | |

---

## Known Issues & Observations

These are known behaviors that testers should be aware of (not necessarily bugs):

1. **Duplicate Toaster on Login**: `LoginPage` renders its own `<Toaster>` component in addition to the one in `App.jsx`. This may cause duplicate toast notifications on the login page. (Cosmetic, low priority)

2. **AlertBanner Component Unused**: `AlertBanner.jsx` is defined but not imported in any page. Dead code, not a bug.

3. **No Server-Side Pagination**: All pages fetch the full dataset and paginate client-side. Performance could degrade with very large datasets (thousands of records).

4. **Appointment Data Not Live-Updated**: The Appointments page does not use real-time polling. Data only refreshes after a booking or cancellation action.

5. **Form Not Reset After Booking**: On both the Appointments page and Patient Dashboard, the booking form fields are not explicitly reset after a successful booking. The page re-fetches data but form inputs may retain their values.

6. **SMS/WhatsApp Mocked**: Notification channels for SMS and WhatsApp are currently mocked (log to console only). Only the "system" channel stores notifications that are viewable in the UI.

7. **No Scheduled Notification Processor**: The notification model supports `scheduledFor` field, but there is no background scheduler to process future-scheduled notifications.

8. **Socket.IO Errors Silent**: If Socket.IO connection fails, the app silently falls back to REST polling. There is no user-visible indicator of degraded real-time capability (the "Live" indicator on Doctor Dashboard is always shown).

---

## QA Sign-Off

| Section | Tester | Date | Status |
|---------|--------|------|--------|
| TC-0: Prerequisites | | | |
| TC-1: Login & Auth | | | |
| TC-2: Sidebar & Layout | | | |
| TC-3: Dashboard | | | |
| TC-4: Patients | | | |
| TC-5: Doctors | | | |
| TC-6: Check-In | | | |
| TC-7: Appointments | | | |
| TC-8: Doctor Assignment & Patient Lock | | | |
| TC-9: Doctor Dashboard | | | |
| TC-10: Patient Dashboard | | | |
| TC-11: Notifications | | | |
| TC-12: Prescriptions | | | |
| TC-13: E2E Workflow | | | |
| TC-14: Real-Time | | | |
| TC-15: RBAC | | | |
| TC-16: Error Handling | | | |
| TC-17: Responsive | | | |
