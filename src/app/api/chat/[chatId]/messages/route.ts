import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAIResponse, type AIMode } from '@/lib/ai-engine';
import { checkRateLimit } from '@/lib/rate-limit';

// GET - Get messages for a chat
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chat = await prisma.aiChat.findFirst({
      where: {
        id: params.chatId,
        userId: session.userId,
      },
      select: {
        mode: true,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = await prisma.aiMessage.findMany({
      where: { chatId: params.chatId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ 
      messages,
      mode: chat.mode,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Send a message and get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(session.userId, 'ai-chat');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { content, mode = 'smart', regenerate = false } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    // Verify chat ownership
    const chat = await prisma.aiChat.findFirst({
      where: {
        id: params.chatId,
        userId: session.userId,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get recent messages for context
    const recentMessages = await prisma.aiMessage.findMany({
      where: { chatId: params.chatId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { content: true, role: true },
    });

    const context = recentMessages.reverse().map(m => m.content);

    let userMessage = null;

    // Create user message only if not regenerating
    if (!regenerate) {
      userMessage = await prisma.aiMessage.create({
        data: {
          chatId: params.chatId,
          role: 'user',
          content: content.trim(),
        },
      });
    }

    // Generate AI response
    const aiMode = mode as AIMode;
    const aiResponse = await generateAIResponse(content.trim(), aiMode, context);

    // Create assistant message
    const assistantMessage = await prisma.aiMessage.create({
      data: {
        chatId: params.chatId,
        role: 'assistant',
        content: aiResponse.content,
        mode: aiMode,
        tokens: aiResponse.tokens,
        responseMs: aiResponse.responseMs,
      },
    });

    // Update chat
    await prisma.aiChat.update({
      where: { id: params.chatId },
      data: {
        mode: aiMode,
        updatedAt: new Date(),
        // Update title if it's the first message
        ...(chat.title === 'New Chat' && !regenerate && {
          title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
        }),
      },
    });

    // Log AI usage
    await prisma.aiUsageLog.create({
      data: {
        userId: session.userId,
        mode: aiMode,
        inputTokens: Math.ceil(content.length / 4),
        outputTokens: aiResponse.tokens,
        responseMs: aiResponse.responseMs,
      },
    });

    // Log activity
    if (!regenerate) {
      await prisma.activity.create({
        data: {
          userId: session.userId,
          type: 'chat',
          action: `Sent message in ${aiMode} mode`,
          metadata: JSON.stringify({ chatId: params.chatId }),
        },
      });
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
