import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        telegramId: true,
        isAdmin: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Update profile (username)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;

    if (!username?.trim()) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Validate username
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username min 3 characters' }, { status: 400 });
    }

    if (cleanUsername.length > 20) {
      return NextResponse.json({ error: 'Username max 20 characters' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
    }

    // Check if username is taken
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing && existing.id !== session.userId) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { username: cleanUsername },
      select: {
        id: true,
        username: true,
        telegramId: true,
        isAdmin: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'login',
        action: 'Updated username',
      },
    });

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
