import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';
const CALLBACK_URL = `${SITE_URL}/api/auth/facebook/callback`;

// GET /api/auth/facebook — redirect to Facebook OAuth
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID!,
    redirect_uri: CALLBACK_URL,
    scope: 'email,public_profile',
    response_type: 'code',
    state: Buffer.from(returnTo).toString('base64url'),
  });

  return NextResponse.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
}
