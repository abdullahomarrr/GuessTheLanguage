type AnalyticsEventName = 'challenge_view' | 'challenge_complete' | 'audio_review';

interface AnalyticsPayload {
  challengeId: string;
  challengeNumber?: number;
  audioClipId?: string;
  languageId?: string;
  outcome?: 'WON' | 'LOST';
  attempts?: number;
  review?: unknown;
}

function getSessionId(): string {
  const key = 'lingo_analytics_session_v1';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload): void {
  if (typeof window === 'undefined') return;
  const endpoint = process.env.NEXT_PUBLIC_LINGO_ANALYTICS_ENDPOINT || '/admin/api/ingest';

  const body = JSON.stringify({
    eventName,
    occurredAt: new Date().toISOString(),
    sessionId: getSessionId(),
    pagePath: window.location.pathname,
    referrerHost: document.referrer ? new URL(document.referrer).hostname : null,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...payload,
  });

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => undefined);
}
