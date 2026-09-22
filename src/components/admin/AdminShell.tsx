import Link from 'next/link';

const links = [
  ['overview', '/admin', 'Overview'],
  ['visitors', '/admin/visitors', 'Visitors'],
  ['reviews', '/admin/reviews', 'Audio reviews'],
  ['reports', '/admin/reports', 'Issue reports'],
  ['feedback', '/admin/feedback', 'App feedback'],
] as const;

export function AdminShell({ active, children }: { active: typeof links[number][0]; children: React.ReactNode }) {
  return <div className="admin-shell"><aside><Link className="admin-brand" href="/"><span>L</span><div>PLAYLINGO<small>CONTROL</small></div></Link><nav>{links.map(([id, href, label]) => <Link key={id} href={href} className={active === id ? 'active' : ''}>{label}</Link>)}</nav><form action="/admin/api/logout" method="post"><button className="admin-logout">Sign out</button></form></aside><main className="admin-dashboard">{children}</main></div>;
}
