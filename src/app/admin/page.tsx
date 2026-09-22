import { getDashboardData } from '@/lib/adminDashboard';
import { requireAdmin } from '@/lib/adminAuth';
import Link from 'next/link';

function Score({ value }: { value: number }) {
  return <span className="admin-score" aria-label={`${value} out of 5`}>{value}.0</span>;
}

export default async function DashboardPage() {
  await requireAdmin();
  const data = await getDashboardData();
  const completionRate = data.totals.views ? Math.round((data.totals.completions / data.totals.views) * 100) : 0;
  return (
    <div className="admin-shell">
      <aside>
        <Link className="admin-brand" href="/"><span>L</span><div>PLAYLINGO<small>CONTROL</small></div></Link>
        <nav><a href="#overview" className="active">Overview</a><a href="#visitors">Visitors</a><a href="#reviews">Audio reviews</a></nav>
        <form action="/admin/api/logout" method="post"><button className="admin-logout">Sign out</button></form>
      </aside>
      <main className="admin-dashboard">
        <header><div><p className="admin-eyebrow">Daily operations</p><h1>PlayLingo analytics</h1><p className="admin-muted">Audience activity and recording quality in one private workspace.</p></div><span className={`admin-mode ${data.mode === 'database' ? 'live' : ''}`}>{data.mode === 'database' ? 'Live database' : 'Database not connected'}</span></header>
        {data.mode !== 'database' && <div className="admin-setup">The dashboard is ready, but it needs a production <code>DATABASE_URL</code> and the analytics schema before it can collect real visitors.</div>}
        <section id="overview" className="admin-metrics">
          <article><small>Unique visitors today</small><strong>{data.totals.visitors.toLocaleString()}</strong><span>Anonymous daily sessions</span></article>
          <article><small>Challenge views</small><strong>{data.totals.views.toLocaleString()}</strong><span>Page loads and refreshes</span></article>
          <article><small>Completion rate</small><strong>{completionRate}%</strong><span>{data.totals.completions.toLocaleString()} completed</span></article>
          <article><small>Audio reviews</small><strong>{data.totals.reviews.toLocaleString()}</strong><span>Community submissions</span></article>
        </section>
        <section id="visitors" className="admin-panel">
          <div className="admin-panel-head"><div><p className="admin-eyebrow">Audience</p><h2>Recent visitors</h2></div><p>Location is inferred by Vercel. Raw IP addresses are never stored.</p></div>
          <div className="admin-table-wrap"><table><thead><tr><th>Session</th><th>Viewed</th><th>Approx. location</th><th>Device</th><th>Browser</th><th>Activity</th></tr></thead><tbody>{data.visitors.length ? data.visitors.map((visitor) => <tr key={`${visitor.session}-${visitor.viewedAt}`}><td className="admin-mono">{visitor.session}</td><td>{visitor.viewedAt}</td><td>{visitor.location}</td><td>{visitor.device}</td><td>{visitor.browser}</td><td><span className="admin-pill">{visitor.status}</span></td></tr>) : <tr><td colSpan={6} className="admin-empty">No visitor events yet.</td></tr>}</tbody></table></div>
        </section>
        <section id="reviews" className="admin-panel">
          <div className="admin-panel-head"><div><p className="admin-eyebrow">Quality queue</p><h2>Audio reviews</h2></div><p>Community ratings support human moderation; they never approve clips automatically.</p></div>
          <div className="admin-review-list">{data.reviews.length ? data.reviews.map((review, index) => <article className="admin-review" key={`${review.clip}-${review.submittedAt}-${index}`}><div className="admin-review-title"><div><strong>{review.language}</strong><span className="admin-mono">{review.clip}</span></div><span>{review.proficiency}</span></div><div className="admin-ratings"><label>Pronunciation<Score value={review.pronunciation} /></label><label>Fluency<Score value={review.fluency} /></label><label>Audio quality<Score value={review.quality} /></label><label>Naturalness<Score value={review.naturalness} /></label></div><div className="admin-review-foot"><div>{review.issues.length ? review.issues.map((issue) => <span className="admin-issue" key={issue}>{issue}</span>) : <span className="admin-clean">No issues flagged</span>}</div><time>{review.submittedAt}</time></div></article>) : <div className="admin-empty">No audio reviews yet.</div>}</div>
        </section>
      </main>
    </div>
  );
}
