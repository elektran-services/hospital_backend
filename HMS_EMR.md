PART 1: FULL HMS + EMR SYSTEM ARCHITECTURE
1. High-Level Architecture Overview
Architectural Style

Modular Monolith (MVP) → Evolves to Microservices (Enterprise)

API-first design

Event-driven internal communication

Cloud-first, hybrid-ready (for on-prem hospitals)

2. Logical Architecture Layers
Client Layer (Web / Mobile / Tablet)
        ↓
API Gateway
        ↓
Application Layer (Business Services)
        ↓
Domain Layer (Clinical / Billing / Inventory / etc.)
        ↓
Data Layer (SQL + Object Storage)
        ↓
Integration Layer (HL7 / FHIR / External APIs)

3. Frontend Architecture
Web Application

React / Next.js

Role-based UI rendering

Secure JWT session management

Offline caching for unstable networks

Mobile Applications

Flutter / React Native

Nurse station tablet mode

Doctor mobile consultation mode

Patient portal app

Access Roles

Doctor

Nurse

Pharmacist

Lab Scientist

Billing Officer

HMO Officer

Admin

Super Admin

4. Backend Architecture
Core Stack

Node.js (NestJS) or .NET Core or Java Spring Boot

RESTful API + GraphQL (optional)

PostgreSQL (Primary DB)

Redis (Caching / Sessions)

Object storage (S3 compatible)

5. Core Modules (Domain Services)
1. Patient Service

Registration

Demographics

MRN generation

Document storage

Merge duplicates

2. EMR Service

Clinical notes (SOAP)

Diagnoses (ICD-10 support)

Allergies

Vitals tracking

Longitudinal patient record

3. Appointment Service

Scheduling

Doctor availability

Queue management

4. Billing & Finance Service

Tariff engine

Invoice generation

Insurance claims

Payment tracking

5. Pharmacy Service

Drug catalog

Prescription management

Interaction checks

Inventory tracking

6. Laboratory Service

Order management

Sample lifecycle tracking

Result validation

Auto-flag abnormal results

7. Radiology Service

Imaging requests

PACS integration

Report storage

8. Admission (IPD) Service

Bed management

Admission / discharge

Nursing charts

Medication administration record (MAR)

9. Inventory Service

Consumables

Equipment tracking

Reorder levels

10. Reporting & Analytics Service

Financial dashboards

Clinical statistics

Custom report builder

6. Database Architecture
Core Tables (Simplified)

patients

encounters

diagnoses

prescriptions

medications

lab_orders

lab_results

invoices

payments

admissions

beds

staff

roles

audit_logs

Data Design Principles

UUID primary keys

Soft deletes

Audit columns (created_by, updated_by)

Versioning for clinical records

Encrypted sensitive fields

7. Security Architecture

RBAC (Role-Based Access Control)

Field-level data visibility (e.g., HIV status restricted)

TLS 1.3 encryption

AES-256 encryption at rest

2FA for admin roles

Full audit logging

Consent tracking

Compliance targets:

NDPR (Nigeria)

HIPAA-ready architecture

GDPR-ready design

8. Integration Architecture
Standards

HL7

FHIR API support

DICOM (Radiology)

Insurance API integrations

External Integrations

Payment gateways

SMS gateway

Email service

National health insurance APIs (if applicable)

9. Infrastructure Architecture
Cloud Deployment

AWS / Azure / GCP

Kubernetes (Enterprise)

Docker containers

CI/CD pipeline

Availability

Load balancer

Auto-scaling

Daily backups

Disaster recovery region

Offline Mode (Critical for Africa)

Local cache

Sync engine

Conflict resolution strategy

PART 2: PRODUCT REQUIREMENTS DOCUMENT (PRD)
Product Requirements Document (PRD)
1. Product Overview

Product Name: MedCore HMS
Product Type: Hospital Management System with integrated EMR
Target Market: Private hospitals, clinics, diagnostic centers (10–500 beds)
Geography: Nigeria → Expand to West Africa

2. Problem Statement

Hospitals rely on fragmented systems (paper, Excel, standalone billing software). This leads to:

Medical errors

Revenue leakage

Poor reporting

Compliance risks

Slow patient flow

3. Objectives

Centralize patient data.

Automate billing & claims.

