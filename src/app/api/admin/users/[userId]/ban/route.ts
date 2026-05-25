import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ban, reason } = body;

    // Check target user
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Can't ban admin
    if (targetUser.isAdmin) {
      return NextResponse.json({ error: 'Cannot ban admin' }, { status: 400 });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: params.userId },
      data: {
        isBanned: ban,
        banReason: ban ? reason || 'Violation of terms' : null,
      },
      select: {
        id: true,
        username: true,
        telegramId: true,
        isAdmin: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Invalidate all sessions if banned
    if (ban) {
      await prisma.session.updateMany({
        where: { userId: params.userId },
        data: { isActive: false },
      });
    }

    // Notify user via Telegram
    if (targetUser.telegramId) {
      const message = ban
        ? `
🚫 <b>Account Banned</b>

Akun Anda telah diblokir.
${reason ? `\nAlasan: ${reason}` : ''}

Hubungi admin jika Anda merasa ini adalah kesalahan.
        `.trim()
        : `
✅ <b>Account Unbanned</b>

Akun Anda telah diaktifkan kembali.
Anda sekarang dapat login kembali.
        `.trim();

      await sendTelegramMessage({
        chat_id: targetUser.telegramId,
        text: message,
      });
    }

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
