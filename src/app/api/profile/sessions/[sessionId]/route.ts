import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE - Revoke specific session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Can't revoke current session
    if (params.sessionId === session.sessionId) {
      return NextResponse.json({ error: 'Cannot revoke current session' }, { status: 400 });
    }

    // Verify ownership
    const targetSession = await prisma.session.findFirst({
      where: {
        id: params.sessionId,
        userId: session.userId,
      },
    });

    if (!targetSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.session.update({
      where: { id: params.sessionId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke session error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
