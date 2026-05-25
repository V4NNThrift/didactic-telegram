import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOTP, sanitizeInput } from '@/lib/auth';
import { sendOtpToTelegram } from '@/lib/telegram';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telegramId = sanitizeInput(body.telegramId || '');

    // Validate input
    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID diperlukan' },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(telegramId)) {
      return NextResponse.json(
        { error: 'Telegram ID harus berupa angka' },
        { status: 400 }
      );
    }

    // Check rate limit
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(ip, 'otp-request');
    
    if (!rateLimitResult.allowed) {
      const waitSeconds = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Tunggu ${waitSeconds} detik sebelum meminta OTP baru` },
        { status: 429 }
      );
    }

    // Check if Telegram ID already registered
    const existingUser = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Telegram ID sudah terdaftar. Silakan login.' },
        { status: 400 }
      );
    }

    // Invalidate any existing OTPs
    await prisma.otpCode.updateMany({
      where: {
        telegramId,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP
    await prisma.otpCode.create({
      data: {
        code: otp,
        telegramId,
        expiresAt,
      },
    });

    // Send OTP via Telegram
    const sent = await sendOtpToTelegram(telegramId, otp);

    if (!sent) {
      return NextResponse.json(
        { error: 'Gagal mengirim OTP. Pastikan Anda sudah /start bot dan Telegram ID benar.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP terkirim ke Telegram',
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
