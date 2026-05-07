# Reports Swagger/OpenAPI Integration

## Overview

The Hospital SaaS Reports API endpoints have been fully integrated into the OpenAPI 3.1.0 specification. All 7 report endpoints are now documented in the Swagger schema and accessible through the interactive API documentation.

## Access Points

- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **OpenAPI Spec**: [http://localhost:3000/api/v1/openapi](http://localhost:3000/api/v1/openapi)
- **Report Dashboard**: [http://localhost:3000/(super-admin)/reports](http://localhost:3000/(super-admin)/reports)

## Available Endpoints

### 1. List All Available Reports
**`GET /api/v1/reports`**

Lists all available report types with descriptions and metadata.

**Authentication**: Required (Bearer Token)

**Response Example**:
```json
{
  "message": "Available reports",
  "data": [
    {
      "id": "appointments",
      "name": "Appointment Analytics",
      "description": "Comprehensive metrics on appointment trends, completion rates, and scheduling patterns",
      "endpoint": "/api/v1/reports/appointments",
      "timeframes": ["week", "month", "year"]
    },
    {
      "id": "doctors",
      "name": "Doctor Performance",
      "description": "Performance metrics for doctors including utilization and completion rates",
      "endpoint": "/api/v1/reports/doctors",
      "timeframes": []
    },
    {
      "id": "branches",
      "name": "Branch Performance",
      "description": "Branch-level metrics including patient count and operational statistics",
      "endpoint": "/api/v1/reports/branches",
      "timeframes": []
    },
    {
      "id": "patients",
      "name": "Patient Analytics",
      "description": "Patient registration trends and booking patterns",
      "endpoint": "/api/v1/reports/patients",
      "timeframes": []
    },
    {
      "id": "system-health",
      "name": "System Health",
      "description": "System metrics including video call performance and database statistics",
      "endpoint": "/api/v1/reports/system-health",
      "timeframes": []
    }
  ]
}
```

---

### 2. Appointment Analytics Report
**`GET /api/v1/reports/appointments`**

Generate comprehensive appointment metrics including trends, completion rates, and scheduling patterns.

**Authentication**: Required (Bearer Token)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeframe` | string | "month" | Time period for report: "week", "month", or "year" |

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/appointments?timeframe=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Schema**:
```typescript
{
  message: string;
  data: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    virtualAppointments: number;
    physicalAppointments: number;
    averageCompletionRate: number;
    completionRateByDoctor: Array<{
      doctorId: string;
      doctorName: string;
      completedCount: number;
      totalCount: number;
      completionRate: number;
    }>;
    peakAppointmentHours: Array<{
      hour: number;
      appointmentCount: number;
    }>;
    cancelReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
}
```

**Response Example**:
```json
{
  "message": "Appointment analytics report generated successfully",
  "data": {
    "totalAppointments": 1284,
    "completedAppointments": 930,
    "cancelledAppointments": 24,
    "virtualAppointments": 856,
    "physicalAppointments": 428,
    "averageCompletionRate": 72.4,
    "completionRateByDoctor": [
      {
        "doctorId": "doc-001",
        "doctorName": "Dr. Sarah Johnson",
        "completedCount": 45,
        "totalCount": 52,
        "completionRate": 86.5
      },
      {
        "doctorId": "doc-002",
        "doctorName": "Dr. Michael Chen",
        "completedCount": 38,
        "totalCount": 48,
        "completionRate": 79.2
      }
    ],
    "peakAppointmentHours": [
      {
        "hour": 9,
        "appointmentCount": 156
      },
      {
        "hour": 14,
        "appointmentCount": 142
      },
      {
        "hour": 16,
        "appointmentCount": 138
      }
    ],
    "cancelReasons": [
      {
        "reason": "Patient Request",
        "count": 18,
        "percentage": 75
      },
      {
        "reason": "Doctor Unavailable",
        "count": 6,
        "percentage": 25
      }
    ]
  }
}
```

---

### 3. Doctor Performance Report
**`GET /api/v1/reports/doctors`**

Generate doctor performance metrics including utilization, specialties, and completion rates.

**Authentication**: Required (Bearer Token)

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/doctors" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Schema**:
```typescript
{
  message: string;
  data: {
    totalDoctors: number;
    activeDoctors: number;
    inactiveDoctors: number;
    doctorStats: Array<{
      doctorId: string;
      doctorName: string;
      specialty: string;
      status: "active" | "inactive";
      totalAppointments: number;
      completedAppointments: number;
      appointmentCompletionRate: number;
      branchCount: number;
      branches: string[];
    }>;
    specialtyDistribution: Array<{
      specialty: string;
      doctorCount: number;
      appointmentCount: number;
    }>;
  };
}
```

**Response Example**:
```json
{
  "message": "Doctor performance report generated successfully",
  "data": {
    "totalDoctors": 312,
    "activeDoctors": 298,
    "inactiveDoctors": 14,
    "doctorStats": [
      {
        "doctorId": "doc-001",
        "doctorName": "Dr. Sarah Johnson",
        "specialty": "General Practitioner",
        "status": "active",
        "totalAppointments": 156,
        "completedAppointments": 135,
        "appointmentCompletionRate": 86.5,
        "branchCount": 2,
        "branches": ["Branch A", "Branch B"]
      },
      {
        "doctorId": "doc-002",
        "doctorName": "Dr. Michael Chen",
        "specialty": "Cardiologist",
        "status": "active",
        "totalAppointments": 89,
        "completedAppointments": 70,
        "appointmentCompletionRate": 78.7,
        "branchCount": 1,
        "branches": ["Branch C"]
      }
    ],
    "specialtyDistribution": [
      {
        "specialty": "General Practitioner",
        "doctorCount": 84,
        "appointmentCount": 542
      },
      {
        "specialty": "Cardiologist",
        "doctorCount": 32,
        "appointmentCount": 287
      },
      {
        "specialty": "Pediatrician",
        "doctorCount": 28,
        "appointmentCount": 203
      }
    ]
  }
}
```

---

### 4. Branch Performance Report
**`GET /api/v1/reports/branches`**

Generate branch-level metrics including patient count, appointments, and operational data.

**Authentication**: Required (Bearer Token)

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/branches" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Schema**:
```typescript
{
  message: string;
  data: {
    totalBranches: number;
    activeBranches: number;
    branches: Array<{
      branchId: string;
      branchName: string;
      address: string;
      doctorCount: number;
      patientCount: number;
      totalAppointments: number;
      completedAppointments: number;
      completionRate: number;
    }>;
  };
}
```

**Response Example**:
```json
{
  "message": "Branch performance report generated successfully",
  "data": {
    "totalBranches": 18,
    "activeBranches": 18,
    "branches": [
      {
        "branchId": "branch-001",
        "branchName": "Downtown Medical Center",
        "address": "123 Main Street, City Center",
        "doctorCount": 28,
        "patientCount": 1248,
        "totalAppointments": 487,
        "completedAppointments": 412,
        "completionRate": 84.6
      },
      {
        "branchId": "branch-002",
        "branchName": "Westside Clinic",
        "address": "456 West Avenue, West District",
        "doctorCount": 19,
        "patientCount": 856,
        "totalAppointments": 321,
        "completedAppointments": 258,
        "completionRate": 80.4
      },
      {
        "branchId": "branch-003",
        "branchName": "Eastside Health Hub",
        "address": "789 East Road, East Zone",
        "doctorCount": 24,
        "patientCount": 1124,
        "totalAppointments": 418,
        "completedAppointments": 356,
        "completionRate": 85.2
      }
    ]
  }
}
```

---

### 5. Patient Analytics Report
**`GET /api/v1/reports/patients`**

Generate patient registration trends, retention patterns, and booking analytics.

**Authentication**: Required (Bearer Token)

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/patients" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Schema**:
```typescript
{
  message: string;
  data: {
    totalPatients: number;
    newPatientsThisMonth: number;
    returningPatients: number;
    newVsReturning: {
      new: number;
      returning: number;
    };
    patientsByBranch: Array<{
      branchId: string;
      branchName: string;
      patientCount: number;
      newThisMonth: number;
    }>;
  };
}
```

**Response Example**:
```json
{
  "message": "Patient analytics report generated successfully",
  "data": {
    "totalPatients": 2456,
    "newPatientsThisMonth": 184,
    "returningPatients": 1248,
    "newVsReturning": {
      "new": 184,
      "returning": 1248
    },
    "patientsByBranch": [
      {
        "branchId": "branch-001",
        "branchName": "Downtown Medical Center",
        "patientCount": 452,
        "newThisMonth": 45
      },
      {
        "branchId": "branch-002",
        "branchName": "Westside Clinic",
        "patientCount": 287,
        "newThisMonth": 28
      },
      {
        "branchId": "branch-003",
        "branchName": "Eastside Health Hub",
        "patientCount": 398,
        "newThisMonth": 52
      }
    ]
  }
}
```

---

### 6. System Health Report
**`GET /api/v1/reports/system-health`**

Generate system health metrics including video call performance and database statistics.

**Authentication**: Required (Bearer Token)

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/system-health" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Schema**:
```typescript
{
  message: string;
  data: {
    videoCallMetrics: {
      totalVideoSessions: number;
      successfulSessions: number;
      failedSessions: number;
      averageSessionDuration: number;
      successRate: number;
    };
    databaseMetrics: {
      totalRecords: number;
      recordsByModel: {
        users: number;
        appointments: number;
        branches: number;
        doctors: number;
        patients: number;
      };
    };
  };
}
```

**Response Example**:
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
    "databaseMetrics": {
      "totalRecords": 125486,
      "recordsByModel": {
        "users": 2684,
        "appointments": 8942,
        "branches": 18,
        "doctors": 312,
        "patients": 2456
      }
    }
  }
}
```

---

### 7. Export Report
**`GET /api/v1/reports/export`**

Export any report data in CSV or JSON format for external analysis and processing.

**Authentication**: Required (Bearer Token)

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportType` | string | ✓ | N/A | Type: "appointments", "doctors", "branches", "patients", "system-health" |
| `format` | string | ✗ | "json" | Export format: "csv" or "json" |
| `timeframe` | string | ✗ | "month" | For appointment reports: "week", "month", or "year" |

**Request Examples**:

**JSON Export**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/export?reportType=appointments&format=json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o appointments_report.json
```

**CSV Export**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/export?reportType=doctors&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o doctors_report.csv
```

**CSV with Custom Timeframe**:
```bash
curl -X GET "http://localhost:3000/api/v1/reports/export?reportType=appointments&format=csv&timeframe=year" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o yearly_appointments.csv
```

**Response**:
- **CSV Format**: Tab-separated values file with headers
- **JSON Format**: Standard JSON object (same as individual report endpoints)
- **Content-Type**: `text/csv` for CSV exports, `application/json` for JSON exports
- **Content-Disposition**: `attachment; filename="report_[timestamp].[csv|json]"`

**CSV Example** (Doctors Report):
```
doctorId	doctorName	specialty	status	totalAppointments	completedAppointments	appointmentCompletionRate	branchCount
doc-001	Dr. Sarah Johnson	General Practitioner	active	156	135	86.5	2
doc-002	Dr. Michael Chen	Cardiologist	active	89	70	78.7	1
doc-003	Dr. Emily Brown	Pediatrician	active	124	108	87.1	2
```

---

## Error Responses

All report endpoints follow consistent error handling patterns. Common error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "No valid authentication token provided"
}
```

### 400 Bad Request (Export endpoint)
```json
{
  "error": "Bad Request",
  "message": "Invalid reportType or format parameter"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An error occurred while generating the report"
}
```

---

## Authentication

All report endpoints require Bearer token authentication. Include the JWT token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Acquisition**:
1. Login via `/api/v1/auth/login`
2. Receive `accessToken` in response
3. Include in all subsequent requests

---

## Multi-Tenant Scoping

All reports are automatically scoped to the authenticated user's hospital:

- **Super Admins**: See hospital-wide data across all branches
- **Branch Managers**: See only their assigned branch data
- **Other Roles**: Limited access based on role-based access control (RBAC)

---

## Usage Examples

### Example 1: Fetching Appointment Analytics
```typescript
const response = await fetch('/api/v1/reports/appointments?timeframe=month', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(`Total Appointments: ${data.data.totalAppointments}`);
console.log(`Completion Rate: ${data.data.averageCompletionRate}%`);
```

### Example 2: Exporting Doctor Performance
```typescript
const response = await fetch(
  '/api/v1/reports/export?reportType=doctors&format=csv',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'doctor_performance.csv';
a.click();
```

### Example 3: Building Custom Dashboards
```typescript
async function generateWeeklyReport() {
  const [appointments, doctors, branches] = await Promise.all([
    fetch('/api/v1/reports/appointments?timeframe=week', { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }).then(r => r.json()),
    fetch('/api/v1/reports/doctors', { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }).then(r => r.json()),
    fetch('/api/v1/reports/branches', { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }).then(r => r.json())
  ]);

  return {
    appointmentMetrics: appointments.data,
    doctorPerformance: doctors.data,
    branchPerformance: branches.data
  };
}
```

---

## Integration Points

### Swagger UI
Navigate to [http://localhost:3000/api-docs](http://localhost:3000/api-docs) to:
- View interactive API documentation
- Test endpoints with live requests
- See response schemas in real-time
- Download OpenAPI specification

### Postman Integration
Import the OpenAPI spec into Postman:
1. Go to File → Import
2. Enter: `http://localhost:3000/api/v1/openapi`
3. Collections automatically generated for all endpoints

### Frontend Dashboard
Access reports via [http://localhost:3000/(super-admin)/reports](http://localhost:3000/(super-admin)/reports):
- Real-time data visualization
- Interactive filtering
- One-click CSV/JSON export
- Responsive design

---

## OpenAPI Schema Location

The complete OpenAPI 3.1.0 specification is available at:

**Endpoint**: `GET /api/v1/openapi`

**File Location**: `src/app/api/v1/openapi/route.ts`

Reports endpoints are defined in the "paths" section with the tag `Reports & Analytics` for easy filtering.

---

## Support & Documentation

- **API Documentation**: [REPORTS_API.md](REPORTS_API.md)
- **Implementation Guide**: [REPORTS_IMPLEMENTATION.md](REPORTS_IMPLEMENTATION.md)
- **Feature Summary**: [REPORTS_COMPLETION_SUMMARY.md](REPORTS_COMPLETION_SUMMARY.md)
- **Backend Module**: `src/modules/reports/index.ts`
- **Frontend Dashboard**: `src/app/(super-admin)/reports/page.tsx`

---

## Version Information

- **OpenAPI Specification**: 3.1.0
- **Reports Module Version**: 1.0.0
- **Last Updated**: 2025-01-29
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript

