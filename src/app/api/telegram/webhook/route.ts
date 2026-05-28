import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import { generateAIResponse, type ChatMessage } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

const OWNER_ID = process.env.TELEGRAM_OWNER_ID || '';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id.toString();
    const telegramId = message.from.id.toString();
    const text = message.text.trim();
    const displayName = message.from.username || message.from.first_name;

    // --- /start ---
    if (text === '/start') {
      await sendTelegramMessage({
        chat_id: chatId,
        text: `Halo ${displayName} 👋\n\nAkun Telegram kamu sudah siap dipakai untuk verifikasi.\nSilakan lanjut register di website dan masukkan Telegram ID kamu.\n\n🆔 ID kamu: <code>${telegramId}</code>\n\n<i>Ketik /help untuk lihat semua perintah.</i>`,
      });
      return NextResponse.json({ ok: true });
    }

    // --- /help ---
    if (text === '/help') {
      await sendTelegramMessage({
        chat_id: chatId,
        text: `📚 <b>Perintah Nexus AI</b>\n\n/start - Lihat Telegram ID\n/help - Bantuan\n/id - Telegram ID kamu\n/status - Cek status akun\n/ai [pesan] - Tanya AI langsung\n/ping - Cek bot aktif\n\n<b>Contoh /ai:</b>\n<code>/ai jelaskan apa itu API</code>\n<code>/ai bantu bikin caption jualan</code>\n<code>/ai fix error kode ini</code>`,
      });
      return NextResponse.json({ ok: true });
    }

    // --- /id ---
    if (text === '/id') {
      await sendTelegramMessage({
        chat_id: chatId,
        text: `🆔 Telegram ID kamu: <code>${telegramId}</code>`,
      });
      return NextResponse.json({ ok: true });
    }

    // --- /ping ---
    if (text === '/ping') {
      await sendTelegramMessage({
        chat_id: chatId,
        text: '🏓 Pong! Bot aktif.',
      });
      return NextResponse.json({ ok: true });
    }

    // --- /status ---
    if (text === '/status') {
      try {
        const user = await prisma.user.findUnique({
          where: { telegramId },
          select: { username: true, isAdmin: true, isBanned: true, createdAt: true, lastLoginAt: true },
        });

        if (!user) {
          await sendTelegramMessage({ chat_id: chatId, text: '❌ Belum terdaftar. Register dulu di website.' });
        } else if (user.isBanned) {
          await sendTelegramMessage({ chat_id: chatId, text: '🚫 Akun kamu diblokir.' });
        } else {
          await sendTelegramMessage({
            chat_id: chatId,
            text: `✅ <b>Akun Aktif</b>\n\n👤 ${user.username}\n🔰 ${user.isAdmin ? 'Admin' : 'Member'}\n📅 Sejak: ${user.createdAt.toLocaleDateString('id-ID')}`,
          });
        }
      } catch {
        await sendTelegramMessage({ chat_id: chatId, text: '⚠️ Gangguan. Coba lagi nanti.' });
      }
      return NextResponse.json({ ok: true });
    }

    // --- /ai [message] ---
    if (text.startsWith('/ai')) {
      const aiQuery = text.slice(3).trim();

      if (!aiQuery) {
        await sendTelegramMessage({
          chat_id: chatId,
          text: '💡 Cara pakai: <code>/ai pertanyaan kamu</code>\n\nContoh:\n<code>/ai jelaskan machine learning</code>',
        });
        return NextResponse.json({ ok: true });
      }

      // Check if user is registered (or is owner)
      const isOwner = telegramId === OWNER_ID;
      let user = null;

      try {
        user = await prisma.user.findUnique({
          where: { telegramId },
          select: { id: true, username: true, isBanned: true },
        });
      } catch {}

      if (!isOwner && !user) {
        await sendTelegramMessage({
          chat_id: chatId,
          text: '❌ Kamu belum punya akun. Register dulu di website.',
        });
        return NextResponse.json({ ok: true });
      }

      if (user?.isBanned && !isOwner) {
        await sendTelegramMessage({ chat_id: chatId, text: '🚫 Akun diblokir.' });
        return NextResponse.json({ ok: true });
      }

      // Send "thinking" indicator
      await sendTelegramMessage({
        chat_id: chatId,
        text: '🤖 AI lagi mikir…',
      });

      // Call AI
      try {
        const messages: ChatMessage[] = [
          { role: 'user', content: aiQuery },
        ];

        const aiResponse = await generateAIResponse({
          messages,
          maxTokens: 2048,
          temperature: 0.7,
        });

        // Split long messages (Telegram limit 4096 chars)
        const responseText = aiResponse.content;
        const chunks = splitMessage(responseText, 4000);

        for (const chunk of chunks) {
          await sendTelegramMessage({
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
          });
        }

        // Log AI usage if user exists
        if (user) {
          await prisma.activity.create({
            data: {
              userId: user.id,
              type: 'chat',
              action: 'Telegram AI',
              metadata: JSON.stringify({ query: aiQuery.slice(0, 100) }),
            },
          }).catch(() => {});
        }

      } catch (aiError: any) {
        console.error('[Webhook] AI error:', aiError.message);
        await sendTelegramMessage({
          chat_id: chatId,
          text: `⚠️ AI error: ${aiError.message || 'Gagal merespons. Coba lagi.'}`,
        });
      }

      return NextResponse.json({ ok: true });
    }

    // --- /profile ---
    if (text === '/profile') {
      try {
        const user = await prisma.user.findUnique({
          where: { telegramId },
          select: { username: true, isAdmin: true, createdAt: true, _count: { select: { aiChats: true } } },
        });

        if (!user) {
          await sendTelegramMessage({ chat_id: chatId, text: '❌ Belum terdaftar.' });
        } else {
          await sendTelegramMessage({
            chat_id: chatId,
            text: `👤 <b>Profile</b>\n\nUsername: <b>${user.username}</b>\nRole: ${user.isAdmin ? 'Admin' : 'Member'}\nChats: ${user._count.aiChats}\nJoined: ${user.createdAt.toLocaleDateString('id-ID')}`,
          });
        }
      } catch {
        await sendTelegramMessage({ chat_id: chatId, text: '⚠️ Error. Coba lagi.' });
      }
      return NextResponse.json({ ok: true });
    }

    // Unknown command
    if (text.startsWith('/')) {
      await sendTelegramMessage({
        chat_id: chatId,
        text: '❓ Tidak dikenali. Ketik /help.',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    return NextResponse.json({ ok: true });
  }
}

// GET - verify webhook active
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'active', timestamp: new Date().toISOString() });
}

// Helper: split long messages for Telegram
function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at newline
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt < maxLength * 0.5) {
      // No good newline, split at space
      splitAt = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitAt < maxLength * 0.3) {
      // No good split point, force split
      splitAt = maxLength;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks;
}