Improve clinical documentation.

Reduce revenue leakage.

Ensure regulatory compliance.

Support multi-branch hospital groups.

4. Success Metrics (KPIs)

40% reduction in patient wait time

30% reduction in billing errors

20% revenue increase from reduced leakages

< 2 sec average screen load time

99.5% uptime

5. User Personas
Doctor

Needs quick documentation

Wants medication alerts

Needs access to history instantly

Nurse

Records vitals

Administers medication

Tracks admitted patients

Billing Officer

Generates invoices

Tracks payments

Manages claims

Hospital Admin

Revenue reports

Staff productivity

Inventory oversight

6. Functional Requirements
6.1 Patient Registration

Generate MRN

Capture demographics

Upload documents

Insurance linking

6.2 Consultation

SOAP notes

Diagnosis coding

Prescriptions

Lab ordering

6.3 Laboratory

Track samples

Enter results

Flag abnormal values

Release results

6.4 Pharmacy

Validate prescriptions

Track stock

Deduct inventory

Expiry alerts

6.5 Billing

Auto-generate invoice from services

Apply insurance tariff

Accept multiple payment methods

6.6 Admission

Assign bed

Nursing notes

MAR tracking

7. Non-Functional Requirements

99.5% uptime

<2s API response time

Data encryption at rest

Horizontal scalability

Multi-language support

Mobile responsive

8. MVP Scope (Phase 1 – 6 Months)

Included:

Registration

EMR

Billing

Lab

Pharmacy

Basic reporting

Excluded:

AI decision support

Advanced analytics

Telemedicine

Multi-country tax logic

9. Roadmap
Phase 1 (Months 1–6)

Core HMS + EMR

Phase 2 (Months 7–12)

Mobile app
Insurance integrations
Advanced reporting

Phase 3 (Year 2)

AI analytics
Predictive alerts
Regional expansion

10. Risk Analysis
Risk	Mitigation
Staff resistance	Training program
Data breach	Encryption + audits
Poor internet	Offline sync mode
Regulatory change	Modular compliance layer
11. Monetization Model

SaaS monthly per bed

On-prem license

Custom deployment fee

Transaction fee on payments

Final Executive Summary

This HMS + EMR architecture is:

Modular

Cloud scalable

Compliance-ready

Multi-facility capable

Built for emerging markets


PART 3
BACKEND & DATABASE PRD
Product: HMS + EMR Platform
1. Technical Architecture Overview
1.1 System Style

Phase 1 (MVP):

Modular monolith

API-first

Shared PostgreSQL database

JWT authentication

REST endpoints

Phase 2 (Scalable):

Extract modules into services

Event-driven communication

Read replicas for reporting

2. Backend Architecture
2.1 Application Structure (Next.js App Router)
/app
  /api
    /auth
    /patients
    /encounters
    /appointments
    /billing
    /pharmacy
    /laboratory
    /admissions
    /inventory
    /reports

/lib
  db.ts
  auth.ts
  rbac.ts
  audit.ts

/modules
  patient
  emr
  billing
  pharmacy
  lab
  admission

2.2 Core Backend Responsibilities

Authentication & Authorization

Business logic validation

Data persistence

Role-based access control (RBAC)

Audit logging

API exposure

Transaction integrity

3. Functional Backend Requirements
3.1 Authentication & Authorization
Requirements:

JWT-based auth

Refresh tokens

Role-based access

Permission matrix

2FA (Admin optional)

Roles:

SUPER_ADMIN

HOSPITAL_ADMIN

DOCTOR

NURSE

PHARMACIST

LAB_TECH

BILLING_OFFICER

RECEPTIONIST

Acceptance Criteria:

Unauthorized users cannot access restricted endpoints.

Sensitive endpoints require explicit permission.

3.2 Patient Module (Backend)
Functional Requirements:

Create patient (MRN auto-generated)

Update demographics

Merge duplicates

Soft delete

Search by phone / name / MRN

Attach documents

Constraints:

MRN must be unique per facility

Phone number validation required

3.3 EMR Module
Functional Requirements:

Create encounter

Update encounter

Add SOAP notes

Add diagnosis (ICD-10)

Add vitals

Upload attachments

Lock encounter after finalization

Rules:

Only doctor can finalize encounter

