# Lingo

Lingo is a daily audio geography game: listen to a mystery speaker and work out where they are from in five guesses.

Each daily challenge combines a real voice recording with an interactive globe, geographic feedback, optional clues, and a Wordle-inspired one-game-per-day experience. The owner-approved catalogue currently rotates through 83 stored recordings.

## What is included

- Daily mystery-voice challenge with five attempts
- Deterministic 83-day shuffle with an automatic local-midnight rollover
- Custom audio player with waveform and English translation
- Searchable country and language-aware guessing flow
- Interactive 3D globe with country highlighting
- Distance, continent, and hot/warm/cold geographic hints
- Unlockable clue questions with answer-leak protection
- Guess history, completion results, sharing, and local stats
- Community audio-quality feedback for pronunciation, fluency, clarity, and authenticity
- Provider-independent language, geography, audio, challenge, clue, and stats repositories
- Review-first audio ingestion pipeline with source, licence, transcript, translation, and verification metadata
- Private admin dashboard for analytics and audio-review monitoring

## Project structure

```text
guessthelanguage/
├── src/                 Main Lingo game
│   ├── components/      Game, globe, audio, review, and modal UI
│   ├── data/            Development language and challenge catalogue
│   ├── services/        Storage-independent repositories and game logic
│   └── types/           Shared domain models
├── public/audio/        Reviewed development audio assets
├── data-pipeline/       Candidate sourcing and normalization pipeline
├── admin/               Legacy standalone dashboard source
├── docs/                Architecture documentation
└── test/                Game-logic tests
```

The frontend does not depend directly on a final database or audio-storage provider. The repository layer currently uses development data and is designed to move to Postgres/Supabase plus S3, R2, or Supabase Storage later. A language may belong to multiple regions and audio may come from multiple providers. Only explicitly owner-approved recordings enter the daily shuffle.

## Run the game locally

Requirements: Node.js and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional Gemini clue routing

The clue system answers from the checked-in deterministic country catalogue.
Gemini is used only when the local classifier cannot understand an informally
worded question; it selects a topic and never receives the hidden country or
authors factual answers.

To enable that fallback, add the following to `.env.local`:

```env
GEMINI_API_KEY=your_key_here
# Optional; defaults to the small Flash-Lite model.
GEMINI_CLUE_MODEL=gemini-3.1-flash-lite
```

Keep this key server-side. Never prefix it with `NEXT_PUBLIC_` or commit it.
The deterministic system continues to work when the key or Gemini is unavailable.

Useful commands:

```bash
npm test
npm run lint
npm run build
```

## Admin dashboard and analytics

The password-protected dashboard is part of the main app at
[http://localhost:3000/admin](http://localhost:3000/admin), and production uses
`https://your-domain/admin`. Analytics are sent to the same deployment by
default, so a separate public endpoint is not required.

It includes 7/30/90-day traffic and completion trends, anonymous returning
visitors, engaged session time, recent activity, approximate city/region/country,
device and browser families, referrers and UTM sources, and audio reviews. Raw
IP addresses and full user-agent strings are not stored.

Configure these environment variables locally and in Vercel:

```env
# A strong password you choose (or use ADMIN_PASSWORD_HASH instead).
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
ANALYTICS_HASH_SECRET=replace-with-a-different-32-character-secret
DATABASE_URL=your-postgres-connection-string
```

For production, `ADMIN_PASSWORD_HASH` is preferred over `ADMIN_PASSWORD`. A
bcrypt hash can be generated with `cd admin; npm run hash-password`. Run
[`admin/database/schema.sql`](admin/database/schema.sql) once against the
database before collecting events. When `DATABASE_URL` is missing, the admin
page clearly shows that storage is not connected and does not display fake data.
Existing databases receive new analytics columns automatically after deployment.

## Data and audio pipeline

The `data-pipeline/` directory contains the starter schema, source documentation, normalization scripts, and candidate manifests. It is intentionally review-first: sourced clips retain their provider, licence, attribution, transcript, translation, dialect, geographic anchors, and verification state.

See [`docs/DATA_LAYER.md`](docs/DATA_LAYER.md) for the application architecture and [`data-pipeline/README.md`](data-pipeline/README.md) for pipeline usage.

## Current status

Lingo is under active development. The 83-recording owner-approved catalogue works end-to-end, while the domain boundaries and adapters are prepared for a production database, private answer validation, server-side geo hints, managed authentication, and a larger reviewed language catalogue.

## Privacy

The analytics design avoids storing raw IP addresses, precise coordinates, full user-agent strings, names, or emails. Approximate IP-derived location requires an appropriate privacy notice and consent flow before production use.

## License

Original project code and documentation are available under the
[MIT License](LICENSE). Bundled audio recordings and third-party datasets retain
their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[the audio attribution records](docs/AUDIO_ATTRIBUTION.md) before redistributing
them.
