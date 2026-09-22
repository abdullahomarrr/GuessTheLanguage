import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_SESSION_COOKIE = 'lingo_admin_session';

function sessionSecret(): Uint8Array {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters.');
  return new TextEncoder().encode(value);
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(
    (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH) &&
      process.env.ADMIN_SESSION_SECRET &&
      process.env.ADMIN_SESSION_SECRET.length >= 32,
  );
}

export async function passwordIsValid(candidate: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return bcrypt.compare(candidate, hash);

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const candidateDigest = createHash('sha256').update(candidate).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(sessionSecret());
}

export async function verifyAdminSession(token?: string): Promise<boolean> {
  if (!token || !isAdminAuthConfigured()) return false;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return payload.role === 'owner';
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(token))) redirect('/admin/login');
}
