import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get recent activities for user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activities = await prisma.activity.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      activities: activities.map(a => ({
        id: a.id,
        type: a.type,
        action: a.action,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get activities error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
