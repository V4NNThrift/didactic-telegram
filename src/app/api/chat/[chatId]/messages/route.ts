import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { streamAIResponse, generateAIResponse, type ChatMessage } from '@/lib/ai-provider';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
      select: { mode: true },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = await prisma.aiMessage.findMany({
      where: { chatId: params.chatId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages, mode: chat.mode });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Send message and stream AI response via SSE
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
    const { content, regenerate = false, stream = true } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    // Verify chat ownership
    const chat = await prisma.aiChat.findFirst({
      where: { id: params.chatId, userId: session.userId },
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

    // Build chat history (oldest first)
    const history: ChatMessage[] = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    history.push({ role: 'user', content: content.trim() });

    // Save user message
    let userMessage = null;
    if (!regenerate) {
      userMessage = await prisma.aiMessage.create({
        data: { chatId: params.chatId, role: 'user', content: content.trim() },
      });
    }

    // --- STREAMING RESPONSE ---
    if (stream) {
      const startTime = Date.now();
      let fullContent = '';

      try {
        const aiStream = await streamAIResponse({ messages: history });

        // Create a TransformStream to process SSE from AI API and forward to client
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readableStream = new ReadableStream({
          async start(controller) {
            // Send user message ID first
            if (userMessage) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`));
            }

            const reader = aiStream.getReader();

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                      continue;
                    }

                    try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (delta) {
                        fullContent += delta;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: delta })}\n\n`));
                      }
                    } catch {
                      // Skip unparseable lines
                    }
                  }
                }
              }
            } catch (streamErr: any) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: 'Stream interrupted' })}\n\n`));
            } finally {
              reader.releaseLock();
            }

            // Save assistant message to DB
            const responseMs = Date.now() - startTime;

            if (fullContent.trim()) {
              const assistantMessage = await prisma.aiMessage.create({
                data: {
                  chatId: params.chatId,
                  role: 'assistant',
                  content: fullContent.trim(),
                  mode: 'auto',
                  tokens: Math.ceil(fullContent.length / 4),
                  responseMs,
                },
              });

              // Send done event with saved message
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`));

              // Update chat title if first message
              if (chat.title === 'New Chat' && !regenerate) {
                await prisma.aiChat.update({
                  where: { id: params.chatId },
                  data: {
                    title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
                    updatedAt: new Date(),
                  },
                });
              }

              // Log usage
              await prisma.aiUsageLog.create({
                data: {
                  userId: session.userId,
                  mode: 'auto',
                  inputTokens: Math.ceil(content.length / 4),
                  outputTokens: Math.ceil(fullContent.length / 4),
                  responseMs,
                },
              }).catch(() => {});
            }

            controller.close();
          },
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (aiError: any) {
        console.error('AI streaming error:', aiError.message);
        return NextResponse.json({
          userMessage,
          assistantMessage: null,
          error: aiError.message || 'AI gagal merespons.',
        });
      }
    }

    // --- NON-STREAMING FALLBACK ---
    try {
      const aiResponse = await generateAIResponse({ messages: history });

      const assistantMessage = await prisma.aiMessage.create({
        data: {
          chatId: params.chatId,
          role: 'assistant',
          content: aiResponse.content,
          mode: 'auto',
          tokens: aiResponse.tokens,
          responseMs: aiResponse.responseMs,
        },
      });

      if (chat.title === 'New Chat' && !regenerate) {
        await prisma.aiChat.update({
          where: { id: params.chatId },
          data: {
            title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
            updatedAt: new Date(),
          },
        });
      }

      await prisma.aiUsageLog.create({
        data: {
          userId: session.userId,
          mode: 'auto',
          inputTokens: aiResponse.inputTokens,
          outputTokens: aiResponse.outputTokens,
          responseMs: aiResponse.responseMs,
        },
      }).catch(() => {});

      return NextResponse.json({ userMessage, assistantMessage });
    } catch (aiError: any) {
      console.error('AI error:', aiError.message);
      return NextResponse.json({
        userMessage,
        assistantMessage: null,
        error: aiError.message || 'AI gagal merespons.',
      });
    }
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
