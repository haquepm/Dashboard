import { signIn } from "./actions";

const errorMessages: Record<string, string> = {
  missing: "Enter both your email address and password.",
  email_not_confirmed: "This email address has not been confirmed in Supabase Authentication.",
  user_unavailable: "This account is currently unavailable. Contact the system administrator.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  credentials_rejected: "Supabase rejected the sign-in credentials. The server logs now contain a safe diagnostic code for the administrator.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const p = await searchParams;
  const errorMessage = p.error ? errorMessages[p.error] ?? errorMessages.credentials_rejected : null;
  return (
    <main className="login-wrap">
      <section className="login-card">
        <div className="brand-mark">C</div>
        <p className="eyebrow">CRESCENT CONTRACTORS</p>
        <h1>Management Control Centre</h1>
        <p className="muted">Sign in with your authorised Crescent account.</p>
        {errorMessage && <div className="error" role="alert">{errorMessage}</div>}
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
