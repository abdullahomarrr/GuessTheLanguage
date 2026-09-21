# Lingo Control

Private sibling application for Lingo analytics and community audio-quality reviews.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Run `npm run hash-password` and place the resulting hash in `ADMIN_PASSWORD_HASH`.
3. Set two different random secrets for sessions and analytics hashing.
4. Optionally apply `database/schema.sql` to Postgres and set `DATABASE_URL`. Without it, the dashboard uses clearly labelled demo data and ingestion does not persist.
5. Run `npm run dev`; the admin app uses `http://localhost:3001`.
6. In the Lingo app, set `NEXT_PUBLIC_LINGO_ANALYTICS_ENDPOINT=http://localhost:3001/api/ingest`.

## Privacy and security boundaries

- Raw IP addresses, precise coordinates, full user-agent strings, names, and emails are not stored.
- Session IDs are browser-session scoped and HMAC-hashed before storage.
- IP-derived country/region is approximate. Add it to Lingo's privacy notice and consent flow where required.
- The ingestion API validates origins and payload shape. Add platform rate limiting before production.
- Community reviews remain pending evidence and cannot approve an audio clip.
- Replace owner password auth with managed MFA/SSO before a serious public launch.
