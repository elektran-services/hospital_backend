export default function Home() {
  return (
    <main style={{ padding: "3rem 1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>Hospital SaaS Platform</h1>
      <p style={{ marginBottom: "1.5rem", lineHeight: 1.5 }}>
        Multi-tenant hospital administration with shared APIs for web and mobile
        clients. Backend and Super Admin UI live together but stay strictly
        separated by design.
      </p>
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Super Admin</h2>
        <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.6 }}>
          <li>Dashboard, branches, managers, doctors, settings.</li>
          <li>Role-based rendering; all data fetched via `/api/v1/*`.</li>
        </ul>
      </section>
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>API Surface</h2>
        <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.6 }}>
          <li>Versioned REST under `/api/v1/`.</li>
          <li>Authentication, tenancy (`hospital_id`), and RBAC enforced.</li>
          <li>Reusable for web admin, doctor app, and patient app.</li>
        </ul>
      </section>
      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Next Steps</h2>
        <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.6 }}>
          <li>Implement Super Admin signup + email verification.</li>
          <li>Create default branch on tenant creation.</li>
          <li>Lock down APIs with JWT, refresh tokens, and rate limits.</li>
        </ul>
      </section>
    </main>
  );
}
