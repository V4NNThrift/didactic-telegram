import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword, validateUsername, sanitizeInput } from '@/lib/auth';
import { sendRegistrationSuccess, notifyOwnerNewUser } from '@/lib/telegram';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const OWNER_ID = process.env.TELEGRAM_OWNER_ID || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telegramId = sanitizeInput(body.telegramId || '');
    const otp = sanitizeInput(body.otp || '');
    const username = sanitizeInput(body.username || '').toLowerCase();
    const password = body.password || '';

    // Validate inputs
    if (!telegramId || !otp || !username || !password) {
      return NextResponse.json(
        { error: 'Semua field diperlukan' },
        { status: 400 }
      );
    }

    // Check rate limit
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(ip, 'register');
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan registrasi. Coba lagi nanti.' },
        { status: 429 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password tidak memenuhi kriteria: ' + passwordValidation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Verify OTP again
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        telegramId,
        code: otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'OTP tidak valid atau sudah expired. Minta OTP baru.' },
        { status: 400 }
      );
    }

    // Check if username taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username sudah digunakan' },
        { status: 400 }
      );
    }

    // Check if Telegram ID already registered
    const existingTelegram = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingTelegram) {
      return NextResponse.json(
        { error: 'Telegram ID sudah terdaftar' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const isAdmin = telegramId === OWNER_ID;
    
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        telegramId,
        telegramChatId: telegramId,
        isAdmin,
      },
    });

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { 
        isUsed: true,
        userId: user.id,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'login',
        action: 'User registered',
        metadata: JSON.stringify({ ip }),
      },
    });

    // Send notifications
    await sendRegistrationSuccess(telegramId, username);
    await notifyOwnerNewUser(username, telegramId);

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
