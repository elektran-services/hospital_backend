export default function DoctorsPage() {
  return (
    <section style={{ padding: "2rem 1.25rem" }}>
      <h1 style={{ marginBottom: "0.75rem" }}>Doctors</h1>
      <p style={{ lineHeight: 1.6, marginBottom: "0.75rem" }}>
        Manage doctor profiles, specialties, and branch assignments. Data is
        consumed via API calls so the UI stays decoupled from backend logic.
      </p>
      <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.6 }}>
        <li>Branch-scoped availability and scheduling.</li>
        <li>Role-based UI rendering using RBAC claims.</li>
        <li>Secure access for mobile doctor app via shared APIs.</li>
      </ul>
    </section>
  );
}

