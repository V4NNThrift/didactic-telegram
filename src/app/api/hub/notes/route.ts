import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get all notes for user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notes = await prisma.note.findMany({
      where: { userId: session.userId },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json({
      notes: notes.map(n => ({
        ...n,
        updatedAt: n.updatedAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new note
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, color } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        content: content || '',
        color: color || 'default',
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'note',
        action: `Created note: ${title.trim().slice(0, 30)}`,
      },
    });

    return NextResponse.json({
      note: {
        ...note,
        updatedAt: note.updatedAt.toISOString(),
        createdAt: note.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
