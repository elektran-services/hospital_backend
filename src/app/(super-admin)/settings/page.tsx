export default function SettingsPage() {
  return (
    <section style={{ padding: "2rem 1.25rem" }}>
      <h1 style={{ marginBottom: "0.75rem" }}>Hospital Settings</h1>
      <p style={{ lineHeight: 1.6, marginBottom: "0.75rem" }}>
        Configure hospital-wide preferences, subscription details, security
        policies, and notification settings. All updates flow through versioned
        APIs to keep the frontend decoupled.
      </p>
      <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.6 }}>
        <li>Enforce `hospital_id` on every write.</li>
        <li>Apply RBAC checks before mutating configuration.</li>
        <li>Keep APIs ready for future mobile clients.</li>
      </ul>
    </section>
  );
}

