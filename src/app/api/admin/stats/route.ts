import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      bannedUsers,
      totalChats,
      totalMessages,
      totalLogins,
      todayLogins,
      aiUsage,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.aiChat.count(),
      prisma.aiMessage.count(),
      prisma.loginLog.count({ where: { status: 'success' } }),
      prisma.loginLog.count({
        where: {
          status: 'success',
          createdAt: { gte: today },
        },
      }),
      prisma.aiUsageLog.count(),
    ]);

    // Active users (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: { gte: sevenDaysAgo },
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalChats,
        totalMessages,
        totalLogins,
        todayLogins,
        aiUsage,
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
