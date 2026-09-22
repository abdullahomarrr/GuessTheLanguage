export function AdminPageHeader({ eyebrow, title, description, count }: { eyebrow: string; title: string; description: string; count?: number }) {
  return <header><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="admin-muted">{description}</p></div>{typeof count === 'number' && <span className="admin-mode live">{count.toLocaleString()} records</span>}</header>;
}
