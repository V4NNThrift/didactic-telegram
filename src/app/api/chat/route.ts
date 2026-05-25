import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List all chats for user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await prisma.aiChat.findMany({
      where: { 
        userId: session.userId,
        isArchived: false,
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        isPinned: true,
        isArchived: true,
        mode: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({
      chats: chats.map(chat => ({
        ...chat,
        messageCount: chat._count.messages,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new chat
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = body.title || 'New Chat';
    const mode = body.mode || 'smart';

    const chat = await prisma.aiChat.create({
      data: {
        userId: session.userId,
        title,
        mode,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'chat',
        action: 'Started new chat',
      },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
