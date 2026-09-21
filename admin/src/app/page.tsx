import { requireAdmin } from '@/lib/auth';
import { getDashboardData } from '@/lib/dashboard';

function Stars({ value }: { value: number }) {
  return <span className="score" aria-label={`${value} out of 5`}>{value}.0</span>;
}

export default async function DashboardPage() {
  await requireAdmin();
  const data = await getDashboardData();
  const completionRate = data.totals.views ? Math.round(data.totals.completions / data.totals.views * 100) : 0;
  return (
    <div className="app-shell">
      <aside>
        <div className="brand"><span>L</span><div>LINGO<small>CONTROL</small></div></div>
        <nav><a href="#overview" className="active">Overview</a><a href="#visitors">Visitors</a><a href="#reviews">Audio reviews</a></nav>
        <form action="/api/logout" method="post"><button className="logout">Sign out</button></form>
      </aside>
      <main className="dashboard">
        <header><div><p className="eyebrow">Daily operations</p><h1>Good afternoon.</h1><p className="muted">Audience health and recording quality in one private workspace.</p></div><span className={`mode ${data.mode}`}>{data.mode === 'mock' ? 'Demo data' : 'Live database'}</span></header>
        <section id="overview" className="metrics">
          <article><small>Unique visitors today</small><strong>{data.totals.visitors.toLocaleString()}</strong><span>Anonymous daily sessions</span></article>
          <article><small>Challenge views</small><strong>{data.totals.views.toLocaleString()}</strong><span>Refreshes included</span></article>
          <article><small>Completion rate</small><strong>{completionRate}%</strong><span>{data.totals.completions.toLocaleString()} completed</span></article>
          <article><small>Audio reviews</small><strong>{data.totals.reviews.toLocaleString()}</strong><span>Pending moderation evidence</span></article>
        </section>
        <section id="visitors" className="panel">
          <div className="panel-head"><div><p className="eyebrow">Audience</p><h2>Recent daily visitors</h2></div><p>Country and region are inferred from the request. No raw IP is stored.</p></div>
          <div className="table-wrap"><table><thead><tr><th>Session</th><th>Viewed</th><th>Approx. location</th><th>Device</th><th>Browser</th><th>Activity</th></tr></thead><tbody>{data.visitors.map((visitor) => <tr key={`${visitor.session}-${visitor.viewedAt}`}><td className="mono">{visitor.session}</td><td>{visitor.viewedAt}</td><td>{visitor.location}</td><td>{visitor.device}</td><td>{visitor.browser}</td><td><span className="pill">{visitor.status}</span></td></tr>)}</tbody></table></div>
        </section>
        <section id="reviews" className="panel">
          <div className="panel-head"><div><p className="eyebrow">Quality queue</p><h2>Audio reviews</h2></div><p>Community ratings inform human moderation; they never approve clips automatically.</p></div>
          <div className="review-list">{data.reviews.map((review, index) => <article className="review" key={`${review.clip}-${review.submittedAt}-${index}`}><div className="review-title"><div><strong>{review.language}</strong><span className="mono">{review.clip}</span></div><span>{review.proficiency}</span></div><div className="ratings"><label>Pronunciation<Stars value={review.pronunciation} /></label><label>Fluency<Stars value={review.fluency} /></label><label>Audio quality<Stars value={review.quality} /></label><label>Naturalness<Stars value={review.naturalness} /></label></div><div className="review-foot"><div>{review.issues.length ? review.issues.map((issue) => <span className="issue" key={issue}>{issue}</span>) : <span className="clean">No issues flagged</span>}</div><time>{review.submittedAt}</time></div></article>)}</div>
        </section>
      </main>
    </div>
  );
}
