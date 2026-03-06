# Smart Patient Consultation Management System (SPCMS)

## 1. Product Overview

The Smart Patient Consultation Management System (SPCMS) is a digital platform designed to improve outpatient consultation operations in hospitals by managing appointments, patient queues, doctor availability, and patient-to-doctor assignment in one centralized system.

Many hospitals still depend on manual coordination for outpatient consultations. This creates long patient waiting times, overloaded doctors, uneven queue distribution, poor visibility into consultation progress, and administrative inefficiencies at reception. SPCMS addresses these issues with a responsive web-based system for patients, doctors, receptionists, and administrators.

The product focuses on outpatient consultation management only. It does not cover billing, pharmacy, laboratory, inventory, inpatient care, or telemedicine in the initial release.

## 2. Problem Statement

Hospitals often face the following outpatient consultation problems:

- Manual appointment scheduling causes conflicts, missed bookings, and poor slot utilization.
- Walk-in patient management is inconsistent and difficult to coordinate in real time.
- Doctor workloads are uneven, with some doctors overloaded while others remain underutilized.
- Patients lack transparency on queue position and estimated waiting time.
- Receptionists must coordinate patient flow manually, which slows operations and increases errors.
- There is no centralized operational view for administration to monitor queue efficiency, doctor utilization, and consultation throughput.

These gaps reduce patient satisfaction, waste staff time, and limit the hospital's ability to optimize outpatient operations.

## 3. Product Vision

Create a smart, transparent, and efficient outpatient consultation workflow that reduces waiting time, balances doctor workload, and gives patients and hospital staff real-time visibility into the consultation process.

## 4. Product Goals

The system aims to:

- Reduce patient waiting time during outpatient consultations.
- Improve doctor workload distribution across available doctors.
- Digitize and simplify appointment scheduling and check-in.
- Provide real-time queue visibility for patients and staff.
- Improve hospital operational efficiency at reception and consultation points.
- Increase transparency and predictability in the consultation journey.

## 5. Success Metrics

The initial product will be considered successful if, within 3 months of pilot deployment, it achieves:

- 30% reduction in average patient waiting time.
- 20% improvement in doctor workload balance.
- 25% reduction in average patient check-in handling time.
- Improved patient satisfaction scores related to waiting and queue transparency.
- Reduced no-show and unmanaged queue disruption rates.

## 6. Product Scope

### In Scope for MVP

- Patient registration and profile management
- Appointment booking, cancellation, and rescheduling
- Doctor schedule and availability management
- Receptionist-assisted and self-service check-in
- Queue token generation
- Real-time queue monitoring
- Estimated waiting time display
- Smart patient-to-doctor assignment
- Doctor queue dashboard
- Consultation status updates
- Notifications and reminders
- Admin reporting and audit logs

### Out of Scope for MVP

- Billing and insurance workflows
- Pharmacy workflows
- Laboratory workflows
- Inpatient management
- Native mobile apps
- Deep EMR/EHR integration
- Telemedicine
- AI diagnosis or medical decision support

## 7. Business Assumptions

- The MVP will be deployed first in one hospital outpatient department.
- The hospital supports web-based digital systems and has stable local infrastructure.
- Patients can register before booking appointments.
- Doctors or authorized staff will maintain doctor schedules and availability.
- Receptionists will manage assisted check-ins and urgent queue adjustments.
- Future expansion to multiple departments and branches is expected after MVP validation.

## 8. Stakeholders

### Primary Stakeholders

- Hospital Administration
- Doctors
- Receptionists
- Patients

### Secondary Stakeholders

- Hospital IT Staff
- Healthcare Operations Managers
- Department Heads

## 9. User Roles and Actors

### Patient

Patients can:

- Register and manage their profile
- Book appointments
- Choose a doctor or specialization
- Reschedule or cancel appointments
- Check in on arrival
- View queue position and estimated wait time
- Receive appointment and queue notifications

### Doctor

Doctors can:

- View their daily consultation queue
- Update their availability status
- Start and complete consultations
- View assigned and transferred patients
- Receive alerts when a patient is assigned

### Receptionist

Receptionists can:

- Register or verify patients
- Book appointments on behalf of patients
- Check in appointment patients and walk-ins
- Generate queue tokens
- Mark urgent cases
- Monitor live queues and waiting area flow

### Administrator

Administrators can:

- Manage users and roles
- Configure doctor profiles and schedules
- Set queue and assignment rules
- Monitor dashboards and reports
- Review audit logs and operational events

## 10. Product Decisions and Clarified Assumptions

To make the PRD implementation-ready, the following decisions are assumed for MVP:

