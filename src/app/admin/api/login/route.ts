import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, isAdminAuthConfigured, passwordIsValid } from '@/lib/adminAuth';

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) return NextResponse.json({ error: 'Admin authentication is not configured.' }, { status: 503 });
  const form = await request.formData();
  const password = String(form.get('password') || '');
  if (!(await passwordIsValid(password))) return NextResponse.redirect(new URL('/admin/login?error=1', request.url), 303);

  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/admin', maxAge: 60 * 60 * 12,
  });
  return response;
}
