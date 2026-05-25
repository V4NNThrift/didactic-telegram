import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession, sanitizeInput } from '@/lib/auth';
import { sendLoginNotification, notifyOwnerLogin } from '@/lib/telegram';
import { checkRateLimit, getClientIP, getUserAgent, parseDeviceInfo } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = sanitizeInput(body.username || '').toLowerCase();
    const password = body.password || '';
    const rememberMe = body.rememberMe || false;

    // Validate inputs
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password diperlukan' },
        { status: 400 }
      );
    }

    // Get client info
    const ip = getClientIP(request);
    const userAgent = getUserAgent(request);
    const deviceInfo = parseDeviceInfo(userAgent);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(`${ip}-login`, 'login');
    
    if (!rateLimitResult.allowed) {
      const waitMinutes = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Tunggu ${waitMinutes} menit.` },
        { status: 429 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // Log failed attempt
      await prisma.loginLog.create({
        data: {
          userId: 'unknown',
          ipAddress: ip,
          userAgent,
          deviceInfo,
          status: 'failed',
          reason: 'User not found',
        },
      }).catch(() => {}); // Ignore if no user FK

      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Check if banned
    if (user.isBanned) {
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          ipAddress: ip,
          userAgent,
          deviceInfo,
          status: 'blocked',
          reason: user.banReason || 'Account banned',
        },
      });

      return NextResponse.json(
        { error: 'Akun Anda diblokir. Hubungi admin.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          ipAddress: ip,
          userAgent,
          deviceInfo,
          status: 'failed',
          reason: 'Wrong password',
        },
      });

      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Create session
    const { token, sessionId } = await createSession(
      user.id,
      deviceInfo,
      ip,
      userAgent
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful login
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ipAddress: ip,
        userAgent,
        deviceInfo,
        status: 'success',
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'login',
        action: 'User logged in',
        metadata: JSON.stringify({ ip, deviceInfo }),
      },
    });

    // Send notifications
    if (user.telegramId) {
      await sendLoginNotification(user.telegramId, user.username, deviceInfo, ip);
      await notifyOwnerLogin(user.username, user.telegramId);
    }

    // Set cookie
    const cookieStore = cookies();
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60; // 7 days or 1 day
    
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
