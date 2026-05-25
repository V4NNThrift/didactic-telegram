import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get active sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: session.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Move current session to top
    const sortedSessions = sessions.sort((a, b) => {
      if (a.id === session.sessionId) return -1;
      if (b.id === session.sessionId) return 1;
      return 0;
    });

    return NextResponse.json({
      sessions: sortedSessions.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: s.id === session.sessionId,
      })),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Revoke all other sessions
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        action: 'Revoked all other sessions',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