Edits after finalization create version history

3.4 Appointment Module

Create appointment

Assign doctor

Reschedule

Cancel

Track status (SCHEDULED, COMPLETED, NO_SHOW)

3.5 Billing Module

Generate invoice from services

Auto-calculate totals

Apply insurance coverage

Record payments

Partial payment support

Refund handling

Constraints:

Invoice immutable after payment

All financial actions logged

3.6 Pharmacy Module

Create medication catalog

Manage stock

Dispense prescription

Track batch number

Expiry alert

Constraints:

Cannot dispense if stock < requested

Controlled drugs require pharmacist role

3.7 Laboratory Module

Create lab order

Track sample lifecycle

Enter results

Validate result

Auto-flag abnormal ranges

3.8 Admission Module (IPD)

Admit patient

Assign bed

Transfer bed

Discharge

Track stay duration

4. Non-Functional Requirements
Requirement	Target
API response time	< 2 seconds
Uptime	99.5%
DB consistency	ACID compliance
Audit coverage	100% of mutations
Backup frequency	Daily
Encryption	AES-256 at rest
5. Database PRD (PostgreSQL)
5.1 Database Design Principles

UUID primary keys

Soft deletes (deleted_at)

Timestamps (created_at, updated_at)

Foreign key constraints enforced

Index frequently queried columns

Transaction usage for financial operations

JSONB for flexible clinical notes

6. Core Database Schema (High-Level)
6.1 Facilities
facilities
- id (uuid, pk)
- name
- address
- phone
- created_at

6.2 Users
users
- id (uuid, pk)
- facility_id (fk)
- email (unique)
- password_hash
- role
- is_active
- created_at

6.3 Patients
patients
- id (uuid, pk)
- facility_id (fk)
- mrn (unique per facility)
- first_name
- last_name
- gender
- date_of_birth
- phone
- address
- blood_group
- created_at
- deleted_at


Indexes:

(facility_id, mrn)

phone

last_name

6.4 Encounters
encounters
- id (uuid, pk)
- patient_id (fk)
- doctor_id (fk)
- encounter_type (IN_PERSON | TELEMEDICINE)
- status (OPEN | FINALIZED)
- started_at
- ended_at
- version
- created_at

6.5 Clinical Notes
clinical_notes
- id (uuid)
- encounter_id (fk)
- soap_json (jsonb)
- created_by
- version
- created_at

6.6 Diagnoses
diagnoses
- id
- encounter_id
- icd_code
- description
- created_at

6.7 Prescriptions
prescriptions
- id
- encounter_id
- medication_id
- dosage
- frequency
- duration
- status
- created_at

6.8 Medications
medications
- id
- name
- generic_name
- unit
- price
- is_controlled

6.9 Inventory Batches
inventory_batches
- id
- medication_id
- batch_number
- quantity
- expiry_date

6.10 Invoices
invoices
- id
- patient_id
- encounter_id
- total_amount
- paid_amount
- status (UNPAID | PARTIAL | PAID)
- created_at

6.11 Payments
payments
- id
- invoice_id
- amount
- method
- transaction_reference
- created_at

6.12 Audit Logs
audit_logs
- id
- user_id
- action
- entity_type
- entity_id
- changes (jsonb)
- created_at

7. Data Integrity Requirements

Foreign keys enforced

Financial operations wrapped in transactions

No cascade deletes on financial records

Soft delete for clinical records

Immutable financial history

8. Security Requirements

Password hashing (bcrypt / argon2)

Encrypted backups

Field-level encryption for:

HIV status

Sensitive diagnoses

Audit logging on:

Patient updates

Billing changes

Clinical edits

9. Scalability Strategy

Phase 1:

Single PostgreSQL instance

Vertical scaling

Phase 2:

Read replicas

Partition encounters table by year

Redis caching for frequent queries

10. Migration & Versioning

Use Prisma / Drizzle / TypeORM migrations

Maintain schema version table

Backward compatible migrations only

11. Acceptance Criteria

The backend is complete when:

All modules expose REST APIs

100% role enforcement

100% financial transaction integrity

Encounter lifecycle works end-to-end

No orphan records possible

Full audit trail functional


PART 4
FRONTEND PRD
Product: HMS + EMR Platform
1. Frontend Architecture Overview
1.1 Technology Stack

