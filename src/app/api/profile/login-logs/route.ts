import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get login history
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.loginLog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        ipAddress: true,
        deviceInfo: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      logs: logs.map(l => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get login logs error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
