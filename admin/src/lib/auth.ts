import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'lingo_admin_session';

function sessionSecret(): Uint8Array {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  return new TextEncoder().encode(value);
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD_HASH &&
    process.env.ADMIN_SESSION_SECRET &&
    process.env.ADMIN_SESSION_SECRET.length >= 32
  );
}

export async function createSessionToken(email: string): Promise<string> {
  return new SignJWT({ email, role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(sessionSecret());
}

export async function verifySessionToken(token?: string): Promise<boolean> {
  if (!token || !isAuthConfigured()) return false;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return payload.role === 'owner' && payload.email === process.env.ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect('/login');
}
