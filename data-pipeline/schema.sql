-- Postgres / Supabase-ready catalog and challenge schema.
create table if not exists languages (
  id text primary key,
  glottocode text unique,
  iso639_3 text,
  iso_codes jsonb not null default '[]'::jsonb,
  name text not null,
  native_name text,
  aliases jsonb not null default '[]'::jsonb,
  level text check (level in ('language', 'dialect')),
  parent_id text references languages(id),
  macroarea text,
  difficulty text,
  enabled boolean not null default false,
  source_name text not null,
  source_url text,
  source_license text not null,
  source_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists languages_iso639_3_idx on languages(iso639_3);
create index if not exists languages_parent_id_idx on languages(parent_id);

create table if not exists language_variants (
  id text primary key,
  language_id text not null references languages(id),
  name text not null,
  aliases jsonb not null default '[]'::jsonb,
  region text,
  latitude double precision,
  longitude double precision,
  enabled boolean not null default false
);

-- A language can have many geographic associations. None is implicitly its
-- speaker country or challenge answer.
create table if not exists language_geographies (
  id uuid primary key default gen_random_uuid(),
  language_id text not null references languages(id),
  variant_id text references language_variants(id),
  hint_type text not null default 'DISABLED',
  latitude double precision,
  longitude double precision,
  continent text,
  country_code text,
  country_name text,
  region_name text,
  polygon_id text,
  label text,
  is_primary boolean not null default false,
  source_name text,
  source_url text
);

create table if not exists audio_clips (
  id uuid primary key default gen_random_uuid(),
  language_id text not null references languages(id),
  variant_id text references language_variants(id),
  audio_url text not null,
  storage_key text,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  transcript_original text,
  translation_english text,
  transcript_license text,
  translation_license text,
  speaker_region text,
  recording_geo_anchor jsonb,
  source_name text not null,
  source_url text,
  license text not null,
  creator text,
  attribution text,
  attribution_url text,
  language_verified boolean not null default false,
  dialect_verified boolean not null default false,
  transcript_verified boolean not null default false,
  translation_verified boolean not null default false,
  direct_giveaway_checked boolean not null default false,
  review_status text not null default 'PENDING',
  approved_for_game boolean not null default false,
  review_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists audio_clips_language_id_idx on audio_clips(language_id);
create index if not exists audio_clips_review_queue_idx
  on audio_clips(review_status, approved_for_game);

-- Player feedback is evidence for moderators, never an approval mechanism.
-- Production should identify or rate-limit reviewers outside this table.
create table if not exists audio_clip_community_reviews (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid,
  audio_clip_id uuid not null references audio_clips(id),
  reviewer_id uuid,
  language_proficiency text not null check (
    language_proficiency in ('NATIVE', 'FLUENT', 'LEARNING', 'NOT_SPEAKER')
  ),
  pronunciation_rating smallint not null check (pronunciation_rating between 1 and 5),
  fluency_rating smallint not null check (fluency_rating between 1 and 5),
  audio_quality_rating smallint not null check (audio_quality_rating between 1 and 5),
  naturalness_rating smallint not null check (naturalness_rating between 1 and 5),
  issue_flags jsonb not null default '[]'::jsonb,
  notes text,
  submission_status text not null default 'PENDING',
  submitted_at timestamptz not null default now(),
  unique (challenge_id, reviewer_id)
);

create index if not exists audio_clip_community_reviews_queue_idx
  on audio_clip_community_reviews(audio_clip_id, submission_status);

create table if not exists daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date unique not null,
  challenge_number integer unique not null,
  language_id text not null references languages(id),
  audio_clip_id uuid not null references audio_clips(id),
  answer_mode text not null default 'LANGUAGE',
  answer_geo_anchor jsonb,
  difficulty text,
  ai_question_limit integer not null default 1,
  proximity_hint_starts_at_guess integer not null default 3,
  active boolean not null default true
);

-- Challenge publication should occur through a transaction/function that checks
-- the referenced clip's approval and verification flags. Cross-table review
-- policy is intentionally enforced in the service layer as well.
