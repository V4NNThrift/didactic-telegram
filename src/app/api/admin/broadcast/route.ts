import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { broadcastMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isAdmin: true, username: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Get all user Telegram IDs
    const users = await prisma.user.findMany({
      where: { 
        isBanned: false,
        telegramId: { not: null },
      },
      select: { telegramId: true },
    });

    const telegramIds = users.map(u => u.telegramId).filter(Boolean) as string[];

    // Format broadcast message
    const formattedMessage = `
📢 <b>Broadcast from Nexus AI</b>

${message.trim()}

<i>— Admin Team</i>
    `.trim();

    // Send broadcast
    const successCount = await broadcastMessage(telegramIds, formattedMessage);

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'login',
        action: `Sent broadcast to ${successCount} users`,
      },
    });

    return NextResponse.json({
      success: true,
      sent: successCount,
      total: telegramIds.length,
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
