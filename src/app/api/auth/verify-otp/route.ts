import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeInput } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telegramId = sanitizeInput(body.telegramId || '');
    const otp = sanitizeInput(body.otp || '');

    // Validate input
    if (!telegramId || !otp) {
      return NextResponse.json(
        { error: 'Telegram ID dan OTP diperlukan' },
        { status: 400 }
      );
    }

    if (otp.length !== 6) {
      return NextResponse.json(
        { error: 'OTP harus 6 digit' },
        { status: 400 }
      );
    }

    // Check rate limit
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(`${ip}-${telegramId}`, 'otp-verify');
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Tunggu beberapa menit.' },
        { status: 429 }
      );
    }

    // Find valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        telegramId,
        code: otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      // Increment attempts on the latest OTP
      const latestOtp = await prisma.otpCode.findFirst({
        where: { telegramId, isUsed: false },
        orderBy: { createdAt: 'desc' },
      });

      if (latestOtp) {
        await prisma.otpCode.update({
          where: { id: latestOtp.id },
          data: { attempts: latestOtp.attempts + 1 },
        });

        if (latestOtp.attempts >= 4) {
          await prisma.otpCode.update({
            where: { id: latestOtp.id },
            data: { isUsed: true },
          });
          return NextResponse.json(
            { error: 'OTP expired karena terlalu banyak percobaan. Minta OTP baru.' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: 'OTP tidak valid atau sudah expired' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Minta OTP baru.' },
        { status: 400 }
      );
    }

    // Mark as verified (but not used yet - will be used during registration)
    return NextResponse.json({
      success: true,
      message: 'OTP terverifikasi',
      verified: true,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