- The system is a responsive web application for both staff and patients.
- Patients use a mobile-friendly web portal rather than a native app.
- Appointment visits use fixed time slots.
- Walk-in visits use token-based queueing.
- Patients may select a specific doctor or only a specialization.
- If a doctor is not chosen, the system auto-assigns a suitable doctor.
- Reassignment is allowed before consultation starts if it reduces waiting time and keeps specialization aligned.
- Urgent patients may be prioritized by receptionists or doctors.
- Queue ordering uses a hybrid model: appointment patients are prioritized near their scheduled time while walk-ins fill open capacity.
- Doctors may mark themselves as available, busy, on break, offline, or overrun.
- Notifications are delivered through SMS, email, and hospital display boards in the MVP.
- Check-in may happen at reception or self-service kiosk using appointment ID, QR code, or phone number.

## 11. Core User Experience

### Patient Journey

1. Patient registers or is registered by staff.
2. Patient books an appointment with a doctor or specialization.
3. System sends appointment confirmation and reminder.
4. Patient arrives and checks in.
5. System generates queue token and shows expected wait time.
6. Patient receives notification when consultation is approaching.
7. Doctor begins consultation.
8. Consultation completes and the system updates the queue.

### Walk-In Journey

1. Walk-in patient registers or is identified by staff.
2. Receptionist records consultation need or specialization.
3. System evaluates eligible doctors and live workload.
4. Queue token is generated.
5. Patient is assigned to the doctor with the lowest predicted wait among eligible doctors.
6. Queue and notifications update in real time.

## 12. Functional Modules

### 12.1 Appointment Management Module

#### Objective

Enable efficient pre-visit scheduling while preventing booking conflicts and improving consultation slot usage.

#### Features

- Patient registration and identity verification
- Doctor and specialization search
- Doctor schedule management
- Fixed-slot appointment booking
- Smart slot allocation based on availability
- Appointment confirmation
- Appointment reminders
- Appointment rescheduling
- Appointment cancellation
- Slot conflict prevention
- Appointment history tracking

#### Business Rules

- A patient may book by doctor or specialization.
- The system must prevent overlapping bookings for the same doctor and slot.
- Rescheduling and cancellation are allowed within configurable policy windows.
- Appointment reminders are sent before consultation time.

### 12.2 Queue Management Module

#### Objective

Digitally manage patient waiting flow and provide transparent, real-time queue visibility.

#### Features

- Patient check-in
- Queue token generation
- Live queue visualization for staff and patients
- Estimated waiting time calculation
- Queue position updates
- Walk-in handling
- Appointment patient queue entry
- Urgent patient prioritization
- No-show handling
- Queue board display for waiting areas

#### Business Rules

- Appointment patients are prioritized near their scheduled consultation time.
- Walk-ins fill available capacity between scheduled visits.
- Queue positions update automatically when statuses change.
- No-shows lose active priority after a configurable grace period.

### 12.3 Doctor Assignment Module

#### Objective

Assign patients to the most suitable available doctor to reduce waiting time and balance doctor utilization.

#### Features

- Doctor availability detection
- Dynamic doctor assignment
- Queue balancing
- Reassignment before consultation
- Doctor notification on assignment
- Patient transfer support
- Assignment event logging

#### Assignment Criteria

- Doctor specialization match
- Doctor availability state
- Estimated completion time
- Current queue length and workload
- Patient appointment preference
- Urgency level

#### Assignment Rules

- Scheduled patients should remain with their chosen doctor unless reassignment produces a meaningful wait-time reduction.
- Walk-in patients should be assigned to the eligible doctor with the lowest predicted wait.
- Doctors marked offline or on break must not receive new patients.
- Urgent patients may be promoted within the queue but must not interrupt an active consultation.
- Reassignment thresholds must be configurable by administration.

### 12.4 Doctor Dashboard Module

#### Objective

Provide doctors with a clear operational view of their assigned patients and consultation status.

#### Features

- Daily queue view
- Current patient details
- Next patient preview
- Availability status controls
- Start consultation action
- Complete consultation action
- Patient transfer request
- Queue delay indication

### 12.5 Receptionist Dashboard Module

#### Objective

Support fast front-desk operations and live patient flow management.

#### Features

- Patient search and registration
- Appointment booking assistance
- Appointment verification
- Check-in processing
- Walk-in intake
- Queue monitoring
- Urgent case marking
- Missed/no-show handling

### 12.6 Administrator Module

#### Objective

Enable configuration, governance, monitoring, and reporting.

#### Features

- User and role management
- Doctor profile and specialization management
- Doctor schedule templates
- Queue policy configuration
- Assignment rule configuration
- Holiday and closure setup
- Reporting dashboard
- Audit log review
- Export tools

## 13. Detailed System Workflow

### Step 1: Registration

The patient creates a profile or is registered by staff.

