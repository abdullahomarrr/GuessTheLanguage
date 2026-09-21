# Data layer and ingestion integration

## Runtime boundary

The React page consumes `gameDataService` and `gameplayGateway`. It does not read
mock language/audio/challenge tables directly.

- `ILanguageRepository` owns canonical language, ISO, Glottocode, alias, and
  dialect lookup.
- `IAudioRepository` owns candidates and playable recordings while retaining
  provider, license, creator, attribution, transcript, translation, and review
  metadata.
- `IChallengeRepository` owns the daily schedule.
- `IGameDataService` composes those repositories and applies publication policy.
- `IGameplayGateway` evaluates answers. The local adapter is for development;
  production can replace it with an HTTP/RPC adapter so hidden answers and geo
  rules never ship to the browser.
- `IAudioReviewRepository` stores one post-game community quality review per
  challenge. The current adapter uses localStorage; a production adapter can
  submit the same shape to Postgres/Supabase without changing the result UI.

## Geography is not identity

A language may have multiple geographic anchors. The database stores those in
`language_geographies`. A country-mode daily challenge stores an explicit
`answer_geo_anchor`, ideally derived from the reviewed recording location. The
game never assumes a language has exactly one country.

## Current provider

The current repository adapters use `src/data/mock*` and localStorage. Existing
mock clips pass through a legacy compatibility rule only when they are both
`VERIFIED` and `APPROVED`. New imported candidates must provide the detailed
verification record; defaults are non-playable.

## Real-data plug-in points

1. Run the scripts in `data-pipeline/` to produce normalized catalog and audio
   candidate files.
   The checked-in `tatoeba_starter_review.json` is a small sentence-audio review
   queue with original text, English translation, creator, per-audio licence,
   text licences, attribution URL, and official provider playback URL.
2. Review candidates and populate every verification field. Do not set
   `approved_for_game` during discovery.
3. Import reviewed rows using the schema in `data-pipeline/schema.sql`.
4. Implement Postgres/Supabase versions of the repository interfaces. Audio URLs
   may point at S3, R2, Supabase Storage, or the original provider; the UI does not
   depend on the storage vendor.
5. Replace only the repository composition and gameplay gateway exports. UI
   components remain unchanged.

## Community audio quality reviews

After completing a challenge, players can rate pronunciation, fluency, audio
quality, and naturalness, identify their proficiency in the language, and flag
specific problems. These submissions are moderation evidence only. They enter a
separate pending queue and never change `audio_clips.approved_for_game`, review
status, or verification fields automatically. Production aggregation should
weight native/fluent feedback, resist duplicate or coordinated submissions, and
always require a reviewer to approve or reject a candidate.

## Client-safe production shape

The production daily-game endpoint should return only public challenge fields and
the playable audio asset. Guess submission should send `challengeId`, candidate
answer ID, and attempt number to the server. The response returns feedback and,
only after completion, the reveal metadata. The local gateway mirrors that call
shape so the move does not require redesigning the frontend.
