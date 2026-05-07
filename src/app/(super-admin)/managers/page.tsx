export default function ManagersPage() {
  return (
    <section style={{ padding: "2rem 1.25rem" }}>
      <h1 style={{ marginBottom: "0.75rem" }}>Branch Managers</h1>
      <p style={{ lineHeight: 1.6, marginBottom: "0.75rem" }}>
        Create and manage branch managers. Managers are restricted to their
        assigned branch; permissions enforced via RBAC and tenancy middleware.
      </p>
      <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.6 }}>
        <li>Invite managers via `/api/v1/users/managers` (planned).</li>
        <li>Assign branch during creation; updates remain branch-scoped.</li>
        <li>Audit fields and soft deletes are required.</li>
      </ul>
    </section>
  );
}

