import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH - Update todo
export async function PATCH(
  request: NextRequest,
  { params }: { params: { todoId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate, isCompleted } = body;

    // Verify ownership
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: params.todoId,
        userId: session.userId,
      },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const todo = await prisma.todo.update({
      where: { id: params.todoId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isCompleted !== undefined && { isCompleted }),
      },
    });

    // Log activity for completion
    if (isCompleted !== undefined && isCompleted !== existingTodo.isCompleted) {
      await prisma.activity.create({
        data: {
          userId: session.userId,
          type: 'todo',
          action: isCompleted 
            ? `Completed todo: ${todo.title.slice(0, 30)}` 
            : `Uncompleted todo: ${todo.title.slice(0, 30)}`,
        },
      });
    }

    return NextResponse.json({
      todo: {
        ...todo,
        dueDate: todo.dueDate?.toISOString() || null,
        updatedAt: todo.updatedAt.toISOString(),
        createdAt: todo.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update todo error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { todoId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: params.todoId,
        userId: session.userId,
      },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    await prisma.todo.delete({
      where: { id: params.todoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete todo error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
