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
    const admin = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        telegramId: true,
        isAdmin: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            aiChats: true,
            loginLogs: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
