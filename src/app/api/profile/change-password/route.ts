import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyPassword, hashPassword, validatePassword, invalidateAllSessions, createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import { getClientIP, getUserAgent, parseDeviceInfo } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Password requirements not met: ' + validation.errors.join(', ') 
      }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions except current
    await prisma.session.updateMany({
      where: {
        userId: session.userId,
        id: { not: session.sessionId },
      },
      data: { isActive: false },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'login',
        action: 'Changed password',
      },
    });

    // Notify user via Telegram
    if (user.telegramId) {
      const ip = getClientIP(request);
      const userAgent = getUserAgent(request);
      const deviceInfo = parseDeviceInfo(userAgent);
      const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      
      await sendTelegramMessage({
        chat_id: user.telegramId,
        text: `
🔐 <b>Password Changed</b>

Password akun Anda telah diubah.

📱 Device: ${deviceInfo}
🌐 IP: ${ip}
🕐 Time: ${time}

<i>Jika ini bukan Anda, segera hubungi admin.</i>
        `.trim(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
