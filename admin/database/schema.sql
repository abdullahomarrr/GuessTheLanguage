create extension if not exists pgcrypto;

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(), event_name text not null,
  occurred_at timestamptz not null default now(), received_at timestamptz not null default now(),
  session_hash text not null, visitor_hash text, challenge_id text not null, challenge_number integer,
  audio_clip_id text, language_id text, outcome text, attempts smallint,
  page_path text, referrer_host text, locale text, timezone text,
  country_code text, region_code text, city_name text, device_type text, browser_family text,
  duration_seconds integer, utm_source text, utm_medium text, utm_campaign text
);
create index if not exists analytics_events_daily_idx on analytics_events(occurred_at desc, event_name);
create index if not exists analytics_events_session_idx on analytics_events(session_hash, occurred_at desc);
create index if not exists analytics_events_visitor_idx on analytics_events(visitor_hash, occurred_at desc);

create table if not exists audio_review_feedback (
  id uuid primary key default gen_random_uuid(), challenge_id text not null,
  audio_clip_id text not null, language_id text not null, session_hash text not null,
  language_proficiency text not null,
  pronunciation_rating smallint not null check (pronunciation_rating between 1 and 5),
  fluency_rating smallint not null check (fluency_rating between 1 and 5),
  audio_quality_rating smallint not null check (audio_quality_rating between 1 and 5),
  naturalness_rating smallint not null check (naturalness_rating between 1 and 5),
  issue_flags jsonb not null default '[]'::jsonb, notes text,
  moderation_status text not null default 'PENDING', submitted_at timestamptz not null default now(),
  unique(challenge_id, session_hash)
);
create index if not exists audio_review_feedback_queue_idx on audio_review_feedback(moderation_status, submitted_at desc);

-- Retention example: schedule deletion of raw events after the period disclosed in your privacy notice.
