import 'server-only';

import { adminDatabase, ensureAnalyticsSchema } from '@/lib/adminDatabase';

export interface DashboardData {
  mode: 'not-configured' | 'database'; rangeDays: number;
  totals: { visitors: number; sessions: number; views: number; completions: number; reviews: number; returning: number; avgSeconds: number };
  daily: Array<{ date: string; visitors: number; sessions: number; completions: number }>;
  countries: Array<{ label: string; value: number }>; devices: Array<{ label: string; value: number }>; sources: Array<{ label: string; value: number }>;
  visitors: Array<{ visitor: string; session: string; firstAt: string; lastAt: string; location: string; device: string; browser: string; source: string; durationSeconds: number; events: number; completed: boolean; returning: boolean }>;
  reviews: Array<{ clip: string; language: string; proficiency: string; pronunciation: number; fluency: number; quality: number; naturalness: number; issues: string[]; submittedAt: string }>;
}

const empty = (rangeDays: number): DashboardData => ({ mode: 'not-configured', rangeDays, totals: { visitors: 0, sessions: 0, views: 0, completions: 0, reviews: 0, returning: 0, avgSeconds: 0 }, daily: [], countries: [], devices: [], sources: [], visitors: [], reviews: [] });
type ValueRow = { label: string; value: number };

export async function getDashboardData(rangeDays = 30): Promise<DashboardData> {
  const days = [7, 30, 90].includes(rangeDays) ? rangeDays : 30;
  const sql = adminDatabase();
  if (!sql) return empty(days);
  await ensureAnalyticsSchema();

  const [totals, dailyRows, countryRows, deviceRows, sourceRows, visitorRows, reviewRows] = await Promise.all([
    sql<Array<Record<string, number>>>`
      with ranged as (select * from analytics_events where occurred_at >= now() - (${days} * interval '1 day')),
      session_times as (select session_hash, max(coalesce(duration_seconds, 0)) seconds from ranged group by session_hash),
      visitor_sessions as (select coalesce(visitor_hash, session_hash) visitor, count(distinct session_hash) sessions from ranged group by 1)
      select count(distinct coalesce(visitor_hash, session_hash))::int visitors, count(distinct session_hash)::int sessions,
        count(*) filter (where event_name = 'challenge_view')::int views,
        count(*) filter (where event_name = 'challenge_complete')::int completions,
        count(*) filter (where event_name = 'audio_review')::int reviews,
        (select count(*)::int from visitor_sessions where sessions > 1) returning,
        coalesce((select round(avg(seconds))::int from session_times), 0) avg_seconds from ranged
    `,
    sql<Array<Record<string, string | number>>>`
      with dates as (select generate_series(current_date - (${days - 1} * interval '1 day'), current_date, interval '1 day')::date day),
      events as (select occurred_at::date day, count(distinct coalesce(visitor_hash, session_hash))::int visitors,
        count(distinct session_hash)::int sessions, count(*) filter (where event_name = 'challenge_complete')::int completions
        from analytics_events where occurred_at >= current_date - (${days - 1} * interval '1 day') group by 1)
      select dates.day::text date, coalesce(events.visitors, 0)::int visitors, coalesce(events.sessions, 0)::int sessions,
        coalesce(events.completions, 0)::int completions from dates left join events using(day) order by dates.day
    `,
    sql<Array<ValueRow>>`select coalesce(nullif(concat_ws(', ', city_name, region_code, country_code), ''), 'Unknown') label, count(distinct session_hash)::int value from analytics_events where occurred_at >= now() - (${days} * interval '1 day') group by 1 order by value desc limit 8`,
    sql<Array<ValueRow>>`select coalesce(device_type, 'Unknown') label, count(distinct session_hash)::int value from analytics_events where occurred_at >= now() - (${days} * interval '1 day') group by 1 order by value desc`,
    sql<Array<ValueRow>>`select coalesce(nullif(utm_source, ''), nullif(referrer_host, ''), 'Direct') label, count(distinct session_hash)::int value from analytics_events where occurred_at >= now() - (${days} * interval '1 day') group by 1 order by value desc limit 8`,
    sql<Array<Record<string, string | number | boolean>>>`
      with sessions as (select session_hash, coalesce(visitor_hash, session_hash) visitor_hash, min(occurred_at) first_at, max(occurred_at) last_at,
        max(country_code) country_code, max(region_code) region_code, max(city_name) city_name, max(device_type) device_type,
        max(browser_family) browser_family, coalesce(max(nullif(utm_source, '')), max(nullif(referrer_host, '')), 'Direct') source,
        max(coalesce(duration_seconds, 0))::int duration_seconds, count(*)::int events,
        bool_or(event_name = 'challenge_complete') completed
        from analytics_events where occurred_at >= now() - (${days} * interval '1 day') group by session_hash, coalesce(visitor_hash, session_hash))
      select sessions.*, exists(select 1 from analytics_events earlier where coalesce(earlier.visitor_hash, earlier.session_hash) = sessions.visitor_hash and earlier.occurred_at < sessions.first_at) returning
      from sessions order by last_at desc limit 100
    `,
    sql<Array<Record<string, string | number | string[]>>>`select audio_clip_id, language_id, language_proficiency, pronunciation_rating, fluency_rating, audio_quality_rating, naturalness_rating, issue_flags, submitted_at::text from audio_review_feedback order by submitted_at desc limit 50`,
  ]);
  const total = totals[0] || {};
  return {
    mode: 'database', rangeDays: days,
    totals: { visitors: Number(total.visitors || 0), sessions: Number(total.sessions || 0), views: Number(total.views || 0), completions: Number(total.completions || 0), reviews: Number(total.reviews || 0), returning: Number(total.returning || 0), avgSeconds: Number(total.avg_seconds || 0) },
    daily: dailyRows.map((row) => ({ date: String(row.date), visitors: Number(row.visitors), sessions: Number(row.sessions), completions: Number(row.completions) })),
    countries: countryRows.map((row) => ({ label: String(row.label), value: Number(row.value) })), devices: deviceRows.map((row) => ({ label: String(row.label), value: Number(row.value) })), sources: sourceRows.map((row) => ({ label: String(row.label), value: Number(row.value) })),
    visitors: visitorRows.map((row) => ({ visitor: `${String(row.visitor_hash).slice(0, 7)}…`, session: `${String(row.session_hash).slice(0, 7)}…`, firstAt: String(row.first_at), lastAt: String(row.last_at), location: [row.city_name, row.region_code, row.country_code].filter(Boolean).join(', ') || 'Unknown', device: String(row.device_type || 'Unknown'), browser: String(row.browser_family || 'Unknown'), source: String(row.source || 'Direct'), durationSeconds: Number(row.duration_seconds || 0), events: Number(row.events || 0), completed: Boolean(row.completed), returning: Boolean(row.returning) })),
    reviews: reviewRows.map((row) => ({ clip: String(row.audio_clip_id), language: String(row.language_id), proficiency: String(row.language_proficiency), pronunciation: Number(row.pronunciation_rating), fluency: Number(row.fluency_rating), quality: Number(row.audio_quality_rating), naturalness: Number(row.naturalness_rating), issues: Array.isArray(row.issue_flags) ? row.issue_flags.map(String) : [], submittedAt: String(row.submitted_at) })),
  };
}