### Step 2: Appointment Booking

The patient books an available consultation slot with a selected doctor or specialization.

### Step 3: Reminder and Pre-Visit Updates

The system sends reminders and allows rescheduling or cancellation according to policy.

### Step 4: Check-In

Upon arrival, the patient checks in via reception or kiosk.

### Step 5: Queue Entry

The patient receives a queue token and enters the appropriate live queue.

### Step 6: Doctor Assignment or Reassignment

The system validates assignment using doctor specialization, current workload, and availability.

### Step 7: Queue Monitoring

Patients and staff monitor real-time queue position and estimated wait time.

### Step 8: Consultation Start

The doctor calls the next patient and marks the consultation as in progress.

### Step 9: Consultation Completion

The doctor marks the consultation as completed. The system updates the queue and notifies the next patient.

## 14. Functional Requirements

### 14.1 User Management

- The system must support secure user login.
- The system must support role-based access control.
- The system must restrict features and data by role.
- The system must log critical user actions.

### 14.2 Patient Management

- The system must allow patient registration and profile updates.
- The system must store patient contact information and appointment history.
- The system must support patient lookup by identifier or contact details.

### 14.3 Appointment Scheduling

- Patients must be able to book appointments online or through staff.
- The system must show available doctors and time slots.
- The system must prevent overlapping appointments.
- The system must allow appointment cancellation and rescheduling.
- The system must send appointment confirmations.

### 14.4 Check-In and Queueing

- The system must support check-in for booked patients and walk-ins.
- The system must generate a queue token upon successful check-in.
- The system must update queue position automatically.
- The system must display estimated waiting time.
- The system must support urgent queue prioritization.

### 14.5 Doctor Assignment

- The system must assign patients based on doctor specialization and availability.
- The system must balance workload across eligible doctors.
- The system must allow reassignment when wait-time reduction criteria are met.
- The system must prevent assignment to unavailable doctors.

### 14.6 Doctor Operations

- Doctors must be able to see their queue in real time.
- Doctors must be able to update their availability.
- Doctors must be able to mark consultations as started and completed.
- Doctors must be able to transfer patients when necessary.

### 14.7 Notifications

- Patients must receive appointment confirmation notifications.
- Patients must receive reminders before consultation time.
- Patients must be notified when their consultation is approaching.
- Doctors must receive new assignment notifications.

### 14.8 Reporting and Audit

- Administrators must be able to view waiting-time and utilization reports.
- Administrators must be able to export operational data.
- The system must maintain an audit log for sensitive and workflow-critical actions.

## 15. Non-Functional Requirements

### Performance

- The MVP should support at least 300 concurrent users.
- Queue updates should propagate within 2 seconds under normal load.
- Appointment booking and check-in actions should complete quickly enough for front-desk use.

### Reliability

- The system must preserve accurate appointment, queue, and consultation state.
- Queue transitions must be transaction-safe.
- The system should support backup and recovery procedures.

### Usability

- Patient interfaces must be simple and mobile-friendly.
- Staff interfaces must minimize clicks for common tasks.
- Queue information must be easy to understand in real time.

### Security

- The system must protect patient data using authentication and authorization.
- Passwords must be securely hashed.
- Access must follow least-privilege principles.
- Sensitive actions must be logged.
- Sessions should expire after inactivity.

### Scalability

- The architecture should support expansion to multiple departments.
- The platform should support future integrations without a full redesign.

### Observability

- The system should maintain application logs, audit logs, and error tracking.
- Administrators or IT staff should be able to identify assignment or queue failures quickly.

## 16. Data Requirements

### Patient Entity

- Patient ID
- Hospital or medical record number
- Full name
- Date of birth
- Gender
- Contact information
- Appointment history
- Priority or urgent flag

### Doctor Entity

- Doctor ID
- Full name
- Specialization
- Availability schedule
- Current status
- Room or consultation location
- Queue threshold settings

### Appointment Entity

- Appointment ID
- Patient ID
- Doctor ID
- Specialization
- Slot start time
- Slot end time
- Appointment status
- Booking source

### Check-In Entity

- Check-in ID
- Patient ID
- Appointment ID if available
- Arrival time
- Check-in method
- Receptionist ID

### Queue Token Entity

- Token ID
- Token number
- Patient ID
- Assigned doctor ID
- Queue position
- Priority level
- Estimated waiting time
- Queue status

### Consultation Entity

- Consultation ID
- Patient ID
- Doctor ID
- Start time
- End time
- Consultation status
- Transfer reason if applicable

### Notification Entity

- Notification ID
- Patient ID
- Message type
- Delivery channel
- Delivery status
- Sent timestamp

### Audit Log Entity

