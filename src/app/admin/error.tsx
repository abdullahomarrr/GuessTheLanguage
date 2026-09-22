'use client';

import Link from 'next/link';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="admin-failure"><div className="admin-failure-card"><span>!</span><p className="admin-eyebrow">Analytics unavailable</p><h1>The dashboard hit a database error.</h1><p>The game is still online. Retry once; if this persists, check the latest Vercel function log.</p><button onClick={reset}>Retry dashboard</button><Link href="/">Back to PlayLingo</Link></div></main>;
}
