import { createHmac } from 'node:crypto';
import { adminDatabase, ensureAnalyticsSchema } from '@/lib/adminDatabase';

const allowedEvents = ['session_start', 'engagement', 'challenge_view', 'challenge_complete', 'audio_review', 'app_feedback'];

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try { return decodeURIComponent(value).slice(0, 100); } catch { return value.slice(0, 100); }
}

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 32_000) return Response.json({ error: 'Payload too large.' }, { status: 413 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !allowedEvents.includes(String(body.eventName)) || typeof body.sessionId !== 'string' || typeof body.visitorId !== 'string') {
    return Response.json({ error: 'Invalid event.' }, { status: 400 });
  }
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret || secret.length < 32) return Response.json({ error: 'Analytics ingestion is not configured.' }, { status: 503 });

  const sessionHash = createHmac('sha256', secret).update(body.sessionId.slice(0, 100)).digest('hex');
  const visitorHash = createHmac('sha256', secret).update(body.visitorId.slice(0, 100)).digest('hex');
  const agent = request.headers.get('user-agent') || '';
  const device = /mobile|android|iphone/i.test(agent) ? 'Mobile' : 'Desktop';
  const browser = /edg/i.test(agent) ? 'Edge' : /firefox/i.test(agent) ? 'Firefox' : /chrome/i.test(agent) ? 'Chrome' : /safari/i.test(agent) ? 'Safari' : 'Other';
  const sql = adminDatabase();
  if (!sql) return Response.json({ error: 'Analytics database is not configured.' }, { status: 503 });
  await ensureAnalyticsSchema();

  await sql`
    insert into analytics_events (event_name, occurred_at, session_hash, challenge_id, challenge_number,
      audio_clip_id, language_id, outcome, attempts, page_path, referrer_host, locale, timezone,
      country_code, region_code, city_name, device_type, browser_family, visitor_hash, duration_seconds,
      utm_source, utm_medium, utm_campaign)
    values (${String(body.eventName)}, ${String(body.occurredAt || new Date().toISOString())}, ${sessionHash},
      ${String(body.challengeId || '')}, ${Number(body.challengeNumber || 0) || null}, ${String(body.audioClipId || '') || null},
      ${String(body.languageId || '') || null}, ${String(body.outcome || '') || null}, ${Number(body.attempts || 0) || null},
      ${String(body.pagePath || '').slice(0, 200)}, ${String(body.referrerHost || '').slice(0, 200) || null},
      ${String(body.locale || '').slice(0, 30) || null}, ${String(body.timezone || '').slice(0, 60) || null},
      ${request.headers.get('x-vercel-ip-country')}, ${request.headers.get('x-vercel-ip-country-region')},
      ${decodeHeader(request.headers.get('x-vercel-ip-city'))}, ${device}, ${browser}, ${visitorHash},
      ${Math.min(86_400, Math.max(0, Number(body.durationSeconds || 0))) || null},
      ${String(body.utmSource || '').slice(0, 100) || null}, ${String(body.utmMedium || '').slice(0, 100) || null},
      ${String(body.utmCampaign || '').slice(0, 100) || null})
  `;
  if (body.eventName === 'audio_review' && body.review && typeof body.review === 'object') {
    const review = body.review as Record<string, unknown>;
    const ratings = (review.ratings || {}) as Record<string, unknown>;
    const issueFlags = Array.isArray(review.issues) ? review.issues.map(String) : [];
    await sql`
      insert into audio_review_feedback (challenge_id, audio_clip_id, language_id, session_hash, language_proficiency,
        pronunciation_rating, fluency_rating, audio_quality_rating, naturalness_rating, issue_flags, notes)
      values (${String(body.challengeId)}, ${String(body.audioClipId)}, ${String(body.languageId)}, ${sessionHash},
        ${String(review.languageProficiency)}, ${Number(ratings.pronunciation)}, ${Number(ratings.fluency)},
        ${Number(ratings.audioQuality)}, ${Number(ratings.naturalness)}, ${sql.json(issueFlags)},
        ${String(review.notes || '').slice(0, 240) || null})
      on conflict (challenge_id, session_hash) do update set
        language_proficiency = excluded.language_proficiency, pronunciation_rating = excluded.pronunciation_rating,
        fluency_rating = excluded.fluency_rating, audio_quality_rating = excluded.audio_quality_rating,
        naturalness_rating = excluded.naturalness_rating, issue_flags = excluded.issue_flags,
        notes = excluded.notes, submitted_at = now()
    `;
  }
  if (body.eventName === 'app_feedback' && body.feedback && typeof body.feedback === 'object') {
    const feedback = body.feedback as Record<string, unknown>;
    const areas = Array.isArray(feedback.improvementAreas) ? feedback.improvementAreas.map(String).slice(0, 10) : [];
    await sql`
      insert into app_feedback_submissions (challenge_id, session_hash, visitor_hash, overall_rating,
        puzzle_fairness, return_intent, improvement_areas, suggestion, app_version)
      values (${String(body.challengeId || '')}, ${sessionHash}, ${visitorHash}, ${Number(feedback.overallRating)},
        ${String(feedback.puzzleFairness || '')}, ${String(feedback.returnIntent || '')}, ${sql.json(areas)},
        ${String(feedback.suggestion || '').slice(0, 500) || null}, ${String(feedback.appVersion || '').slice(0, 50) || null})
      on conflict (challenge_id, session_hash) do update set overall_rating = excluded.overall_rating,
        puzzle_fairness = excluded.puzzle_fairness, return_intent = excluded.return_intent,
        improvement_areas = excluded.improvement_areas, suggestion = excluded.suggestion,
        app_version = excluded.app_version, submitted_at = now()
    `;
  }
  return Response.json({ accepted: true, persisted: true }, { status: 202 });
}
