import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAIResponse, type AIMode, type ChatMessage } from '@/lib/ai-provider';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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
        { error: 'Terlalu banyak request. Tunggu sebentar.' },
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

    // Get recent 20 messages for context
    const recentMessages = await prisma.aiMessage.findMany({
      where: { chatId: params.chatId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { content: true, role: true },
    });

    // Build chat history in correct order (oldest first)
    const history: ChatMessage[] = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Add current user message to history
    history.push({ role: 'user', content: content.trim() });

    let userMessage = null;

    // Save user message to database (only if not regenerating)
    if (!regenerate) {
      userMessage = await prisma.aiMessage.create({
        data: {
          chatId: params.chatId,
          role: 'user',
          content: content.trim(),
        },
      });
    }

    // Call real AI via OpenRouter
    const aiMode = mode as AIMode;
    let aiResponse;

    try {
      aiResponse = await generateAIResponse({
        messages: history,
        mode: aiMode,
      });
    } catch (aiError: any) {
      console.error('AI provider error:', aiError.message);

      // Return user-friendly error without crashing
      return NextResponse.json({
        userMessage,
        assistantMessage: null,
        error: aiError.message || 'AI gagal merespons. Coba lagi.',
      }, { status: 200 }); // 200 so frontend can still handle it
    }

    // Save assistant message
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

    // Update chat metadata
    await prisma.aiChat.update({
      where: { id: params.chatId },
      data: {
        mode: aiMode,
        updatedAt: new Date(),
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
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        responseMs: aiResponse.responseMs,
      },
    });

    // Log activity (only on new messages, not regenerate)
    if (!regenerate) {
      await prisma.activity.create({
        data: {
          userId: session.userId,
          type: 'chat',
          action: `Chat (${aiMode} mode)`,
          metadata: JSON.stringify({ chatId: params.chatId, model: aiResponse.model }),
        },
      });
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
