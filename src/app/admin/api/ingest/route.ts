import { createHmac } from 'node:crypto';
import { adminDatabase } from '@/lib/adminDatabase';

const allowedEvents = ['challenge_view', 'challenge_complete', 'audio_review'];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !allowedEvents.includes(String(body.eventName)) || typeof body.sessionId !== 'string') {
    return Response.json({ error: 'Invalid event.' }, { status: 400 });
  }
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret || secret.length < 32) return Response.json({ error: 'Analytics ingestion is not configured.' }, { status: 503 });

  const sessionHash = createHmac('sha256', secret).update(body.sessionId.slice(0, 100)).digest('hex');
  const agent = request.headers.get('user-agent') || '';
  const device = /mobile|android|iphone/i.test(agent) ? 'Mobile' : 'Desktop';
  const browser = /edg/i.test(agent) ? 'Edge' : /firefox/i.test(agent) ? 'Firefox' : /chrome/i.test(agent) ? 'Chrome' : /safari/i.test(agent) ? 'Safari' : 'Other';
  const sql = adminDatabase();
  if (!sql) return Response.json({ error: 'Analytics database is not configured.' }, { status: 503 });

  await sql`
    insert into analytics_events (event_name, occurred_at, session_hash, challenge_id, challenge_number,
      audio_clip_id, language_id, outcome, attempts, page_path, referrer_host, locale, timezone,
      country_code, region_code, device_type, browser_family)
    values (${String(body.eventName)}, ${String(body.occurredAt || new Date().toISOString())}, ${sessionHash},
      ${String(body.challengeId || '')}, ${Number(body.challengeNumber || 0) || null}, ${String(body.audioClipId || '') || null},
      ${String(body.languageId || '') || null}, ${String(body.outcome || '') || null}, ${Number(body.attempts || 0) || null},
      ${String(body.pagePath || '').slice(0, 200)}, ${String(body.referrerHost || '').slice(0, 200) || null},
      ${String(body.locale || '').slice(0, 30) || null}, ${String(body.timezone || '').slice(0, 60) || null},
      ${request.headers.get('x-vercel-ip-country')}, ${request.headers.get('x-vercel-ip-country-region')}, ${device}, ${browser})
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
  return Response.json({ accepted: true, persisted: true }, { status: 202 });
}
