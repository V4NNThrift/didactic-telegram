// Mobile Legends Account Checker
// Uses real API providers - NEVER returns fake/guessed data

export interface MLCheckResult {
  success: boolean;
  data?: {
    userId: string;
    serverId: string;
    nickname: string;
    provider: string;
  };
  error?: string;
  timestamp: Date;
}

// Validate User ID and Server ID
export function validateMLInput(userId: string, serverId: string): { valid: boolean; error?: string } {
  if (!userId || userId.trim() === '') {
    return { valid: false, error: 'User ID tidak boleh kosong' };
  }

  if (!/^\d+$/.test(userId.trim())) {
    return { valid: false, error: 'User ID harus berupa angka' };
  }

  if (userId.trim().length < 6 || userId.trim().length > 12) {
    return { valid: false, error: 'User ID harus 6-12 digit' };
  }

  if (!serverId || serverId.trim() === '') {
    return { valid: false, error: 'Server ID tidak boleh kosong' };
  }

  if (!/^\d+$/.test(serverId.trim())) {
    return { valid: false, error: 'Server ID harus berupa angka' };
  }

  if (serverId.trim().length < 3 || serverId.trim().length > 5) {
    return { valid: false, error: 'Server ID harus 3-5 digit' };
  }

  return { valid: true };
}

// Main check function
export async function checkMLAccount(
  userId: string,
  serverId: string,
): Promise<MLCheckResult> {
  // Validate input
  const validation = validateMLInput(userId, serverId);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      timestamp: new Date(),
    };
  }

  const cleanUserId = userId.trim();
  const cleanServerId = serverId.trim();

  const provider = process.env.ML_CHECK_PROVIDER || '';
  const kioswebCode = process.env.KIOSWEB_MEMBER_CODE || '';
  const mochiKey = process.env.MOCHIGAME_API_KEY || '';

  // Check if any provider is configured
  if (!provider && !kioswebCode && !mochiKey) {
    return {
      success: false,
      error: 'Provider MLBB checker belum dikonfigurasi. Hubungi admin.',
      timestamp: new Date(),
    };
  }

  // Try configured provider
  if (provider === 'kiosweb' || kioswebCode) {
    return checkViaKiosweb(cleanUserId, cleanServerId, kioswebCode);
  }

  if (provider === 'mochigame' || mochiKey) {
    return checkViaMochigame(cleanUserId, cleanServerId, mochiKey);
  }

  return {
    success: false,
    error: 'Provider MLBB checker tidak valid. Set ML_CHECK_PROVIDER=kiosweb atau mochigame.',
    timestamp: new Date(),
  };
}

// Kiosweb provider
async function checkViaKiosweb(userId: string, serverId: string, memberCode: string): Promise<MLCheckResult> {
  if (!memberCode) {
    return {
      success: false,
      error: 'KIOSWEB_MEMBER_CODE belum disetel. Hubungi admin.',
      timestamp: new Date(),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `https://api.kiosweb.id/game?member_code=${encodeURIComponent(memberCode)}&game=mobile-legends&id=${encodeURIComponent(userId)}&server=${encodeURIComponent(serverId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NexusAI/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'API key kiosweb tidak valid. Hubungi admin.', timestamp: new Date() };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit tercapai. Coba lagi nanti.', timestamp: new Date() };
      }
      return { success: false, error: `Kiosweb API error (${response.status})`, timestamp: new Date() };
    }

    const data = await response.json();

    // Kiosweb returns status: true and data.nickname on success
    if (data.status === true && data.data?.nickname) {
      return {
        success: true,
        data: {
          userId,
          serverId,
          nickname: data.data.nickname,
          provider: 'kiosweb',
        },
        timestamp: new Date(),
      };
    }

    // Account not found or invalid
    return {
      success: false,
      error: data.message || 'Akun tidak ditemukan. Pastikan User ID dan Server ID benar.',
      timestamp: new Date(),
    };
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timeout. Coba lagi.', timestamp: new Date() };
    }

    console.error('[ML Checker] Kiosweb error:', error.message);
    return { success: false, error: 'Gagal terhubung ke provider. Coba lagi nanti.', timestamp: new Date() };
  }
}

// Mochigame provider
async function checkViaMochigame(userId: string, serverId: string, apiKey: string): Promise<MLCheckResult> {
  if (!apiKey) {
    return {
      success: false,
      error: 'MOCHIGAME_API_KEY belum disetel. Hubungi admin.',
      timestamp: new Date(),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://mochigamestore.com/api/cek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'NexusAI/1.0',
      },
      body: JSON.stringify({
        id: userId,
        server: serverId,
        kode: 'mobile-legends',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'API key mochigame tidak valid. Hubungi admin.', timestamp: new Date() };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit tercapai. Coba lagi nanti.', timestamp: new Date() };
      }
      return { success: false, error: `Mochigame API error (${response.status})`, timestamp: new Date() };
    }

    const data = await response.json();

    // Mochigame returns result: true and nickname on success
    if ((data.result === true || data.status === true) && data.nickname) {
      return {
        success: true,
        data: {
          userId,
          serverId,
          nickname: data.nickname,
          provider: 'mochigame',
        },
        timestamp: new Date(),
      };
    }

    return {
      success: false,
      error: data.message || 'Akun tidak ditemukan. Pastikan User ID dan Server ID benar.',
      timestamp: new Date(),
    };
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timeout. Coba lagi.', timestamp: new Date() };
    }

    console.error('[ML Checker] Mochigame error:', error.message);
    return { success: false, error: 'Gagal terhubung ke provider. Coba lagi nanti.', timestamp: new Date() };
  }
}

// Server region list for UI (informational only, not used for validation)
export const ML_SERVERS = [
  { id: '9', name: 'Indonesia', prefix: '9xxx' },
  { id: '7', name: 'Malaysia', prefix: '7xxx' },
  { id: '5', name: 'Philippines', prefix: '5xxx' },
  { id: '6', name: 'Singapore', prefix: '6xxx' },
  { id: '8', name: 'Vietnam', prefix: '8xxx' },
  { id: '4', name: 'Thailand', prefix: '4xxx' },
  { id: '3', name: 'Myanmar', prefix: '3xxx' },
  { id: '2', name: 'Cambodia', prefix: '2xxx' },
];
