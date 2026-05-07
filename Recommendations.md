PRODUCT REQUIREMENTS DOCUMENT (PRD)
Product Name: HMS

Multi-Tenant Hospital Telemedicine & Management SaaS Platform

1. PURPOSE & VISION
1.1 Purpose

To build a scalable, secure, multi-tenant SaaS platform that enables hospitals to deliver:

Remote doctor–patient consultations (telemedicine)

Appointment booking (virtual and physical)

Branch-based hospital operations

Centralized administrative oversight

The platform must support single hospitals and hospital chains under a unified operational model.

1.2 Vision

To become a digital backbone for hospitals, enabling accessible healthcare delivery through mobile-first patient and doctor experiences, while maintaining enterprise-grade administration, security, and compliance.

2. SCOPE
In Scope

Multi-tenant hospital onboarding

Branch-based hospital structure (mandatory ≥1 branch)

Web-based administration (Super Admin & Branch Manager)

Mobile applications for Doctors and Patients

Telemedicine (video/audio)

Appointment management

Role-based access control (RBAC)

Secure medical data handling

Out of Scope (Initial Release)

Insurance claim processing

Pharmacy inventory systems

AI diagnostics (future extension)

Government health integrations

3. TARGET USERS & ROLES
3.1 User Roles
Role:	Platform Access
Super Admin:	Web dashboard
Branch Manager:	Web dashboard
Doctor:	Mobile app
Medical Staff:	Web (optional, later phase)
Patient:	Mobile app
4. HIGH-LEVEL SYSTEM OVERVIEW
4.1 Multi-Tenancy Model

One hospital = one tenant

Each tenant has one or more branches

All data is isolated per tenant

Branches scope operational data

4.2 Core Platforms

Web Application: Administration

Mobile Application: Doctors & Patients

Backend API: Node.js (TypeScript)

Database: PostgreSQL (primary system of record)

5. ROLE DEFINITIONS & FEATURES
5.1 SUPER ADMIN (Hospital Head Office)
Purpose

Tenant-wide oversight and configuration.

Key Features
Hospital Management

View and edit hospital profile

Manage subscription and usage

Configure hospital-wide settings

Branch Management

Create, edit, activate, deactivate branches

View all branches (including default branch)

Assign Branch Managers

User Management

Create and manage:

Branch Managers

Doctors

Medical Staff

Assign users to branches

Activate/suspend users

Medical Services

Create hospital-wide service catalog

Define pricing

Enable/disable services per branch

Configure telemedicine availability

Appointment Oversight

View appointments across all branches

Monitor appointment status

Access consultation summaries

Reporting & Analytics

Branch performance reports

Doctor utilization

Appointment trends

Security & Compliance

View audit logs

Enforce security policies

Manage access controls

5.2 BRANCH MANAGER
Purpose

Operational management of a single branch.

Key Features

View branch profile (read-only)

Manage branch schedules and working hours

Manage doctors and staff within branch

Configure doctor availability

View, reschedule, and assign appointments

Monitor telemedicine sessions

Access branch-level reports

Restrictions

Cannot see other branches

Cannot manage hospital-wide settings

Cannot view subscription or billing

5.3 DOCTOR (Mobile App)
Key Features

Secure authentication

View assigned branch

Set availability schedule

View upcoming appointments

Join telemedicine sessions

Access assigned patient records

Create consultation notes

Issue prescriptions

Receive push notifications

5.4 PATIENT (Mobile App)
Key Features

Account registration and login

Select hospital and branch

Browse doctors and specialties

Book virtual or physical appointments

Join virtual consultations

View medical history and prescriptions

Upload documents

Receive appointment reminders

Rate consultations (optional)

6. ONBOARDING FLOW
6.1 Super Admin Creation

Preferred Model

SaaS platform creates hospital tenant

System automatically:

Creates Super Admin account

Creates a default branch

Super Admin receives login credentials

Mandatory password reset on first login

Alternative

Controlled self-service signup (optional future phase)

7. BRANCH MANAGEMENT
7.1 Mandatory Rule

Every hospital tenant must have at least one branch.

7.2 Branch Creation — Required Fields
Field	Description
Name:	Branch name
Is Default:	Boolean
Address:	Physical location
City:	City
State:	State/Region
Country:	Country
Phone:	Contact number
Email:	Branch email
Working Hours:	Operating times
Status:	Active / Inactive
Optional Fields

Timezone

Latitude / Longitude

Emergency contact

Internal notes

8. APPOINTMENT MANAGEMENT
Features

Virtual and physical appointment types

Doctor availability validation

Branch-scoped scheduling

Appointment lifecycle:

Requested

Confirmed

Completed

Cancelled

9. TELEMEDICINE MODULE
Features

Secure video/audio consultation

Appointment-linked sessions

Consultation notes

Prescriptions

Session logging

Technology

WebRTC (media)

Real-time signaling via backend

10. TECHNICAL REQUIREMENTS
Backend

Node.js (LTS)

TypeScript

NestJS

REST APIs

Database

PostgreSQL

Tenant-scoped tables

Branch-scoped records

ACID-compliant transactions

Supporting Services

Redis (sessions, caching)

Object storage (medical documents)

11. SECURITY & COMPLIANCE
Requirements

JWT-based authentication

Role-based access control

Tenant & branch isolation

Encrypted sensitive data

Audit logging

Secure file storage

12. NON-FUNCTIONAL REQUIREMENTS
Performance

Support thousands of tenants

Handle concurrent telemedicine sessions

Availability

99.9% uptime target

Scalability

Horizontal scaling supported

Database partitioning ready

Maintainability

Modular backend

Versioned APIs

13. FUTURE EXTENSIBILITY (INTENTIONAL FLEXIBILITY)

The system must allow future integration of:

Pharmacy systems

Insurance providers

AI diagnostics

Wearable health data

National health systems

No design decision should block these extensions.

14. ASSUMPTIONS & ADJUSTMENT CLAUSE
Assumptions

Mobile-first usage for doctors and patients

Web-only administration

Hospitals vary in size and complexity

Adjustment Clause

This PRD is designed to be iterative.
Feature scope, workflows, and integrations may be adjusted based on:

Regulatory requirements

Hospital feedback

Market conditions
without altering the core architecture.

15. SUCCESS METRICS

Hospital onboarding time

Appointment completion rate

Telemedicine session success rate

Doctor and patient adoption

System uptime
