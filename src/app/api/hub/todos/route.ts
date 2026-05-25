import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get all todos for user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todos = await prisma.todo.findMany({
      where: { userId: session.userId },
      orderBy: [
        { isCompleted: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      todos: todos.map(t => ({
        ...t,
        dueDate: t.dueDate?.toISOString() || null,
        updatedAt: t.updatedAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get todos error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new todo
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const todo = await prisma.todo.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        description: description || null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'todo',
        action: `Created todo: ${title.trim().slice(0, 30)}`,
      },
    });

    return NextResponse.json({
      todo: {
        ...todo,
        dueDate: todo.dueDate?.toISOString() || null,
        updatedAt: todo.updatedAt.toISOString(),
        createdAt: todo.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create todo error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