- Audit log ID
- Actor ID
- Actor role
- Action type
- Entity type
- Entity ID
- Timestamp

## 17. Status Model

### Appointment Statuses

- scheduled
- checked-in
- cancelled
- rescheduled
- no-show
- completed

### Queue Statuses

- waiting
- assigned
- called
- in consultation
- transferred
- completed
- missed

### Doctor Availability Statuses

- available
- busy
- on break
- offline
- overrun

## 18. Reporting Requirements

The admin reporting dashboard should include:

- Average waiting time by day, hour, doctor, and department
- Queue length trends
- Doctor utilization and load distribution
- Number of completed consultations
- Reassignment frequency
- No-show and cancellation rates
- Average check-in time
- Notification delivery success rate

## 19. Risks and Mitigation

### Risk: Doctors do not update availability consistently

Mitigation: Provide simple one-click availability controls and admin override capability.

### Risk: Queue fairness concerns from patients or staff

Mitigation: Use transparent queue rules, clear waiting-time estimates, and logged urgent overrides.

### Risk: Poor internet connectivity affects queue updates

Mitigation: Build retry logic, local resilience, and lightweight refresh fallback.

### Risk: Inaccurate waiting-time estimates reduce trust

Mitigation: Start with rule-based estimates and improve with historical consultation data.

### Risk: Staff adoption is slow

Mitigation: Design streamlined receptionist workflows and provide training materials.

### Risk: Integration complexity delays rollout

Mitigation: Keep the MVP standalone with clean APIs for future integration.

## 20. Constraints

- Limited hospital IT infrastructure may affect deployment options.
- Dependence on internet and local network quality may affect real-time operations.
- Hospital staff may require onboarding and basic system training.
- Existing hospital systems may not provide easy integration access.

## 21. Recommended Technology Direction

This PRD does not lock implementation, but the recommended technical direction is:

- Frontend: responsive web application for patients and staff
- Backend: API-based service architecture
- Database: relational database for core hospital workflow records
- Realtime updates: WebSocket-based queue refresh
- Notifications: SMS and email provider integration
- Hosting: containerized deployment with monitoring and backups

## 22. Delivery Roadmap

### Phase 1: Discovery and Validation

- Finalize business rules
- Confirm queue and reassignment policies
- Validate workflows with hospital stakeholders
- Establish baseline metrics

### Phase 2: System Design

- Define architecture
- Design database schema
- Define APIs and permission model
- Document assignment logic

### Phase 3: Core Platform Setup

- Authentication and RBAC
- Environment and deployment setup
- Shared UI and core services
- Audit and logging foundation

### Phase 4: Appointment Module Delivery

- Registration
- Doctor schedules
- Slot booking
- Reschedule and cancellation
- Reminder notifications

### Phase 5: Queue and Check-In Delivery

- Check-in workflow
- Token generation
- Queue display
- Wait-time estimation
- No-show and urgent handling

### Phase 6: Doctor Assignment Delivery

- Availability state tracking
- Assignment engine
- Reassignment logic
- Doctor notifications

### Phase 7: Dashboards and Reporting

- Doctor dashboard
- Receptionist dashboard
- Admin reporting
- Audit visibility

### Phase 8: Testing and Pilot Rollout

- Unit and integration testing
- User acceptance testing
- Staff training
- Pilot in one outpatient department

### Phase 9: Post-Pilot Improvement

- Tune assignment thresholds
- Improve estimated waiting time accuracy
- Expand to more departments
- Prepare external integrations

## 23. Release Strategy

### Release 1

- One outpatient department
- Responsive patient and staff web access
- Appointment scheduling
- Check-in and queue management
- Smart doctor assignment
- Basic reporting

### Release 2

- Multiple departments
- Stronger analytics
- Better kiosk support
- More notification channels
- Initial hospital system integrations

### Release 3

- Predictive waiting-time models
- Smarter capacity planning
- Multi-branch support
- Advanced operational insights

## 24. Acceptance Criteria for MVP

The MVP is acceptable when:

- Patients can successfully register, book, reschedule, cancel, and check in.
- Receptionists can process booked patients and walk-ins efficiently.
- Doctors can manage availability and consultation status.
- The system generates and maintains an accurate real-time queue.
- The assignment engine distributes patients according to defined rules.
- Patients receive confirmation and queue notifications.
- Admins can view operational reports and audit logs.
- Pilot users can complete the end-to-end consultation workflow without manual fallback for standard cases.

## 25. Summary

SPCMS is an outpatient workflow optimization platform intended to reduce waiting times, improve queue transparency, and balance doctor utilization. The MVP is centered on appointments, check-in, live queueing, doctor assignment, and operational visibility. The product is designed to start with one department and scale over time into a broader hospital outpatient management platform.
