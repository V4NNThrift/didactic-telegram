import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import { generateAIResponse, AVAILABLE_MODELS, type ChatMessage } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

const OWNER_ID = process.env.TELEGRAM_OWNER_ID || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory model preferences (persists until restart)
// In production you'd store in DB, but this works fine for Railway single-instance
const userModelPrefs = new Map<string, string>();

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; is_bot: boolean; first_name: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; username?: string };
    message: { chat: { id: number }; message_id: number };
    data: string;
  };
}

// Send inline keyboard
async function sendInlineKeyboard(chatId: string, text: string, buttons: { text: string; callback_data: string }[][]) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }),
  });
}

// Answer callback query (dismiss loading on button)
async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

// Edit message after button press
async function editMessage(chatId: string, messageId: number, text: string) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    // --- Handle callback query (inline button press) ---
    if (update.callback_query) {
      const cb = update.callback_query;
      const userId = cb.from.id.toString();
      const chatId = cb.message.chat.id.toString();
      const data = cb.data;

      if (data.startsWith('model:')) {
        const selectedModel = data.slice(6);
        const modelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel);

        if (modelInfo) {
          userModelPrefs.set(userId, selectedModel);

          await answerCallbackQuery(cb.id, `✅ Model: ${modelInfo.name}`);
          await editMessage(chatId, cb.message.message_id, 
            `✅ Model diubah ke <b>${modelInfo.name}</b>\n\nSekarang pakai /ai untuk chat dengan model ini.`
          );
        } else {
          await answerCallbackQuery(cb.id, '❌ Model tidak valid');
        }
      }

      return NextResponse.json({ ok: true });
    }

    // --- Handle messages ---
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
        text: `📚 <b>Perintah</b>\n\n/ai [pesan] — Tanya AI\n/model — Pilih model AI\n/id — Telegram ID\n/status — Status akun\n/profile — Info profil\n/ping — Cek bot\n/help — Bantuan\n\n<b>Contoh:</b>\n<code>/ai jelaskan apa itu API</code>`,
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

    // /model — show inline keyboard with model list
    if (text === '/model') {
      const currentModel = userModelPrefs.get(telegramId) || 'kr/claude-haiku-4.5';
      const currentInfo = AVAILABLE_MODELS.find(m => m.id === currentModel);

      // Build buttons in rows of 1 (for readability)
      const buttons = AVAILABLE_MODELS.map(m => ([{
        text: `${m.id === currentModel ? '✅ ' : ''}${m.name}`,
        callback_data: `model:${m.id}`,
      }]));

      await sendInlineKeyboard(
        chatId,
        `🤖 <b>Pilih Model AI</b>\n\nModel aktif: <b>${currentInfo?.name || currentModel}</b>\n\nPilih model di bawah:`,
        buttons
      );
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
          const currentModel = userModelPrefs.get(telegramId) || 'kr/claude-haiku-4.5';
          const modelName = AVAILABLE_MODELS.find(m => m.id === currentModel)?.name || currentModel;
          await sendTelegramMessage({
            chat_id: chatId,
            text: `👤 <b>${user.username}</b>\n\n🔰 ${user.isAdmin ? 'Admin' : 'Member'}\n💬 ${user._count.aiChats} chats\n🤖 Model: ${modelName}\n📅 Joined: ${user.createdAt.toLocaleDateString('id-ID')}`,
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
          text: '💡 <code>/ai pertanyaan kamu</code>\n\nContoh: <code>/ai jelaskan machine learning</code>\n\nGanti model: /model',
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

      // Get user's selected model
      const selectedModel = userModelPrefs.get(telegramId) || 'kr/claude-haiku-4.5';
      const modelName = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel;

      // Thinking indicator
      await sendTelegramMessage({ chat_id: chatId, text: `🤖 <i>${modelName} sedang mikir…</i>` });

      // Call AI
      try {
        const messages: ChatMessage[] = [{ role: 'user', content: aiQuery }];

        const aiResponse = await generateAIResponse({
          messages,
          model: selectedModel,
          maxTokens: 2048,
          temperature: 0.7,
        });

        // Split long responses
        const chunks = splitMessage(aiResponse.content, 4000);
        for (const chunk of chunks) {
          await sendTelegramMessage({ chat_id: chatId, text: chunk, parse_mode: 'Markdown' });
        }

        // Log
        if (user) {
          await prisma.activity.create({
            data: { userId: user.id, type: 'chat', action: `Telegram AI (${modelName})` },
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
  return NextResponse.json({ status: 'ok', webhook: 'active' });
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
