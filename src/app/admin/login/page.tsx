import { isAdminAuthConfigured } from '@/lib/adminAuth';
import Link from 'next/link';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = isAdminAuthConfigured();
  return (
    <main className="admin-login-shell">
      <form className="admin-login-card" action="/admin/api/login" method="post">
        <div className="admin-mark">L</div>
        <p className="admin-eyebrow">Private operations</p>
        <h1>Lingo Control</h1>
        <p className="admin-muted">Enter your owner password to view live traffic and audio feedback.</p>
        {!configured && <div className="admin-notice">Admin access is locked until the production environment variables are configured.</div>}
        {error && <div className="admin-error">That password was not accepted.</div>}
        <label>Password<input name="password" type="password" autoComplete="current-password" required autoFocus disabled={!configured} /></label>
        <button disabled={!configured}>Open dashboard</button>
        <Link className="admin-back" href="/">Back to PlayLingo</Link>
      </form>
    </main>
  );
}
