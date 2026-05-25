const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_OWNER_ID = process.env.TELEGRAM_OWNER_ID || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

export async function sendTelegramMessage(message: TelegramMessage): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: message.chat_id,
        text: message.text,
        parse_mode: message.parse_mode || 'HTML',
        disable_web_page_preview: message.disable_web_page_preview ?? true,
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

export async function sendOtpToTelegram(telegramId: string, otp: string): Promise<boolean> {
  const message = `
🔐 <b>Kode Verifikasi OTP</b>

Kode OTP Anda: <code>${otp}</code>

⏱ Berlaku selama 5 menit
⚠️ Jangan bagikan kode ini kepada siapapun

<i>Jika Anda tidak meminta kode ini, abaikan pesan ini.</i>
  `.trim();

  return sendTelegramMessage({
    chat_id: telegramId,
    text: message,
  });
}

export async function sendRegistrationSuccess(telegramId: string, username: string): Promise<boolean> {
  const message = `
✅ <b>Registrasi Berhasil!</b>

Selamat datang, <b>${username}</b>!

Akun Anda telah berhasil dibuat. Silakan login untuk mulai menggunakan layanan kami.

🌟 Fitur yang tersedia:
• AI Chat dengan berbagai mode
• AI Tools lengkap
• Mobile Legends Checker
• Personal Hub

Terima kasih telah bergabung!
  `.trim();

  return sendTelegramMessage({
    chat_id: telegramId,
    text: message,
  });
}

export async function sendLoginNotification(
  telegramId: string,
  username: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<boolean> {
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  
  const message = `
🔔 <b>Login Baru Terdeteksi</b>

👤 Username: <b>${username}</b>
📱 Device: ${deviceInfo || 'Unknown'}
🌐 IP: ${ipAddress || 'Unknown'}
🕐 Waktu: ${time}

<i>Jika ini bukan Anda, segera ubah password Anda.</i>
  `.trim();

  return sendTelegramMessage({
    chat_id: telegramId,
    text: message,
  });
}

export async function notifyOwnerLogin(username: string, telegramId: string): Promise<boolean> {
  if (!TELEGRAM_OWNER_ID) return false;
  
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  
  const message = `
👤 <b>User Login</b>

Username: <b>${username}</b>
Telegram ID: <code>${telegramId}</code>
Waktu: ${time}
  `.trim();

  return sendTelegramMessage({
    chat_id: TELEGRAM_OWNER_ID,
    text: message,
  });
}

export async function notifyOwnerNewUser(username: string, telegramId: string): Promise<boolean> {
  if (!TELEGRAM_OWNER_ID) return false;
  
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  
  const message = `
🆕 <b>User Baru Terdaftar</b>

Username: <b>${username}</b>
Telegram ID: <code>${telegramId}</code>
Waktu: ${time}
  `.trim();

  return sendTelegramMessage({
    chat_id: TELEGRAM_OWNER_ID,
    text: message,
  });
}

export async function broadcastMessage(userIds: string[], text: string): Promise<number> {
  let successCount = 0;
  
  for (const userId of userIds) {
    const success = await sendTelegramMessage({
      chat_id: userId,
      text,
    });
    if (success) successCount++;
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return successCount;
}

export async function setWebhook(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${url}/api/telegram/webhook`,
        allowed_updates: ['message'],
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('Set webhook error:', error);
    return false;
  }
}

export async function getWebhookInfo(): Promise<any> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
    return await response.json();
  } catch (error) {
    console.error('Get webhook info error:', error);
    return null;
  }
}
