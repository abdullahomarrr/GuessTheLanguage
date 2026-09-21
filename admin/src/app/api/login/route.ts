import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSessionToken, isAuthConfigured, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  if (!isAuthConfigured()) return NextResponse.json({ error: 'Admin authentication is not configured.' }, { status: 503 });
  const form = await request.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const emailMatches = email === process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordMatches = emailMatches && await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!);
  if (!passwordMatches) return NextResponse.redirect(new URL('/login?error=1', request.url), 303);

  const response = NextResponse.redirect(new URL('/', request.url), 303);
  response.cookies.set(SESSION_COOKIE, await createSessionToken(process.env.ADMIN_EMAIL!), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 60 * 60 * 12,
  });
  return response;
}
