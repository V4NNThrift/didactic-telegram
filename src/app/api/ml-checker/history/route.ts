import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get user's ML check history
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await prisma.mlCheckLog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        mlUserId: true,
        mlServerId: true,
        nickname: true,
        status: true,
        responseJson: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      history: history.map(h => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get ML history error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Clear user's ML check history
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.mlCheckLog.deleteMany({
      where: { userId: session.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear ML history error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
