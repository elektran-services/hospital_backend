/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import "@/app/(super-admin)/dashboard/dashboard.css";

interface ReportData {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  timeframes?: string[];
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<string>("overview");
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableReports, setAvailableReports] = useState<ReportData[]>([]);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Fetch available reports
    const fetchAvailableReports = async () => {
      try {
        const res = await fetch("/api/v1/reports", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setAvailableReports(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch available reports:", err);
      }
    };

    fetchAvailableReports();
  }, [user, router]);

  const fetchReport = async (reportId: string) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = `/api/v1/reports/${reportId}`;
      if (reportId === "appointments") {
        endpoint += `?timeframe=${timeframe}`;
      }

      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch report data");
      }

      const json = await res.json();
      setReportData(json.data);
      setActiveReport(reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportId: string, format: "json" | "csv") => {
    try {
      let endpoint = `/api/v1/reports/export?reportType=${reportId}&format=${format}`;
      if (reportId === "appointments") {
        endpoint += `&timeframe=${timeframe}`;
      }

      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to export report");
      }

      if (format === "csv") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportId}-report-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const json = await res.json();
        const dataStr = JSON.stringify(json, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = window.URL.createObjectURL(dataBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportId}-report-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export report");
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-header-logo">
          <div className="logo-placeholder">📊</div>
          <div>
            <h1>Reports</h1>
            <p>Hospital Analytics Dashboard</p>
          </div>
        </div>
        <div className="dashboard-user">
          <div className="dashboard-search">Search reports...</div>
          <div className="dashboard-user-chip">
            <div className="dashboard-avatar" />
            <div>
              <p>{user?.fullName || "User"}</p>
              <span>{user?.role}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="reports-controls">
          <div className="controls-group">
            <label>Select Report:</label>
            <div className="report-buttons">
              <button
                className={`report-btn ${activeReport === "overview" ? "active" : ""}`}
                onClick={() => setActiveReport("overview")}
              >
                📈 Overview
              </button>
              {availableReports.map((report) => (
                <button
                  key={report.id}
                  className={`report-btn ${activeReport === report.id ? "active" : ""}`}
                  onClick={() => fetchReport(report.id)}
                >
                  {report.name}
                </button>
              ))}
            </div>
          </div>

          {activeReport === "appointments" && (
            <div className="controls-group">
              <label>Timeframe:</label>
              <select
                value={timeframe}
                onChange={(e) => {
                  setTimeframe(e.target.value as "week" | "month" | "year");
                  fetchReport("appointments");
                }}
              >
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          )}

          {activeReport !== "overview" && (
            <div className="controls-group">
              <label>Export:</label>
              <button
                className="export-btn"
                onClick={() => handleExport(activeReport, "csv")}
              >
                📥 Download CSV
              </button>
              <button
                className="export-btn"
                onClick={() => handleExport(activeReport, "json")}
              >
                📥 Download JSON
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="error-banner">
            <p>Error: {error}</p>
          </div>
        )}

        {activeReport === "overview" && (
          <ReportsOverview reports={availableReports} onSelectReport={fetchReport} />
        )}

        {loading && (
          <div className="loading-spinner">
            <p>Loading report data...</p>
          </div>
        )}

        {!loading && reportData && (
          <ReportDisplay reportId={activeReport} data={reportData} />
        )}
      </main>

      <style jsx>{`
        .reports-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .controls-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .controls-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #333;
        }

        .report-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .report-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .report-btn:hover {
          border-color: #0066cc;
          color: #0066cc;
        }

        .report-btn.active {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }

        .export-btn {
          padding: 0.5rem 1rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .export-btn:hover {
          background: #218838;
        }

        select {
          padding: 0.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .error-banner {
          padding: 1rem;
          background: #fee;
          border-left: 4px solid #f66;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          color: #c33;
        }

        .loading-spinner {
          text-align: center;
          padding: 3rem;
          color: #666;
        }
      `}</style>
    </div>
  );
}

// ============================================
// REPORTS OVERVIEW
// ============================================

function ReportsOverview({
  reports,
  onSelectReport,
}: {
  reports: ReportData[];
  onSelectReport: (id: string) => void;
}) {
  return (
    <section className="reports-grid">
      {reports.map((report) => (
        <div key={report.id} className="report-card">
          <h3>{report.name}</h3>
          <p>{report.description}</p>
          <button
            className="view-report-btn"
            onClick={() => onSelectReport(report.id)}
          >
            View Report →
          </button>
        </div>
      ))}

      <style jsx>{`
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .report-card {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .report-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .report-card h3 {
          margin-top: 0;
          color: #333;
        }

        .report-card p {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .view-report-btn {
          width: 100%;
          padding: 0.75rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s ease;
        }

        .view-report-btn:hover {
          background: #0052a3;
        }
      `}</style>
    </section>
  );
}

