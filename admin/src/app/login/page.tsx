import { isAuthConfigured } from '@/lib/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = isAuthConfigured();
  return (
    <main className="login-shell">
      <form className="login-card" action="/api/login" method="post">
        <div className="mark">L</div>
        <p className="eyebrow">Private operations</p>
        <h1>Lingo Control</h1>
        <p className="muted">Owner access to audience analytics and the audio-quality review queue.</p>
        {!configured && <div className="notice">Authentication is locked. Configure the required environment variables first.</div>}
        {error && <div className="error">Those credentials were not accepted.</div>}
        <label>Email<input name="email" type="email" autoComplete="username" required disabled={!configured} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required disabled={!configured} /></label>
        <button disabled={!configured}>Enter control room</button>
      </form>
    </main>
  );
}
