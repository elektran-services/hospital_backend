/* eslint-disable @next/next/no-img-element */
"use client";

import { Playfair_Display, Space_Grotesk } from "next/font/google";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

import "@/app/(super-admin)/dashboard/dashboard.css";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏥", active: true },
  { label: "Branches", href: "/branches", icon: "🗂️" },
  { label: "Doctors", href: "/doctors", icon: "🩺" },
  { label: "Managers", href: "/managers", icon: "👤" },
  { label: "Appointments", href: "/appointments", icon: "📅" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

const metrics = [
  { label: "Total Branches", value: "18", trend: "+2.1%", subtitle: "Across 5 regions", positive: true },
  { label: "Total Doctors", value: "312", trend: "+12", subtitle: "Added last 30 days", positive: true },
  { label: "Total Managers", value: "58", trend: "0", subtitle: "Active assignments", positive: true },
  { label: "Appointments (30d)", value: "1,284", trend: "-3%", subtitle: "Month over month", positive: false },
];

const recentActivity = [
  { title: "Dr. Henry Okoye onboarded", detail: "Cardiology · Kailo Heart Center", time: "8 min ago" },
  { title: "Ikoyi branch created", detail: "Assigned to Adaeze Nwosu", time: "34 min ago" },
  { title: "Manager reassigned", detail: "Funke Adeoye → Abuja North", time: "1 hr ago" },
  { title: "Appointment approved", detail: "Patient U. Bello · Dr. Singh", time: "2 hrs ago" },
];

const specialtyMix = [
  { label: "Cardiology", value: 32, color: "#fb7185" },
  { label: "Pediatrics", value: 24, color: "#22d3ee" },
  { label: "Oncology", value: 18, color: "#818cf8" },
  { label: "General Surgery", value: 26, color: "#fbbf24" },
];

const branchStatus = [
  { label: "Active", value: 14, color: "rgba(52,211,153,0.8)" },
  { label: "Inactive", value: 2, color: "rgba(248,113,113,0.8)" },
  { label: "Maintenance", value: 2, color: "rgba(251,191,36,0.8)" },
];

const appointmentStatus = [
  { label: "Pending", value: 42 },
  { label: "Confirmed", value: 188 },
  { label: "Completed", value: 930 },
  { label: "Cancelled", value: 24 },
];

const appointmentStatusTotal = appointmentStatus.reduce((sum, item) => sum + item.value, 0);

const doctorsTable = [
  { name: "Dr. Lara Benson", specialty: "Neurology", branch: "Victoria Island", status: "Active" },
  { name: "Dr. Kelechi Obi", specialty: "Pediatrics", branch: "Lekki", status: "Onboarding" },
  { name: "Dr. Mei Chang", specialty: "Oncology", branch: "Shanghai Hub", status: "Active" },
];

const branchesTable = [
  { name: "Abuja Central", location: "FCT", doctors: 32, status: "Active" },
  { name: "Kano North", location: "Kano", doctors: 18, status: "Maintenance" },
  { name: "Lagos Mainland", location: "Lagos", doctors: 27, status: "Active" },
];

const appointmentsTable = [
  { patient: "Olu O.", doctor: "Dr. Patel", time: "29 Jan · 14:00", status: "Pending" },
  { patient: "Kemi O.", doctor: "Dr. Chang", time: "29 Jan · 16:30", status: "Confirmed" },
  { patient: "Arinze U.", doctor: "Dr. Jones", time: "30 Jan · 09:00", status: "Pending" },
];

const quickActions = [
  { label: "+ Add New Branch" },
  { label: "+ Register Doctor" },
  { label: "+ Assign Manager" },
  { label: "View Full Reports" },
];

const serif = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"] });
const sans = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const hospitalName = user?.hospital?.name ?? "Hospital SaaS";
  const branchName = user?.branch?.name ?? "Multi-tenant network";
  const branchParts = [user?.branch?.city, user?.branch?.state, user?.branch?.country].filter(
    (part): part is string => Boolean(part),
  );
  const branchLocation = branchParts.join(", ") || user?.branch?.address || "—";
  const hospitalIdentifier = user?.hospitalId
    ? `${user.hospitalId.slice(0, 8)}…${user.hospitalId.slice(-4)}`
    : "—";
  const statusLabel = user?.status ?? "ACTIVE";
  const roleLabel = user?.role ?? "Super Admin";
  const userDisplayName = user?.fullName ?? roleLabel;
  const userEmail = user?.email ?? "admin@hospital.com";
  const hospitalLogo = user?.hospital?.logo ?? null;
  const hospitalInitials =
    hospitalName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("") || "HS";

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={`dashboard-page ${sans.className}`}>
      <div className="dashboard-aurora" aria-hidden="true" />
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
            <div className="dashboard-brand">
              <div className="dashboard-brand-mark" aria-hidden={!hospitalLogo}>
                {hospitalLogo ? (
                  <img src={hospitalLogo} alt={`${hospitalName} logo`} />
                ) : (
                  <span>{hospitalInitials}</span>
                )}
              </div>
            <div className="dashboard-brand-details">
              <span className="dashboard-brand-pill">{roleLabel}</span>
              <p className={`${serif.className} dashboard-brand-title`}>{hospitalName}</p>
              <p className="dashboard-brand-subtitle">
                {branchName}
                {branchLocation !== "—" ? ` · ${branchLocation}` : ""}
              </p>
            </div>
          </div>
          <nav className="dashboard-nav">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`dashboard-nav-link ${item.active ? "is-active" : ""}`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <button type="button" className="dashboard-logout" onClick={handleLogout}>
            Logout
          </button>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-header">
            <div>
              <p className="dashboard-eyebrow">Command Center</p>
              <h1 className={`${serif.className} dashboard-title`}>Global Hospital Overview</h1>
              <p className="dashboard-subtitle">
                Monitoring tenancy for {hospitalName}
                <span className="dashboard-code-pill">{hospitalIdentifier}</span>
              </p>
              <div className="dashboard-org-meta">
                <div className="org-meta-card">
                  <p className="org-meta-label">Hospital</p>
                  <p className={`${serif.className} org-meta-value`}>{hospitalName}</p>
                  <span className="org-meta-muted">{hospitalIdentifier}</span>
                </div>
                <div className="org-meta-card">
                  <p className="org-meta-label">Primary Branch</p>
                  <p className="org-meta-value">{branchName}</p>
                  <span className="org-meta-muted">{branchLocation}</span>
                </div>
                <div className="org-meta-card">
                  <p className="org-meta-label">Access</p>
                  <p className="org-meta-value">{roleLabel}</p>
                  <span className="org-meta-muted">{statusLabel}</span>
                </div>
              </div>
            </div>
            <div className="dashboard-user">
              <div className="dashboard-search">Search ops…</div>
              <div className="dashboard-user-chip">
                <div className="dashboard-avatar" />
                <div>
                  <p>{userDisplayName}</p>
                  <span>{userEmail}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="dashboard-content">
            <section className="dashboard-metrics">
              {metrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <p className="metric-label">{metric.label}</p>
                  <div className="metric-value-row">
                    <span className="metric-value">{metric.value}</span>
                    <span className={`metric-trend ${metric.positive ? "is-positive" : "is-negative"}`}>
                      {metric.trend}
                    </span>
                  </div>
                  <p className="metric-subtitle">{metric.subtitle}</p>
                </article>
              ))}
            </section>

            <section className="dashboard-panels">
              <article className="panel panel-activity">
                <div className="panel-header">
                  <h2>Recent Activity</h2>
                  <button type="button">View all</button>
                </div>
                <ol className="activity-list">
                  {recentActivity.map((activity) => (
                    <li key={activity.title}>
                      <div className="activity-dot" aria-hidden="true" />
                      <div>
                        <p className="activity-title">{activity.title}</p>
                        <p className="activity-detail">{activity.detail}</p>
                        <p className="activity-time">{activity.time}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>

              <article className="panel panel-stats">
                <div className="split-card">
                  <div className="split-header">
                    <p>Doctors by specialty</p>
                    <span>Live mix</span>
                  </div>
                  <div className="mix-list">
                    {specialtyMix.map((item) => (
                      <div key={item.label} className="mix-row">
                        <div className="mix-label">
                          <span>{item.label}</span>
                          <span>{item.value}%</span>
                        </div>
                        <div className="mix-bar">
                          <span style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="status-grid">
                  <div>
                    <p className="status-label">Branch status</p>
                    <div className="status-pills">
                      {branchStatus.map((status) => (
                        <span key={status.label} style={{ backgroundColor: status.color }}>
                          {status.label}: {status.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="status-label">Appointment status</p>
                    <div className="appointment-bars">
                      {appointmentStatus.map((status) => (
                        <div key={status.label} className="appointment-row">
                          <span>{status.label}</span>
                          <div className="appointment-bar">
                            <span style={{ width: `${(status.value / appointmentStatusTotal) * 100}%` }} />
                          </div>
                          <span>{status.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="health-card">
                    <p>System health</p>
                    <h3>99.4%</h3>
                    <span>Agora + API uptime (24h)</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="dashboard-tables">
              <article className="table-card">
                <div className="panel-header">
                  <h3>Recent Doctors</h3>
                  <button type="button">View</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialty</th>
                      <th>Branch</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorsTable.map((doctor) => (
                      <tr key={doctor.name}>
                        <td>{doctor.name}</td>
                        <td>{doctor.specialty}</td>
                        <td>{doctor.branch}</td>
                        <td>
                          <span className="pill">{doctor.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>

              <article className="table-card">
                <div className="panel-header">
                  <h3>Active Branches</h3>
                  <button type="button">Manage</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Location</th>
                      <th>Doctors</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchesTable.map((branch) => (
                      <tr key={branch.name}>
                        <td>{branch.name}</td>
                        <td>{branch.location}</td>
                        <td>{branch.doctors}</td>
                        <td>
                          <span className="pill">{branch.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>

              <article className="table-card">
                <div className="panel-header">
                  <h3>Pending Appointments</h3>
                  <button type="button">See all</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointmentsTable.map((appointment) => (
                      <tr key={`${appointment.patient}-${appointment.time}`}>
                        <td>{appointment.patient}</td>
                        <td>{appointment.doctor}</td>
                        <td>{appointment.time}</td>
                        <td>
                          <span className="pill">{appointment.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </section>

            <section className="quick-actions">
              {quickActions.map((action) => (
                <button key={action.label} type="button">
                  {action.label}
                </button>
              ))}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

