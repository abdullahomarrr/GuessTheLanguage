import 'server-only';

import postgres from 'postgres';

let client: ReturnType<typeof postgres> | null = null;

export function database() {
  if (!process.env.DATABASE_URL) return null;
  client ??= postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 20 });
  return client;
}
