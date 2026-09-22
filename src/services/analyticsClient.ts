type AnalyticsEventName = 'session_start' | 'engagement' | 'challenge_view' | 'challenge_complete' | 'audio_review';

interface AnalyticsPayload {
  challengeId?: string;
  challengeNumber?: number;
  audioClipId?: string;
  languageId?: string;
  outcome?: 'WON' | 'LOST';
  attempts?: number;
  review?: unknown;
  durationSeconds?: number;
}

const endpoint = process.env.NEXT_PUBLIC_LINGO_ANALYTICS_ENDPOINT || '/admin/api/ingest';
const sessionStartedAt = Date.now();
let sessionTrackingStarted = false;
let memorySessionId: string | null = null;
let memoryVisitorId: string | null = null;

function getSessionId(): string {
  const key = 'lingo_analytics_session_v1';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return memorySessionId ??= crypto.randomUUID();
  }
}

function getVisitorId(): string {
  const key = 'lingo_analytics_visitor_v1';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return memoryVisitorId ??= crypto.randomUUID();
  }
}

function referrerHost(): string | null {
  try {
    return document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    return null;
  }
}

function eventBody(eventName: AnalyticsEventName, payload: AnalyticsPayload): string {
  const search = new URLSearchParams(window.location.search);
  return JSON.stringify({
    eventName,
    occurredAt: new Date().toISOString(),
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    pagePath: window.location.pathname,
    referrerHost: referrerHost(),
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utmSource: search.get('utm_source'),
    utmMedium: search.get('utm_medium'),
    utmCampaign: search.get('utm_campaign'),
    ...payload,
  });
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload): void {
  if (typeof window === 'undefined') return;
  const body = eventBody(eventName, payload);

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => undefined);
}

export function startAnalyticsSession(): () => void {
  if (typeof window === 'undefined' || sessionTrackingStarted) return () => undefined;
  sessionTrackingStarted = true;
  trackAnalyticsEvent('session_start', {});

  const reportEngagement = (beacon = false) => {
    const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
    const body = eventBody('engagement', { durationSeconds });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    }
  };

  const interval = window.setInterval(() => {
    if (document.visibilityState === 'visible') reportEngagement();
  }, 30_000);
  const onPageHide = () => reportEngagement(true);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener('pagehide', onPageHide);
    reportEngagement(true);
    sessionTrackingStarted = false;
  };
}
