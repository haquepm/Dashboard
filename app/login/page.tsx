import { signIn } from "./actions";

const errorMessages: Record<string, string> = {
  missing: "Enter both your email address and password.",
  auth_failed: "Authentication provider rejected the sign-in. Diagnostic details:",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; code?: string; status?: string; message?: string }> }) {
  const p = await searchParams;
  const errorMessage = p.error ? errorMessages[p.error] ?? "Sign-in could not be completed." : null;
  return (
    <main className="login-wrap">
      <section className="login-card">
        <div className="brand-mark">C</div>
        <p className="eyebrow">CRESCENT CONTRACTORS</p>
        <h1>Management Control Centre</h1>
        <p className="muted">Sign in with your authorised Crescent account.</p>
        {errorMessage && (
          <div className="error" role="alert">
            {errorMessage}
            {p.error === "auth_failed" && (
              <div style={{ marginTop: 8, fontSize: 13, overflowWrap: "anywhere" }}>
                <div>Code: {p.code || "not supplied"}</div>
                <div>Status: {p.status || "not supplied"}</div>
                <div>Message: {p.message || "not supplied"}</div>
              </div>
            )}
          </div>
        )}
        <form action={signIn}>
          <label>Email address<input name="email" type="email" required autoComplete="username" /></label>
          <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
          <button className="primary" type="submit">Sign in securely</button>
        </form>
        <small>Access is granted by an administrator. Public self-registration is disabled.</small>
      </section>
    </main>
  );
}
