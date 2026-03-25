import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

// ─── Config ──────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('[Auth] JWT_SECRET is not set. Generate: openssl rand -base64 64');
  return secret;
}

export function getPrimaryAccountEmail(): string {
  const email = process.env.PRIMARY_ACCOUNT_EMAIL;
  if (!email) throw new Error('[Auth] PRIMARY_ACCOUNT_EMAIL is not set.');
  return email.toLowerCase();
}

const SALT_ROUNDS = 12;
const COOKIE_NAME = 'auth_token';
const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// ─── Primary account ─────────────────────────────────────────────────────────

export function isPrimaryAccount(email: string): boolean {
  try {
    return email.toLowerCase() === getPrimaryAccountEmail();
  } catch {
    return false;
  }
}

// ─── Password ────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Returns an error message or null if valid.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

// Verify token from header (doesn't need cookies())
export function getCurrentUserFromHeader(token: string): JWTPayload | null {
  return verifyToken(token);
}

// ─── Cookie ──────────────────────────────────────────────────────────────────

export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Allow cookies to be sent with top-level navigations
    maxAge: TOKEN_TTL,
    path: '/',
  });
}

export async function getAuthCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// ─── Session ─────────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

// ─── Password reset ───────────────────────────────────────────────────────────

/** Generates a cryptographically secure 64-char hex token. */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}
