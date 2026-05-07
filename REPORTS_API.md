# Reports & Analytics API Documentation

**Date:** February 11, 2026  
**Status:** ✅ FULLY IMPLEMENTED  
**Version:** 1.0.0

---

## Overview

The Hospital SaaS platform includes a comprehensive reporting and analytics module that provides hospital administrators with detailed insights into operations, performance, and system health.

### Available Reports

1. **Appointment Analytics** - Detailed metrics on appointments, trends, and performance
2. **Doctor Performance** - Doctor utilization, specialties, and completion rates
3. **Branch Performance** - Branch-level metrics and operational data
4. **Patient Analytics** - Patient registration, retention, and booking patterns
5. **System Health** - Video call metrics and database statistics

---

## API Endpoints

### Base URL
```
/api/v1/reports
```

---

## Endpoints Summary

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/reports` | List all available reports | SUPER_ADMIN, BRANCH_MANAGER |
| GET | `/api/v1/reports/appointments` | Appointment analytics report | SUPER_ADMIN, BRANCH_MANAGER |
| GET | `/api/v1/reports/doctors` | Doctor performance report | SUPER_ADMIN, BRANCH_MANAGER |
| GET | `/api/v1/reports/branches` | Branch performance report | SUPER_ADMIN, BRANCH_MANAGER |
| GET | `/api/v1/reports/patients` | Patient analytics report | SUPER_ADMIN, BRANCH_MANAGER |
| GET | `/api/v1/reports/system-health` | System health report | SUPER_ADMIN, BRANCH_MANAGER |
| GET | `/api/v1/reports/export` | Export report as CSV or JSON | SUPER_ADMIN, BRANCH_MANAGER |

---

## 1. List Available Reports

**GET** `/api/v1/reports`

Retrieves all available report types with metadata.

**Query Parameters:** None

**Response (200):**
```json
{
  "message": "Available reports retrieved successfully",
  "data": [
    {
      "id": "appointments",
      "name": "Appointment Analytics",
      "description": "Detailed metrics on appointment trends, completion rates, and cancellations",
      "endpoint": "/api/v1/reports/appointments",
      "timeframes": ["week", "month", "year"]
    },
    {
      "id": "doctors",
      "name": "Doctor Performance",
      "description": "Performance metrics for all doctors including completion rates and specialties",
      "endpoint": "/api/v1/reports/doctors"
    },
    {
      "id": "branches",
      "name": "Branch Performance",
      "description": "Key metrics for each branch including patient and appointment data",
      "endpoint": "/api/v1/reports/branches"
    },
    {
      "id": "patients",
      "name": "Patient Analytics",
      "description": "Patient registration trends, retention, and booking patterns",
      "endpoint": "/api/v1/reports/patients"
    },
    {
      "id": "system-health",
      "name": "System Health",
      "description": "Video call success rates, API performance, and database metrics",
      "endpoint": "/api/v1/reports/system-health"
    }
  ]
}
```

---

## 2. Appointment Analytics Report

**GET** `/api/v1/reports/appointments`

Generates comprehensive appointment metrics and trends.

**Query Parameters:**
- `timeframe` (optional): "week" | "month" | "year" (default: "month")

**Response (200):**
```json
{
  "message": "Appointment report generated successfully",
  "data": {
    "totalAppointments": 1284,
    "completedAppointments": 930,
    "cancelledAppointments": 24,
    "noShowAppointments": 0,
    "virtualAppointments": 856,
    "physicalAppointments": 428,
    "averageCompletionRate": 72.4,
    "completionRateByDoctor": [
      {
        "doctorId": "uuid",
        "doctorName": "Dr. John Smith",
        "completedCount": 45,
        "totalCount": 62,
        "completionRate": 72.5
      }
    ],
    "appointmentTrendsByDate": [
      {
        "date": "2026-02-01",
        "requested": 12,
        "confirmed": 8,
        "completed": 5,
        "cancelled": 1
      }
    ],
    "peakAppointmentHours": [
      {
        "hour": 14,
        "appointmentCount": 156
      }
    ],
    "cancelReasons": [
      {
        "reason": "Patient unavailable",
        "count": 12,
        "percentage": 50.0
      }
    ]
  },
  "timeframe": "month",
  "generatedAt": "2026-02-11T10:30:00.000Z"
}
```

**Metrics Explained:**
- **totalAppointments**: All appointments in the timeframe
- **completedAppointments**: Appointments with status = "completed"
- **cancelledAppointments**: Appointments with status = "cancelled"
- **averageCompletionRate**: Percentage of completed vs total
- **completionRateByDoctor**: Performance breakdown per doctor
- **appointmentTrendsByDate**: Daily appointment status distribution
- **peakAppointmentHours**: Top 5 busiest hours
- **cancelReasons**: Breakdown of why appointments were cancelled

---

## 3. Doctor Performance Report

**GET** `/api/v1/reports/doctors`

Generates doctor utilization and performance metrics.

**Query Parameters:** None

**Response (200):**
```json
{
  "message": "Doctor performance report generated successfully",
  "data": {
    "totalDoctors": 312,
    "activeDoctors": 298,
    "inactiveDoctors": 14,
    "doctorStats": [
      {
        "doctorId": "uuid",
        "doctorName": "Dr. Lara Benson",
        "specialty": "Neurology",
        "status": "ACTIVE",
        "totalAppointments": 156,
        "completedAppointments": 142,
        "cancelledAppointments": 8,
        "appointmentCompletionRate": 91.0,
        "branchCount": 2,
        "branches": ["Victoria Island", "Lekki"]
      }
    ],
    "specialtyDistribution": [
      {
        "specialty": "Cardiology",
        "doctorCount": 32,
        "appointmentCount": 856
      }
    ]
  },
  "generatedAt": "2026-02-11T10:30:00.000Z"
}
```

**Metrics Explained:**
- **totalDoctors**: All doctors in the hospital
- **activeDoctors**: Doctors with ACTIVE status
- **inactiveDoctors**: Doctors with SUSPENDED or other inactive status
- **doctorStats**: Complete doctor details including specialties and branches
- **specialtyDistribution**: Doctor and appointment count by specialty

---

## 4. Branch Performance Report

**GET** `/api/v1/reports/branches`

Generates branch-level operational metrics.

**Query Parameters:** None

**Response (200):**
```json
{
  "message": "Branch performance report generated successfully",
  "data": {
    "totalBranches": 18,
    "activeBranches": 18,
    "inactiveBranches": 0,
    "branches": [
      {
        "branchId": "uuid",
        "branchName": "Victoria Island",
        "address": "123 Main St",
        "status": "ACTIVE",
        "doctorCount": 24,
        "patientCount": 186,
        "totalAppointments": 428,
        "completedAppointments": 312,
        "virtualAppointmentsCount": 286,
        "physicalAppointmentsCount": 142,
        "completionRate": 72.9
      }
    ]
  },
  "generatedAt": "2026-02-11T10:30:00.000Z"
}
```

**Metrics Explained:**
- **totalBranches**: All branches in the hospital
- **doctorCount**: Active doctors in each branch
- **patientCount**: Active patients in each branch
- **totalAppointments**: All appointments at the branch
- **completionRate**: Appointment completion percentage
- **virtualAppointmentsCount**: Video call appointments
- **physicalAppointmentsCount**: In-person appointments

---

## 5. Patient Analytics Report

**GET** `/api/v1/reports/patients`

Generates patient registration and booking trends.

**Query Parameters:** None

**Response (200):**
```json
{
  "message": "Patient analytics report generated successfully",
  "data": {
    "totalPatients": 2456,
    "activePatients": 2456,
    "newPatientsThisMonth": 184,
    "newPatientsThisYear": 856,
    "returningPatients": 1248,
    "newVsReturning": {
      "new": 1208,
      "returning": 1248
    },
    "appointmentBookingTrend": [
      {
        "date": "2026-02-01",
        "newPatients": 8,
        "appointments": 42
      }
    ],
    "patientsByBranch": [
      {
        "branchId": "uuid",
        "branchName": "Victoria Island",
        "patientCount": 186,
        "newThisMonth": 24
      }
    ]
  },
  "generatedAt": "2026-02-11T10:30:00.000Z"
}
```

**Metrics Explained:**
- **totalPatients**: All registered patients
- **newPatientsThisMonth**: New registrations in current month
- **newPatientsThisYear**: New registrations in current year
- **returningPatients**: Patients with 2+ appointments
- **appointmentBookingTrend**: Daily booking patterns
- **patientsByBranch**: Patient distribution across branches

---

## 6. System Health Report

**GET** `/api/v1/reports/system-health`

Generates system performance and reliability metrics.

**Query Parameters:** None

**Response (200):**
```json
{
  "message": "System health report generated successfully",
  "data": {
    "videoCallMetrics": {
      "totalVideoSessions": 856,
      "successfulSessions": 823,
      "failedSessions": 33,
      "averageSessionDuration": 32.5,
      "successRate": 96.1
    },
    "apiMetrics": {
      "totalRequests": 0,
      "errorRate": 0,
      "averageResponseTime": 0
    },
    "databaseMetrics": {
      "totalRecords": 125486,
      "recordsByModel": {
        "users": 2758,
        "appointments": 1284,
        "branches": 18,
        "doctors": 312,
        "patients": 2456,
        "hospitals": 1
      }
    },
    "timestamp": "2026-02-11T10:30:00.000Z"
  },
  "generatedAt": "2026-02-11T10:30:00.000Z"
}
```

**Metrics Explained:**
- **videoCallMetrics**: Agora video call success rates and performance
- **successRate**: Percentage of video calls that completed successfully
- **databaseMetrics**: Overall data volume and distribution

---

## 7. Export Report

**GET** `/api/v1/reports/export`

Exports report data as CSV or JSON file.

**Query Parameters:**
- `reportType` (required): "appointments" | "doctors" | "branches" | "patients" | "system-health"
- `format` (optional): "csv" | "json" (default: "json")
- `timeframe` (optional): For appointments only - "week" | "month" | "year" (default: "month")

**Response (200):**

If `format=json`:
```json
{
  "message": "appointments report exported successfully",
  "data": { ... },
  "exportedAt": "2026-02-11T10:30:00.000Z"
}
```

If `format=csv`:
Downloads a CSV file with report data formatted as a spreadsheet.

**Examples:**

Export appointments as JSON:
```bash
GET /api/v1/reports/export?reportType=appointments&format=json&timeframe=month
Authorization: Bearer <token>
```

Export doctors as CSV:
```bash
GET /api/v1/reports/export?reportType=doctors&format=csv
Authorization: Bearer <token>
```

---

## Frontend Integration

### Reports Dashboard

Access the reports dashboard at `/reports` in the super-admin panel.

**Features:**
- ✅ Report selection interface
- ✅ Real-time data fetching
- ✅ Timeframe selection (for appointments)
- ✅ CSV/JSON export buttons
- ✅ Formatted tables and metrics
- ✅ Responsive design

### Usage Example

```typescript
// Fetch appointment report
const response = await fetch(
  '/api/v1/reports/appointments?timeframe=month',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();
console.log(data.data); // Report data
```

---

## Authentication & Authorization

All report endpoints require:

1. **Valid JWT Token** - Bearer token in Authorization header
2. **Roles Required** - SUPER_ADMIN or BRANCH_MANAGER
3. **Hospital Scope** - Auto-filtered to user's hospital

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "error": "Missing or invalid authorization token"
}
```

**403 Forbidden:**
```json
{
  "error": "User role is not authorized to access reports"
}
```

**400 Bad Request:**
```json
{
  "error": {
    "fieldErrors": {},
    "formErrors": [
      "timeframe must be 'week', 'month', or 'year'"
    ]
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to generate appointment report"
}
```

---

## Performance

Report generation times depend on data volume:

- **Appointment Reports**: ~500-1000ms (large hospitals)
- **Doctor Performance**: ~200-500ms
- **Branch Performance**: ~100-300ms
- **Patient Analytics**: ~300-600ms
- **System Health**: ~50-150ms

---

## Data Refresh

Reports are generated on-demand (real-time). Each request pulls current data from the database.

**Update Frequency:**
- Dashboard: Manual refresh on request
- Export: Manual export on request
- Cache: No caching (always fresh data)

---

## Use Cases

### 1. Executive Reporting
Get hospital-wide metrics for monthly board meetings:
```bash
GET /api/v1/reports/appointments?timeframe=month
GET /api/v1/reports/doctors
GET /api/v1/reports/branches
```

### 2. Performance Tracking
Monitor doctor and branch performance:
```bash
GET /api/v1/reports/doctors
GET /api/v1/reports/branches
```

### 3. Patient Insights
Analyze booking and retention patterns:
```bash
GET /api/v1/reports/patients
```

### 4. System Monitoring
Check video call and system health:
```bash
GET /api/v1/reports/system-health
```

### 5. Data Export
Export data for external analysis:
```bash
GET /api/v1/reports/export?reportType=doctors&format=csv
```

---

## Integration with Dashboard

The reports system integrates with the dashboard metrics:

- Dashboard shows summary metrics
- Reports page shows detailed analytics
- Both pull from same data sources
- Export functionality available on reports page

---

## File Structure

```
src/
├── modules/
│   └── reports/
│       └── index.ts              # Report generation logic
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── reports/
│   │           ├── route.ts               # List reports
│   │           ├── appointments/route.ts  # Appointments report
│   │           ├── doctors/route.ts       # Doctors report
│   │           ├── branches/route.ts      # Branches report
│   │           ├── patients/route.ts      # Patients report
│   │           ├── system-health/route.ts # System health report
│   │           └── export/route.ts        # Export functionality
│   └── (super-admin)/
│       └── reports/
│           └── page.tsx          # Reports dashboard
```

---

## Future Enhancements

- Scheduled report generation
- Email delivery of reports
- Custom date ranges
- Advanced filtering options
- Chart visualizations (Chart.js, Recharts)
- Report templates
- Multi-format export (PDF, Excel)
- Report history/archiving
- Comparison reports (month-over-month, year-over-year)

---

## Support & Testing

To test the reports API:

1. Navigate to `/reports` in the super-admin panel
2. Select a report type
3. View real-time data
4. Export as CSV or JSON

Or use curl:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/reports/appointments?timeframe=month
```

---

**Last Updated:** February 11, 2026
