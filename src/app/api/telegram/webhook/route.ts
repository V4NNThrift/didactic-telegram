import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

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
    const userId = message.from.id.toString();
    const text = message.text.trim();
    const username = message.from.username || message.from.first_name;

    // Handle /start command
    if (text === '/start') {
      const welcomeMessage = `
🌟 <b>Selamat Datang di Nexus AI!</b>

Halo, <b>${username}</b>! 👋

Telegram ID Anda: <code>${userId}</code>

📋 <b>Cara Mendaftar:</b>
1. Kunjungi website kami
2. Klik "Register"
3. Masukkan Telegram ID di atas
4. Verifikasi dengan kode OTP
5. Buat username & password

🔐 Kode OTP akan dikirim ke chat ini.

<i>Butuh bantuan? Ketik /help</i>
      `.trim();

      const sent = await sendTelegramMessage({
        chat_id: chatId,
        text: welcomeMessage,
      });

      if (!sent) {
        console.error('[Webhook] Failed to send /start reply to chat:', chatId);
      }

      return NextResponse.json({ ok: true });
    }

    // Handle /help command
    if (text === '/help') {
      const helpMessage = `
📚 <b>Bantuan Nexus AI</b>

<b>Perintah:</b>
/start - Mulai dan lihat Telegram ID
/help - Tampilkan bantuan ini
/id - Lihat Telegram ID Anda
/status - Cek status akun

<b>Fitur Website:</b>
• AI Chat dengan 5 mode
• AI Tools lengkap
• ML Account Checker
• Personal Hub
• Dan banyak lagi!

<b>Masalah?</b>
Hubungi admin untuk bantuan lebih lanjut.
      `.trim();

      await sendTelegramMessage({
        chat_id: chatId,
        text: helpMessage,
      });

      return NextResponse.json({ ok: true });
    }

    // Handle /id command
    if (text === '/id') {
      await sendTelegramMessage({
        chat_id: chatId,
        text: `🆔 Telegram ID Anda: <code>${userId}</code>`,
      });

      return NextResponse.json({ ok: true });
    }

    // Handle /status command
    if (text === '/status') {
      try {
        const user = await prisma.user.findUnique({
          where: { telegramId: userId },
          select: {
            username: true,
            isAdmin: true,
            isBanned: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });

        if (!user) {
          await sendTelegramMessage({
            chat_id: chatId,
            text: '❌ Akun tidak ditemukan. Silakan daftar terlebih dahulu di website.',
          });
        } else if (user.isBanned) {
          await sendTelegramMessage({
            chat_id: chatId,
            text: '🚫 Akun Anda sedang diblokir. Hubungi admin.',
          });
        } else {
          const statusMessage = `
✅ <b>Status Akun</b>

👤 Username: <b>${user.username}</b>
🔰 Role: ${user.isAdmin ? 'Admin' : 'Member'}
📅 Terdaftar: ${user.createdAt.toLocaleDateString('id-ID')}
🕐 Login terakhir: ${user.lastLoginAt?.toLocaleString('id-ID') || 'Belum pernah'}
          `.trim();

          await sendTelegramMessage({
            chat_id: chatId,
            text: statusMessage,
          });
        }
      } catch (dbError) {
        console.error('[Webhook] Database error on /status:', dbError);
        await sendTelegramMessage({
          chat_id: chatId,
          text: '⚠️ Sedang ada gangguan. Coba lagi nanti.',
        });
      }

      return NextResponse.json({ ok: true });
    }

    // Unknown command - send help hint
    if (text.startsWith('/')) {
      await sendTelegramMessage({
        chat_id: chatId,
        text: '❓ Perintah tidak dikenali. Ketik /help untuk melihat daftar perintah.',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    // Always return 200 to Telegram so it doesn't retry indefinitely
    return NextResponse.json({ ok: true });
  }
}

// Verify webhook is working
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook is active',
    timestamp: new Date().toISOString(),
  });
}
