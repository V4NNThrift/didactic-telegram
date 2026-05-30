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
    from: { id: number; is_bot: boolean; first_name: string; username?: string };
    chat: { id: number; type: string };
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

    // /start
    if (text === '/start') {
      await sendTelegramMessage({
        chat_id: chatId,
        text: `Halo ${displayName} 👋\n\nTelegram ID kamu: <code>${telegramId}</code>\n\nSilakan register di website, lalu pakai /ai untuk chat AI.\n\n/help - lihat semua perintah`,
      });
      return NextResponse.json({ ok: true });
    }

    // /help
    if (text === '/help') {
      await sendTelegramMessage({
        chat_id: chatId,
        text: `📚 <b>Perintah</b>\n\n/ai [pesan] — Tanya AI (MiMo v2.5 Pro)\n/id — Telegram ID\n/status — Status akun\n/profile — Info profil\n/ping — Cek bot\n/help — Bantuan\n\n<b>Contoh:</b>\n<code>/ai jelaskan apa itu API</code>\n<code>/ai buatkan kode sorting python</code>`,
      });
      return NextResponse.json({ ok: true });
    }

    // /id
    if (text === '/id') {
      await sendTelegramMessage({ chat_id: chatId, text: `🆔 <code>${telegramId}</code>` });
      return NextResponse.json({ ok: true });
    }

    // /ping
    if (text === '/ping') {
      await sendTelegramMessage({ chat_id: chatId, text: '🏓 Pong!' });
      return NextResponse.json({ ok: true });
    }

    // /status
    if (text === '/status') {
      try {
        const user = await prisma.user.findUnique({
          where: { telegramId },
          select: { username: true, isAdmin: true, isBanned: true, createdAt: true },
        });
        if (!user) {
          await sendTelegramMessage({ chat_id: chatId, text: '❌ Belum terdaftar.' });
        } else if (user.isBanned) {
          await sendTelegramMessage({ chat_id: chatId, text: '🚫 Akun diblokir.' });
        } else {
          await sendTelegramMessage({
            chat_id: chatId,
            text: `✅ <b>${user.username}</b>\n${user.isAdmin ? 'Admin' : 'Member'} • Sejak ${user.createdAt.toLocaleDateString('id-ID')}`,
          });
        }
      } catch {
        await sendTelegramMessage({ chat_id: chatId, text: '⚠️ Error.' });
      }
      return NextResponse.json({ ok: true });
    }

    // /profile
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
            text: `👤 <b>${user.username}</b>\n\n🔰 ${user.isAdmin ? 'Admin' : 'Member'}\n💬 ${user._count.aiChats} chats\n🤖 Model: MiMo v2.5 Pro\n📅 Joined: ${user.createdAt.toLocaleDateString('id-ID')}`,
          });
        }
      } catch {
        await sendTelegramMessage({ chat_id: chatId, text: '⚠️ Error.' });
      }
      return NextResponse.json({ ok: true });
    }

    // /ai [message]
    if (text.startsWith('/ai')) {
      const aiQuery = text.slice(3).trim();

      if (!aiQuery) {
        await sendTelegramMessage({
          chat_id: chatId,
          text: '💡 <code>/ai pertanyaan kamu</code>\n\nContoh: <code>/ai jelaskan machine learning</code>',
        });
        return NextResponse.json({ ok: true });
      }

      // Check user
      const isOwner = telegramId === OWNER_ID;
      let user: any = null;
      try {
        user = await prisma.user.findUnique({
          where: { telegramId },
          select: { id: true, username: true, isBanned: true },
        });
      } catch {}

      if (!isOwner && !user) {
        await sendTelegramMessage({ chat_id: chatId, text: '❌ Register dulu di website.' });
        return NextResponse.json({ ok: true });
      }

      if (user?.isBanned && !isOwner) {
        await sendTelegramMessage({ chat_id: chatId, text: '🚫 Akun diblokir.' });
        return NextResponse.json({ ok: true });
      }

      // Thinking indicator
      await sendTelegramMessage({ chat_id: chatId, text: '🤖 <i>MiMo sedang berpikir…</i>' });

      // Call AI with retry
      try {
        const messages: ChatMessage[] = [{ role: 'user', content: aiQuery }];

        const aiResponse = await generateAIResponse({
          messages,
          maxTokens: 4096,
          temperature: 0.7,
        });

        // Split long responses (Telegram limit 4096)
        const chunks = splitMessage(aiResponse.content, 4000);
        for (const chunk of chunks) {
          await sendTelegramMessage({ chat_id: chatId, text: chunk, parse_mode: 'Markdown' });
        }

        // Log
        if (user) {
          await prisma.activity.create({
            data: { userId: user.id, type: 'chat', action: 'Telegram AI (MiMo v2.5 Pro)' },
          }).catch(() => {});
        }
      } catch (err: any) {
        console.error('[Telegram AI]', err.message);
        await sendTelegramMessage({ chat_id: chatId, text: `⚠️ ${err.message || 'AI error.'}` });
      }

      return NextResponse.json({ ok: true });
    }

    // Unknown command
    if (text.startsWith('/')) {
      await sendTelegramMessage({ chat_id: chatId, text: '❓ Ketik /help.' });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook]', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'active', model: 'mimo-v2.5-pro' });
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) { chunks.push(remaining); break; }
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt < maxLength * 0.5) splitAt = remaining.lastIndexOf(' ', maxLength);
    if (splitAt < maxLength * 0.3) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks;
}
