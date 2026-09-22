import 'server-only';
import { adminDatabase, ensureAnalyticsSchema } from '@/lib/adminDatabase';

export interface AdminReview { id: string; clip: string; language: string; proficiency: string; ratings: number[]; issues: string[]; notes: string; status: string; submittedAt: string }
export interface AdminFeedback { id: string; rating: number; fairness: string; returnIntent: string; areas: string[]; suggestion: string; challenge: string; version: string; submittedAt: string }

export async function getReviewQueue(reportsOnly = false): Promise<AdminReview[]> {
  const sql = adminDatabase(); if (!sql) return []; await ensureAnalyticsSchema();
  const rows = reportsOnly
    ? await sql<Array<Record<string, string | number | string[]>>>`select id::text, audio_clip_id, language_id, language_proficiency, pronunciation_rating, fluency_rating, audio_quality_rating, naturalness_rating, issue_flags, notes, moderation_status, submitted_at::text from audio_review_feedback where jsonb_array_length(issue_flags) > 0 or notes is not null order by submitted_at desc limit 500`
    : await sql<Array<Record<string, string | number | string[]>>>`select id::text, audio_clip_id, language_id, language_proficiency, pronunciation_rating, fluency_rating, audio_quality_rating, naturalness_rating, issue_flags, notes, moderation_status, submitted_at::text from audio_review_feedback order by submitted_at desc limit 500`;
  return rows.map((row) => ({ id: String(row.id), clip: String(row.audio_clip_id), language: String(row.language_id), proficiency: String(row.language_proficiency), ratings: [Number(row.pronunciation_rating), Number(row.fluency_rating), Number(row.audio_quality_rating), Number(row.naturalness_rating)], issues: Array.isArray(row.issue_flags) ? row.issue_flags.map(String) : [], notes: String(row.notes || ''), status: String(row.moderation_status), submittedAt: String(row.submitted_at) }));
}

export async function getAppFeedback(): Promise<AdminFeedback[]> {
  const sql = adminDatabase(); if (!sql) return []; await ensureAnalyticsSchema();
  const rows = await sql<Array<Record<string, string | number | string[]>>>`select id::text, overall_rating, puzzle_fairness, return_intent, improvement_areas, suggestion, challenge_id, app_version, submitted_at::text from app_feedback_submissions order by submitted_at desc limit 500`;
  return rows.map((row) => ({ id: String(row.id), rating: Number(row.overall_rating), fairness: String(row.puzzle_fairness), returnIntent: String(row.return_intent), areas: Array.isArray(row.improvement_areas) ? row.improvement_areas.map(String) : [], suggestion: String(row.suggestion || ''), challenge: String(row.challenge_id), version: String(row.app_version || ''), submittedAt: String(row.submitted_at) }));
}
