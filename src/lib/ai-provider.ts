// AI Provider - OpenRouter API integration
// Supports multiple models via OpenRouter's OpenAI-compatible API

export type AIMode = 'fast' | 'smart' | 'thinking' | 'creative' | 'focus';

export interface AIModeConfig {
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  temperature: number;
  maxTokens: number;
  systemPromptExtra: string;
}

export const AI_MODES: Record<AIMode, AIModeConfig> = {
  fast: {
    name: 'Fast',
    description: 'Respon cepat dan ringan',
    icon: '⚡',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    temperature: 0.4,
    maxTokens: 1024,
    systemPromptExtra: 'Jawab dengan singkat dan langsung ke inti. Jangan bertele-tele.',
  },
  smart: {
    name: 'Smart',
    description: 'Keseimbangan kecepatan dan kualitas',
    icon: '🧠',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    temperature: 0.6,
    maxTokens: 2048,
    systemPromptExtra: 'Berikan jawaban yang informatif dan terstruktur dengan keseimbangan antara detail dan keringkasan.',
  },
  thinking: {
    name: 'Thinking',
    description: 'Reasoning lebih mendalam',
    icon: '🤔',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    temperature: 0.7,
    maxTokens: 4096,
    systemPromptExtra: 'Pikirkan secara mendalam sebelum menjawab. Analisis dari berbagai sudut pandang. Jelaskan reasoning dan langkah-langkah pemikiranmu.',
  },
  creative: {
    name: 'Creative',
    description: 'Jawaban kreatif dan unik',
    icon: '🎨',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    temperature: 0.9,
    maxTokens: 3072,
    systemPromptExtra: 'Jadilah kreatif dan ekspresif. Gunakan analogi, metafora, dan pendekatan yang unik. Beri perspektif yang segar dan menarik.',
  },
  focus: {
    name: 'Focus',
    description: 'Singkat dan to the point',
    icon: '🎯',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    temperature: 0.3,
    maxTokens: 512,
    systemPromptExtra: 'Jawab sesingkat mungkin. Langsung ke poin utama. Tidak perlu basa-basi atau penjelasan panjang kecuali diminta.',
  },
};

// Model mapping from env or defaults
function getModelForMode(mode: AIMode): string {
  const envModels: Record<AIMode, string | undefined> = {
    fast: process.env.AI_MODEL_FAST,
    smart: process.env.AI_MODEL_SMART,
    thinking: process.env.AI_MODEL_THINKING,
    creative: process.env.AI_MODEL_CREATIVE,
    focus: process.env.AI_MODEL_FOCUS,
  };

  const defaults: Record<AIMode, string> = {
    fast: 'google/gemini-2.0-flash-001',
    smart: 'openai/gpt-4o-mini',
    thinking: 'openai/gpt-4o',
    creative: 'anthropic/claude-3.5-sonnet',
    focus: 'openai/gpt-4o-mini',
  };

  return envModels[mode] || defaults[mode];
}

const SYSTEM_PROMPT = `Kamu adalah Nexus AI, asisten AI yang helpful, natural, dan cerdas. Kamu berkomunikasi dalam bahasa Indonesia yang alami dan tidak kaku, tapi tetap informatif dan akurat.

Panduan:
- Jawab dengan natural seperti manusia yang berpengetahuan luas
- Gunakan bahasa Indonesia yang baik tapi tidak terlalu formal
- Dukung markdown: bold, italic, heading, list, code block dengan syntax highlighting
- Untuk kode, selalu gunakan code block dengan bahasa yang tepat (misalnya \`\`\`javascript)
- Kalau tidak tahu sesuatu, bilang jujur dan jangan mengarang
- Jangan pernah bilang kamu ChatGPT, Claude, atau model lain — kamu adalah Nexus AI
- Jangan berikan respons placeholder atau template kosong
- Kalau user bertanya dalam bahasa Inggris, jawab dalam bahasa Inggris`;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  responseMs: number;
  model: string;
}

export async function generateAIResponse({
  messages,
  mode,
}: {
  messages: ChatMessage[];
  mode: AIMode;
}): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('AI API key belum disetel. Set OPENROUTER_API_KEY di environment variables.');
  }

  const modeConfig = AI_MODES[mode];
  const model = getModelForMode(mode);

  // Build messages with system prompt
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\n${modeConfig.systemPromptExtra}`,
  };

  const fullMessages = [systemMessage, ...messages];

  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.AI_SITE_URL || 'https://didactic-telegram-production.up.railway.app',
        'X-Title': process.env.AI_SITE_NAME || 'Nexus AI',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature: modeConfig.temperature,
        max_tokens: modeConfig.maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as any)?.error?.message || `API error: ${response.status}`;

      if (response.status === 401) {
        throw new Error('API key tidak valid. Hubungi admin.');
      }
      if (response.status === 402) {
        throw new Error('Kuota API habis. Hubungi admin.');
      }
      if (response.status === 429) {
        throw new Error('Terlalu banyak request. Coba lagi dalam beberapa detik.');
      }

      throw new Error(`AI service error: ${errorMsg}`);
    }

    const data = await response.json();
    const responseMs = Date.now() - startTime;

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI tidak memberikan respons. Coba lagi.');
    }

    const usage = data.usage || {};

    return {
      content: content.trim(),
      tokens: (usage.total_tokens as number) || 0,
      inputTokens: (usage.prompt_tokens as number) || 0,
      outputTokens: (usage.completion_tokens as number) || 0,
      responseMs,
      model: data.model || model,
    };
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout (60s). Model mungkin overloaded, coba lagi.');
    }

    // Re-throw if already a user-friendly error
    if (error.message && !error.message.includes('fetch')) {
      throw error;
    }

    throw new Error('Gagal terhubung ke AI service. Coba lagi nanti.');
  }
}
