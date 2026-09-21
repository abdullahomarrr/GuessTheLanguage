import 'server-only';

import { database } from '@/lib/database';

export interface DashboardData {
  mode: 'mock' | 'database';
  totals: { visitors: number; views: number; completions: number; reviews: number };
  visitors: Array<{ session: string; viewedAt: string; location: string; device: string; browser: string; status: string }>;
  reviews: Array<{ clip: string; language: string; proficiency: string; pronunciation: number; fluency: number; quality: number; naturalness: number; issues: string[]; submittedAt: string }>;
}

const mock: DashboardData = {
  mode: 'mock',
  totals: { visitors: 1842, views: 2189, completions: 1264, reviews: 317 },
  visitors: [
    { session: 'b61f…92a', viewedAt: 'Today, 2:14 PM', location: 'Ontario, CA', device: 'Mobile', browser: 'Safari', status: 'Completed · 3 guesses' },
    { session: '08ca…f47', viewedAt: 'Today, 2:12 PM', location: 'Punjab, PK', device: 'Desktop', browser: 'Chrome', status: 'Review submitted' },
    { session: 'ac33…1bd', viewedAt: 'Today, 2:09 PM', location: 'England, GB', device: 'Mobile', browser: 'Chrome', status: 'Viewed' },
  ],
  reviews: [
    { clip: 'clip_urdu_lingualibre_preview', language: 'Urdu', proficiency: 'Native', pronunciation: 5, fluency: 5, quality: 4, naturalness: 5, issues: [], submittedAt: 'Today, 2:12 PM' },
    { clip: 'clip_urdu_lingualibre_preview', language: 'Urdu', proficiency: 'Learning', pronunciation: 4, fluency: 4, quality: 3, naturalness: 4, issues: ['Background noise'], submittedAt: 'Today, 1:58 PM' },
  ],
};

export async function getDashboardData(): Promise<DashboardData> {
  const sql = database();
  if (!sql) return mock;

  const [totals] = await sql<Array<{ visitors: number; views: number; completions: number; reviews: number }>>`
    select
      count(distinct session_hash)::int as visitors,
      count(*) filter (where event_name = 'challenge_view')::int as views,
      count(*) filter (where event_name = 'challenge_complete')::int as completions,
      count(*) filter (where event_name = 'audio_review')::int as reviews
    from analytics_events where occurred_at >= date_trunc('day', now())
  `;
  const visitorRows = await sql<Array<Record<string, string>>>`
    select session_hash, max(occurred_at)::text as viewed_at, country_code, region_code,
      device_type, browser_family, max(event_name) as status
    from analytics_events group by session_hash, country_code, region_code, device_type, browser_family
    order by max(occurred_at) desc limit 50
  `;
  const reviewRows = await sql<Array<Record<string, string | number | string[]>>>`
    select audio_clip_id, language_id, language_proficiency, pronunciation_rating,
      fluency_rating, audio_quality_rating, naturalness_rating, issue_flags, submitted_at::text
    from audio_review_feedback order by submitted_at desc limit 50
  `;

  return {
    mode: 'database',
    totals: totals || { visitors: 0, views: 0, completions: 0, reviews: 0 },
    visitors: visitorRows.map((row) => ({
      session: `${row.session_hash.slice(0, 7)}…`, viewedAt: row.viewed_at,
      location: [row.region_code, row.country_code].filter(Boolean).join(', ') || 'Unknown',
      device: row.device_type, browser: row.browser_family, status: row.status,
    })),
    reviews: reviewRows.map((row) => ({
      clip: String(row.audio_clip_id), language: String(row.language_id), proficiency: String(row.language_proficiency),
      pronunciation: Number(row.pronunciation_rating), fluency: Number(row.fluency_rating),
      quality: Number(row.audio_quality_rating), naturalness: Number(row.naturalness_rating),
      issues: Array.isArray(row.issue_flags) ? row.issue_flags.map(String) : [], submittedAt: String(row.submitted_at),
    })),
  };
}
