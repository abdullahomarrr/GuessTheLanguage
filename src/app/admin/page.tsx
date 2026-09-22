import { getDashboardData } from '@/lib/adminDashboard';
import { requireAdmin } from '@/lib/adminAuth';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';

function Score({ value }: { value: number }) { return <span className="admin-score">{value}.0</span>; }
function duration(seconds: number) { if (!seconds) return 'Under 30s'; if (seconds < 60) return `${seconds}s`; const minutes = Math.floor(seconds / 60); return `${minutes}m ${seconds % 60}s`; }
function dateTime(value: string) { return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date(value)); }

function TrendChart({ data }: { data: Array<{ date: string; visitors: number; completions: number }> }) {
  const width = 900, height = 220, pad = 22;
  const max = Math.max(1, ...data.map((item) => Math.max(item.visitors, item.completions)));
  const points = (key: 'visitors' | 'completions') => data.map((item, index) => `${pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1)},${height - pad - (item[key] / max) * (height - pad * 2)}`).join(' ');
  return <div className="admin-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Visitors and completions over time"><line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="gridline"/><polyline points={points('visitors')} className="visitor-line"/><polyline points={points('completions')} className="completion-line"/></svg><div className="admin-chart-foot"><span>{data[0]?.date || ''}</span><div><i className="visitor-key"/>Visitors <i className="completion-key"/>Completions</div><span>{data.at(-1)?.date || ''}</span></div></div>;
}

function Breakdown({ title, eyebrow, rows }: { title: string; eyebrow: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <section className="admin-panel admin-breakdown"><div className="admin-panel-head"><div><p className="admin-eyebrow">{eyebrow}</p><h2>{title}</h2></div></div><div className="admin-bars">{rows.length ? rows.map((row) => <div className="admin-bar" key={row.label}><div><span>{row.label}</span><strong>{row.value}</strong></div><i><b style={{ width: `${Math.max(3, row.value / max * 100)}%` }}/></i></div>) : <div className="admin-empty">No data yet.</div>}</div></section>;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const data = await getDashboardData(Number(params.range || 30));
  const completionRate = data.totals.views ? Math.round(data.totals.completions / data.totals.views * 100) : 0;
  const returnRate = data.totals.visitors ? Math.round(data.totals.returning / data.totals.visitors * 100) : 0;
  return <AdminShell active="overview">
      <header><div><p className="admin-eyebrow">Private analytics</p><h1>Audience overview</h1><p className="admin-muted">Anonymous traffic, engagement, geography, and game outcomes.</p></div><div className="admin-header-actions"><div className="admin-range">{[7,30,90].map((range) => <Link key={range} className={data.rangeDays === range ? 'active' : ''} href={`/admin?range=${range}`}>{range}d</Link>)}</div><span className={`admin-mode ${data.mode === 'database' ? 'live' : ''}`}>{data.mode === 'database' ? 'Live database' : 'Database not connected'}</span></div></header>
      {data.mode !== 'database' && <div className="admin-setup">Connect <code>DATABASE_URL</code> to begin collecting analytics.</div>}
      <section id="overview" className="admin-metrics admin-metrics-six">
        <article><small>Unique visitors</small><strong>{data.totals.visitors.toLocaleString()}</strong><span>Anonymous browsers</span></article>
        <article><small>Sessions</small><strong>{data.totals.sessions.toLocaleString()}</strong><span>{data.totals.views.toLocaleString()} challenge views</span></article>
        <article><small>Returning users</small><strong>{returnRate}%</strong><span>{data.totals.returning.toLocaleString()} came back</span></article>
        <article><small>Average time</small><strong>{duration(data.totals.avgSeconds)}</strong><span>Engaged time per session</span></article>
        <article><small>Completion rate</small><strong>{completionRate}%</strong><span>{data.totals.completions.toLocaleString()} games completed</span></article>
        <article><small>Audio reviews</small><strong>{data.totals.reviews.toLocaleString()}</strong><span>Community submissions</span></article>
      </section>
      <section id="audience" className="admin-panel"><div className="admin-panel-head"><div><p className="admin-eyebrow">Traffic trend</p><h2>Visitors and completions</h2></div><p>Daily totals over the selected {data.rangeDays}-day period.</p></div><TrendChart data={data.daily}/></section>
      <div id="acquisition" className="admin-breakdown-grid"><Breakdown eyebrow="Geography" title="Top locations" rows={data.countries}/><Breakdown eyebrow="Acquisition" title="Traffic sources" rows={data.sources}/><Breakdown eyebrow="Technology" title="Devices" rows={data.devices}/></div>
      <section id="visitors" className="admin-panel"><div className="admin-panel-head"><div><p className="admin-eyebrow">Session log</p><h2>Recent visitors</h2></div><p>City and region are inferred from the request. Raw IP addresses are never stored.</p></div><div className="admin-table-wrap"><table><thead><tr><th>Visitor</th><th>Opened</th><th>Last active</th><th>Time</th><th>Location</th><th>Source</th><th>Device</th><th>Result</th></tr></thead><tbody>{data.visitors.length ? data.visitors.map((visitor) => <tr key={visitor.session}><td><span className="admin-mono">{visitor.visitor}</span>{visitor.returning && <span className="admin-returning">Returning</span>}</td><td>{dateTime(visitor.firstAt)}</td><td>{dateTime(visitor.lastAt)}</td><td>{duration(visitor.durationSeconds)}</td><td>{visitor.location}</td><td>{visitor.source}</td><td>{visitor.device} · {visitor.browser}</td><td><span className={visitor.completed ? 'admin-pill' : 'admin-pill neutral'}>{visitor.completed ? 'Completed' : `${visitor.events} events`}</span></td></tr>) : <tr><td colSpan={8} className="admin-empty">No visitor sessions yet.</td></tr>}</tbody></table></div></section>
      <section id="reviews" className="admin-panel"><div className="admin-panel-head"><div><p className="admin-eyebrow">Quality queue</p><h2>Audio reviews</h2></div><p>Community feedback for human moderation.</p></div><div className="admin-review-list">{data.reviews.length ? data.reviews.map((review,index) => <article className="admin-review" key={`${review.clip}-${review.submittedAt}-${index}`}><div className="admin-review-title"><div><strong>{review.language}</strong><span className="admin-mono">{review.clip}</span></div><span>{review.proficiency}</span></div><div className="admin-ratings"><label>Pronunciation<Score value={review.pronunciation}/></label><label>Fluency<Score value={review.fluency}/></label><label>Audio quality<Score value={review.quality}/></label><label>Naturalness<Score value={review.naturalness}/></label></div><div className="admin-review-foot"><div>{review.issues.length ? review.issues.map((issue) => <span className="admin-issue" key={issue}>{issue}</span>) : <span className="admin-clean">No issues flagged</span>}</div><time>{dateTime(review.submittedAt)}</time></div></article>) : <div className="admin-empty">No audio reviews yet.</div>}</div></section>
  </AdminShell>;
}
