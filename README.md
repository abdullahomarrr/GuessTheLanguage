# Lingo

Lingo is a daily audio geography game: listen to a mystery speaker and work out where they are from in five guesses.

Each daily challenge combines a real voice recording with an interactive globe, geographic feedback, optional clues, and a Wordle-inspired one-game-per-day experience. The current development challenge features an Urdu recording from Pakistan.

## What is included

- Daily mystery-voice challenge with five attempts
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
├── admin/               Independently runnable private admin dashboard
├── docs/                Architecture documentation
└── test/                Game-logic tests
```

The frontend does not depend directly on a final database or audio-storage provider. The repository layer currently uses development data and is designed to move to Postgres/Supabase plus S3, R2, or Supabase Storage later. A language may belong to multiple regions, audio may come from multiple providers, and candidate recordings are not production-ready until reviewed and approved.

## Run the game locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm test
npm run lint
npm run build
```

## Run the admin dashboard

The admin dashboard is a separate Next.js application inside `admin/` and runs on port `3001`.

```powershell
cd admin
npm install
Copy-Item .env.example .env.local
npm run hash-password
npm run dev
```

Add the generated password hash and your private secrets to `admin/.env.local`, then open [http://localhost:3001/login](http://localhost:3001/login). To send local game analytics to it, add this to the main app's `.env.local`:

```env
NEXT_PUBLIC_LINGO_ANALYTICS_ENDPOINT=http://localhost:3001/api/ingest
```

The dashboard uses labelled demo data when `DATABASE_URL` is empty. Its Postgres-ready schema lives at `admin/database/schema.sql`. See [`admin/README.md`](admin/README.md) for the security and privacy boundaries.

## Data and audio pipeline

The `data-pipeline/` directory contains the starter schema, source documentation, normalization scripts, and candidate manifests. It is intentionally review-first: sourced clips retain their provider, licence, attribution, transcript, translation, dialect, geographic anchors, and verification state.

See [`docs/DATA_LAYER.md`](docs/DATA_LAYER.md) for the application architecture and [`data-pipeline/README.md`](data-pipeline/README.md) for pipeline usage.

## Current status

Lingo is under active development. The mock catalogue works end-to-end, while the domain boundaries and adapters are prepared for a production database, private answer validation, server-side geo hints, managed authentication, and a larger reviewed language catalogue.

## Privacy

The analytics design avoids storing raw IP addresses, precise coordinates, full user-agent strings, names, or emails. Approximate IP-derived location requires an appropriate privacy notice and consent flow before production use.
