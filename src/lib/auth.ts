import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
}

function getSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return JWT_SECRET;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Extract and verify the JWT token from request cookies or Authorization header.
 * Returns the decoded user or null if no valid token is found.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // Try cookie first, then Authorization header
  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getSecret()) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Require authentication. Throws a Response if not authenticated.
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Response(JSON.stringify({ error: 'נדרשת התחברות' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

/**
 * Require specific role(s). Throws a Response if unauthorized.
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new Response(JSON.stringify({ error: 'אין לך הרשאות לפעולה זו' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

/**
 * Require admin role.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  return requireRole(request, ['admin']);
}

/**
 * Require approver role (admin or approver).
 */
export async function requireApprover(request: NextRequest): Promise<AuthUser> {
  return requireRole(request, ['admin', 'approver']);
}

/**
 * Require moderator role (admin, moderator, or approver).
 */
export async function requireModerator(request: NextRequest): Promise<AuthUser> {
  return requireRole(request, ['admin', 'moderator', 'approver']);
}

/**
 * Generate a JWT token for a user (7-day expiry).
 */
export function generateToken(user: {
  id: number;
  email: string;
  name: string;
  role: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    getSecret(),
    { expiresIn: '7d' }
  );
}