// ============================================
// REPORT DISPLAY
// ============================================

function ReportDisplay({ reportId, data }: { reportId: string; data: any }) {
  if (reportId === "appointments") {
    return <AppointmentReportView data={data} />;
  } else if (reportId === "doctors") {
    return <DoctorReportView data={data} />;
  } else if (reportId === "branches") {
    return <BranchReportView data={data} />;
  } else if (reportId === "patients") {
    return <PatientReportView data={data} />;
  } else if (reportId === "system-health") {
    return <SystemHealthReportView data={data} />;
  }

  return <div>No report view available</div>;
}

// ============================================
// APPOINTMENT REPORT VIEW
// ============================================

function AppointmentReportView({ data }: { data: any }) {
  return (
    <div className="report-view">
      <h2>Appointment Analytics</h2>

      <div className="metrics-grid">
        <MetricCard label="Total Appointments" value={data.totalAppointments} />
        <MetricCard label="Completed" value={data.completedAppointments} />
        <MetricCard label="Cancelled" value={data.cancelledAppointments} />
        <MetricCard label="Completion Rate" value={`${data.averageCompletionRate.toFixed(1)}%`} />
        <MetricCard label="Virtual" value={data.virtualAppointments} />
        <MetricCard label="Physical" value={data.physicalAppointments} />
      </div>

      {data.completionRateByDoctor && data.completionRateByDoctor.length > 0 && (
        <section className="report-section">
          <h3>Doctor Performance</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Completed</th>
                <th>Total</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.completionRateByDoctor.map((doc: any, idx: number) => (
                <tr key={idx}>
                  <td>{doc.doctorName}</td>
                  <td>{doc.completedCount}</td>
                  <td>{doc.totalCount}</td>
                  <td>{doc.completionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.peakAppointmentHours && data.peakAppointmentHours.length > 0 && (
        <section className="report-section">
          <h3>Peak Appointment Hours</h3>
          <div className="chart-placeholder">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Hour</th>
                  <th>Appointment Count</th>
                </tr>
              </thead>
              <tbody>
                {data.peakAppointmentHours.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td>{`${item.hour}:00`}</td>
                    <td>
                      <div className="bar-chart" style={{ width: `${(item.appointmentCount / Math.max(...data.peakAppointmentHours.map((h: any) => h.appointmentCount))) * 100}%` }}>
                        {item.appointmentCount}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.cancelReasons && data.cancelReasons.length > 0 && (
        <section className="report-section">
          <h3>Cancellation Reasons</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Reason</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {data.cancelReasons.map((reason: any, idx: number) => (
                <tr key={idx}>
                  <td>{reason.reason}</td>
                  <td>{reason.count}</td>
                  <td>{reason.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <style jsx>{`
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .bar-chart {
          background: linear-gradient(90deg, #0066cc, #0052a3);
          color: white;
          padding: 0.5rem;
          border-radius: 4px;
          text-align: right;
          min-width: 50px;
        }
      `}</style>
    </div>
  );
}

// ============================================
// DOCTOR REPORT VIEW
// ============================================

function DoctorReportView({ data }: { data: any }) {
  return (
    <div className="report-view">
      <h2>Doctor Performance Report</h2>

      <div className="metrics-grid">
        <MetricCard label="Total Doctors" value={data.totalDoctors} />
        <MetricCard label="Active Doctors" value={data.activeDoctors} />
        <MetricCard label="Inactive" value={data.inactiveDoctors} />
      </div>

      {data.specialtyDistribution && data.specialtyDistribution.length > 0 && (
        <section className="report-section">
          <h3>Specialty Distribution</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Specialty</th>
                <th>Doctor Count</th>
                <th>Total Appointments</th>
              </tr>
            </thead>
            <tbody>
              {data.specialtyDistribution.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td>{item.specialty}</td>
                  <td>{item.doctorCount}</td>
                  <td>{item.appointmentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.doctorStats && data.doctorStats.length > 0 && (
        <section className="report-section">
          <h3>Doctor Details</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Specialty</th>
                  <th>Status</th>
                  <th>Total Appointments</th>
                  <th>Completed</th>
                  <th>Completion Rate</th>
                  <th>Branches</th>
                </tr>
              </thead>
              <tbody>
                {data.doctorStats.slice(0, 20).map((doc: any, idx: number) => (
                  <tr key={idx}>
                    <td>{doc.doctorName}</td>
                    <td>{doc.specialty}</td>
                    <td>{doc.status}</td>
                    <td>{doc.totalAppointments}</td>
                    <td>{doc.completedAppointments}</td>
                    <td>{doc.appointmentCompletionRate.toFixed(1)}%</td>
                    <td>{doc.branchCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================
// BRANCH REPORT VIEW
// ============================================

function BranchReportView({ data }: { data: any }) {
  return (
    <div className="report-view">
      <h2>Branch Performance Report</h2>

      <div className="metrics-grid">
        <MetricCard label="Total Branches" value={data.totalBranches} />
        <MetricCard label="Active Branches" value={data.activeBranches} />
        <MetricCard label="Inactive" value={data.inactiveBranches} />
      </div>

      {data.branches && data.branches.length > 0 && (
        <section className="report-section">
          <h3>Branch Details</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Doctors</th>
                  <th>Patients</th>
                  <th>Total Appointments</th>
                  <th>Completed</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.branches.map((branch: any, idx: number) => (
                  <tr key={idx}>
                    <td>{branch.branchName}</td>
                    <td>{branch.doctorCount}</td>
                    <td>{branch.patientCount}</td>
                    <td>{branch.totalAppointments}</td>
                    <td>{branch.completedAppointments}</td>
                    <td>{branch.completionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================
// PATIENT REPORT VIEW
// ============================================

function PatientReportView({ data }: { data: any }) {
  return (
    <div className="report-view">
      <h2>Patient Analytics Report</h2>

      <div className="metrics-grid">
        <MetricCard label="Total Patients" value={data.totalPatients} />
        <MetricCard label="New This Month" value={data.newPatientsThisMonth} />
        <MetricCard label="New This Year" value={data.newPatientsThisYear} />
        <MetricCard label="Returning Patients" value={data.returningPatients} />
      </div>

      {data.patientsByBranch && data.patientsByBranch.length > 0 && (
        <section className="report-section">
          <h3>Patients by Branch</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Total Patients</th>
                <th>New This Month</th>
              </tr>
            </thead>
            <tbody>
              {data.patientsByBranch.map((branch: any, idx: number) => (
                <tr key={idx}>
                  <td>{branch.branchName}</td>
                  <td>{branch.patientCount}</td>
                  <td>{branch.newThisMonth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ============================================
// SYSTEM HEALTH REPORT VIEW
// ============================================

function SystemHealthReportView({ data }: { data: any }) {
  return (
    <div className="report-view">
      <h2>System Health Report</h2>

      {data.videoCallMetrics && (
        <section className="report-section">
          <h3>Video Call Metrics</h3>
          <div className="metrics-grid">
            <MetricCard label="Total Sessions" value={data.videoCallMetrics.totalVideoSessions} />
            <MetricCard label="Successful" value={data.videoCallMetrics.successfulSessions} />
            <MetricCard label="Failed" value={data.videoCallMetrics.failedSessions} />
            <MetricCard label="Success Rate" value={`${data.videoCallMetrics.successRate.toFixed(1)}%`} />
            <MetricCard 
              label="Avg Duration (min)" 
              value={data.videoCallMetrics.averageSessionDuration.toFixed(1)} 
            />
          </div>
        </section>
      )}

      {data.databaseMetrics && (
        <section className="report-section">
          <h3>Database Metrics</h3>
          <div className="metrics-grid">
            <MetricCard label="Total Records" value={data.databaseMetrics.totalRecords} />
          </div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Record Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.databaseMetrics.recordsByModel || {}).map(
                ([model, count]: [string, any], idx: number) => (
                  <tr key={idx}>
                    <td>{model}</td>
                    <td>{count}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ============================================
// METRIC CARD COMPONENT
// ============================================

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <style jsx>{`
        .metric-card {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #666;
          margin: 0 0 0.5rem 0;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0066cc;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// ============================================
// BASE STYLES
// ============================================

const baseStyles = `
  .report-view {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .report-section {
    margin-top: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .report-section h3 {
    margin-top: 0;
    color: #333;
  }

  .report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .report-table thead {
    background: #f5f5f5;
    border-bottom: 2px solid #e0e0e0;
  }

  .report-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #333;
  }

  .report-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .report-table tbody tr:hover {
    background: #fafafa;
  }

  .chart-placeholder {
    padding: 1rem;
    background: #fafafa;
    border-radius: 6px;
  }
`;
