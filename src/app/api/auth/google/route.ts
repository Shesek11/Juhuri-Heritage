import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CALLBACK_URL = `${process.env.SITE_URL || 'https://jun-juhuri.com'}/api/auth/google/callback`;

export async function GET(request: NextRequest) {
  // Save the page the user was on so we can redirect back after login
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: CALLBACK_URL,
    response_type: 'code',
    scope: 'profile email',
    state: Buffer.from(returnTo).toString('base64url'),
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
