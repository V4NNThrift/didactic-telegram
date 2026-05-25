import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'auth_token';

export interface JWTPayload {
  userId: string;
  username: string;
  telegramId: string;
  isAdmin: boolean;
  sessionId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;
  
  // Verify session is still active
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });
  
  if (!session || !session.isActive || session.expiresAt < new Date()) {
    return null;
  }
  
  if (session.user.isBanned) {
    return null;
  }
  
  return payload;
}

export async function createSession(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; sessionId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) throw new Error('User not found');
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const session = await prisma.session.create({
    data: {
      userId,
      token: '', // Will be updated
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });
  
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    telegramId: user.telegramId,
    isAdmin: user.isAdmin,
    sessionId: session.id,
  };
  
  const token = generateToken(payload);
  
  await prisma.session.update({
    where: { id: session.id },
    data: { token },
  });
  
  return { token, sessionId: session.id };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isActive: false },
  });
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    errors.push('Minimal 8 karakter');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Harus mengandung huruf kecil');
  } else {
    score += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Harus mengandung huruf besar');
  } else {
    score += 1;
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Harus mengandung angka');
  } else {
    score += 1;
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password)) {
    errors.push('Harus mengandung simbol');
  } else {
    score += 1;
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { isValid: false, error: 'Username minimal 3 karakter' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username maksimal 20 karakter' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username hanya boleh huruf, angka, dan underscore' };
  }
  
  return { isValid: true };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim();
}
