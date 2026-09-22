import 'server-only';

import postgres from 'postgres';

let client: ReturnType<typeof postgres> | null = null;
let schemaReady: Promise<void> | null = null;

export function adminDatabase() {
  if (!process.env.DATABASE_URL) return null;
  client ??= postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 20 });
  return client;
}

export async function ensureAnalyticsSchema(): Promise<void> {
  const sql = adminDatabase();
  if (!sql) return;
  schemaReady ??= (async () => {
    await sql`alter table analytics_events add column if not exists visitor_hash text`;
    await sql`alter table analytics_events add column if not exists duration_seconds integer`;
    await sql`alter table analytics_events add column if not exists city_name text`;
    await sql`alter table analytics_events add column if not exists utm_source text`;
    await sql`alter table analytics_events add column if not exists utm_medium text`;
    await sql`alter table analytics_events add column if not exists utm_campaign text`;
    await sql`create index if not exists analytics_events_visitor_idx on analytics_events(visitor_hash, occurred_at desc)`;
    await sql`create table if not exists app_feedback_submissions (
      id uuid primary key default gen_random_uuid(), challenge_id text not null, session_hash text not null,
      visitor_hash text, overall_rating smallint not null check (overall_rating between 1 and 5),
      puzzle_fairness text not null, return_intent text not null, improvement_areas jsonb not null default '[]'::jsonb,
      suggestion text, app_version text, submitted_at timestamptz not null default now(), unique(challenge_id, session_hash)
    )`;
    await sql`create index if not exists app_feedback_submitted_idx on app_feedback_submissions(submitted_at desc)`;
  })();
  return schemaReady;
}