Framework: React (Next.js App Router)

Language: TypeScript

Styling: Tailwind CSS

State Management: React Context or Zustand

HTTP Client: TanStack Query (React Query)

Authentication: JWT + Refresh Tokens

UI Components: Custom components + Shadcn/UI

2. Frontend Architecture Principles

Component-based design

Role-based UI rendering

Responsive design (mobile-first)

Performance optimization

Secure session management

Offline support (basic)

3. Functional Requirements
3.1 Authentication Module
Pages:

/login

/register (admin only)

/forgot-password

/reset-password

Features:

Email/password login

Remember me

Role-based redirection after login

Session timeout handling

3.2 Dashboard Module
Pages:

/dashboard

Features:

Role-specific widgets

Quick stats

Recent activity

Alerts

3.3 Patient Module
Pages:

/patients

/patients/new

/patients/[id]

/patients/[id]/edit

Features:

Search patients

Create patient

View patient profile

Edit demographics

Merge duplicates

3.4 EMR Module
Pages:

/encounters/[id]

/encounters/[id]/edit

Features:

View SOAP notes

Add SOAP notes

View vitals

Add vitals

View diagnoses

Add diagnoses

Upload attachments

Finalize encounter

3.5 Appointment Module
Pages:

/appointments

/appointments/new

Features:

Calendar view

List view

Create appointment

Reschedule

Cancel

3.6 Billing Module
Pages:

/billing

/billing/[id]

Features:

Generate invoice

View invoice

Record payment

Print receipt

3.7 Pharmacy Module
Pages:

/pharmacy

/pharmacy/dispense

Features:

View prescriptions

Dispense medication

Track stock

3.8 Laboratory Module
Pages:

/laboratory

/laboratory/orders

Features:

View lab orders

Enter results

Validate results

3.9 Admission Module
Pages:

/admissions

/admissions/new

Features:

Admit patient

Assign bed

View stay

Discharge

3.10 Reporting Module
Pages:

/reports

/reports/financial

/reports/clinical

Features:

Generate reports

Export to PDF/Excel

Filter by date

4. Non-Functional Requirements
Requirement	Target
Page load time	< 2 seconds
API response handling	< 3 seconds
Offline support	Basic caching
Responsive design	All devices
Accessibility	WCAG AA
Error handling	Graceful degradation
5. Component Architecture
/components
  /ui
    Button.tsx
    Input.tsx
    Modal.tsx
    Table.tsx
  /layout
    Navbar.tsx
    Sidebar.tsx
    RoleGuard.tsx
  /features
    auth
    patients
    emr
    billing
    pharmacy
    lab
    admission
    reports

6. State Management

Global State:

User authentication

Role

Facility

Local State:

Form data

Modal visibility

Table filters

7. API Integration Strategy

Use TanStack Query for:

GET requests

POST requests

Mutations

Error handling

Caching

Invalidation

8. Security Requirements

No sensitive data in client-side code

JWT stored in HttpOnly cookies

Role-based UI rendering

No direct API access from client

9. Offline Support (Basic)

Cache patient list

Cache encounter list

Sync on reconnect

10. Acceptance Criteria

The frontend is complete when:

All pages load within 2 seconds

Role-based access works correctly

All forms validate input

Responsive design works on mobile/tablet/desktop

No client-side secrets exposed

Error handling is graceful


PART 5
DEPLOYMENT & OPERATIONS PRD
Product: HMS + EMR Platform
1. Deployment Architecture Overview
1.1 Deployment Strategy

Phase 1 (MVP):

Single cloud region

Docker containers

PostgreSQL + Redis

Manual deployment

Phase 2 (Scalable):

Multi-region deployment

Kubernetes

Auto-scaling

CI/CD pipeline

Disaster recovery

2. Infrastructure Requirements
2.1 Cloud Provider

AWS / Azure / GCP

Must support:

Managed PostgreSQL

Managed Redis

Object storage

Load balancing

Auto-scaling

2.2 Compute Requirements

Phase 1:

2 vCPU

4 GB RAM

Phase 2:

Horizontal scaling

2.3 Database Requirements

Managed PostgreSQL

Daily backups

Point-in-time recovery

Encryption at rest

