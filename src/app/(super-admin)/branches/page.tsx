export default function BranchesPage() {
  return (
    <section style={{ padding: "2rem 1.25rem" }}>
      <h1 style={{ marginBottom: "0.75rem" }}>Branches</h1>
      <p style={{ lineHeight: 1.6, marginBottom: "0.75rem" }}>
        Manage branches for the current hospital. APIs must enforce
        `hospital_id` scoping, ensuring no cross-tenant leakage. The Super Admin
        can view all branches; Branch Managers are limited to their assigned
        branch.
      </p>
      <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.6 }}>
        <li>Create default branch on hospital onboarding.</li>
        <li>Required fields: name, address, phone, email, is_head_branch.</li>
        <li>All operations go through `/api/v1/branches`.</li>
      </ul>
    </section>
  );
}