2.4 Storage Requirements

Object storage (S3-compatible) for:

Patient documents

Report exports

2.5 Networking Requirements

TLS 1.3 encryption

Firewall rules

VPN access for admins

3. Deployment Process (Phase 1)
Step 1: Provision Infrastructure

Create VPC

Create PostgreSQL instance

Create Redis instance

Create object storage bucket

Step 2: Containerize Application

Dockerfile for backend

Dockerfile for frontend

Docker Compose for local dev

Step 3: Deploy Containers

Run containers

Configure environment variables

Set up domain

Step 4: Configure TLS

Obtain SSL certificate

Configure HTTPS

Step 5: Database Setup

Run migrations

Seed initial data

Step 6: Testing

End-to-end testing

Security audit

Performance testing

4. Operations & Monitoring
4.1 Monitoring Requirements

Uptime monitoring

API response time

Error rates

Database performance

Container health

4.2 Alerting Requirements

Alert on:

5xx errors

High latency

Database downtime

Disk space low

4.3 Backup & Recovery

Daily automated backups

Weekly full backups

Disaster recovery plan

Recovery time objective (RTO): < 4 hours

Recovery point objective (RPO): < 24 hours

5. Security Requirements

TLS 1.3 for all traffic

AES-256 encryption at rest

Regular security audits

Penetration testing

Role-based access control

Audit logging

6. Scalability Requirements

Phase 1:

Vertical scaling

Phase 2:

Horizontal scaling

Load balancing

Database read replicas

7. Acceptance Criteria

The deployment is complete when:

All services running

TLS configured

Backups functional

Monitoring in place

Security audit passed

Performance targets met


PART 6
TESTING PRD
Product: HMS + EMR Platform
1. Testing Strategy Overview
1.1 Testing Pyramid

Unit Tests (60%)

Integration Tests (30%)

E2E Tests (10%)

1.2 Testing Environments

Local: Docker Compose

Staging: Pre-production

Production: Live

2. Unit Testing
2.1 Backend Unit Tests
Test Files:

/tests/unit/patient.test.ts

/tests/unit/emr.test.ts

/tests/unit/billing.test.ts

/tests/unit/auth.test.ts

Test Cases:

Patient creation with validation

MRN uniqueness

Encounter lifecycle

Billing calculations

Role-based access

2.2 Frontend Unit Tests
Test Files:

/tests/unit/auth.test.tsx

/tests/unit/patient-form.test.tsx

/tests/unit/dashboard.test.tsx

Test Cases:

Component rendering

Form validation

Role-based UI rendering

2.3 Tools

Backend: Vitest

Frontend: Vitest + React Testing Library

3. Integration Testing
3.1 Backend Integration Tests
Test Files:

/tests/integration/patient-api.test.ts

/tests/integration/emr-api.test.ts

/tests/integration/billing-api.test.ts

Test Cases:

API endpoint functionality

Database interactions

Transaction integrity

3.2 Frontend Integration Tests
Test Files:

/tests/integration/auth.test.tsx

/tests/integration/patient-flow.test.tsx

/tests/integration/billing-flow.test.tsx

Test Cases:

User flows

API calls

State management

4. End-to-End (E2E) Testing
4.1 E2E Test Scenarios
Scenario 1: Patient Registration → Consultation → Billing

Register patient

Create encounter

Add SOAP notes

Generate invoice

Record payment

Scenario 2: Pharmacy Dispensing

View prescription

Dispense medication

Update inventory

Scenario 3: Laboratory Workflow

Create lab order

Enter results

Validate results

Scenario 4: Role-Based Access

Doctor cannot access billing

Nurse cannot finalize encounter

Admin can access all modules

4.2 Tools

Cypress / Playwright

5. Performance Testing
5.1 Load Testing

Test concurrent users

Measure API response times

Identify bottlenecks

5.2 Stress Testing

Push system beyond limits

Test auto-scaling

6. Security Testing
6.1 Vulnerability Scanning

OWASP Top 10

Penetration testing

6.2 Audit Testing

Verify audit logs capture all actions

Test role permissions

7. Acceptance Criteria

Unit test coverage: > 80%

Integration test coverage: > 70%

E2E scenarios pass

Performance targets met

Security vulnerabilities < 3

