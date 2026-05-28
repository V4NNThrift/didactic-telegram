// AI Provider - Custom endpoint (OpenAI-compatible)
// Supports streaming and non-streaming

const AI_API_URL = 'https://rn2n86j.abc-tunnel.us/v1';
const AI_API_KEY = 'sk-e47af98ddb549389-wwcxel-07e28d37';
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

export type AIMode = 'auto';

export interface AIModeConfig {
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const AI_MODES: Record<string, AIModeConfig> = {
  auto: {
    name: 'Auto',
    description: 'AI menyesuaikan otomatis',
    icon: '✨',
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
};

const SYSTEM_PROMPT = `Kamu adalah Nexus AI, asisten AI yang helpful, cerdas, dan natural. Kamu berkomunikasi dengan gaya yang santai tapi tetap informatif dan akurat.

Panduan:
- Jawab dengan natural, seperti teman yang pintar
- Gunakan bahasa yang sesuai dengan user (kalau user pakai Indonesia, jawab Indonesia; kalau Inggris, jawab Inggris)
- Support markdown: **bold**, *italic*, heading, list, code block
- Untuk kode, selalu pakai code block dengan syntax yang tepat
- Kalau pertanyaan simpel, jawab ringkas. Kalau kompleks, jawab detail
- Kalau diminta coding, langsung kasih kode yang bisa dipakai
- Kalau tidak tahu, bilang jujur
- Jangan pernah bilang kamu ChatGPT/Claude/model lain — kamu Nexus AI
- Jangan kasih jawaban template/placeholder kosong
- Kalau user bilang "singkat" atau "pendek", jawab 1-3 kalimat saja`;

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

// Non-streaming response (for Telegram, tools, etc.)
export async function generateAIResponse({
  messages,
  mode,
  maxTokens = 4096,
  temperature = 0.7,
}: {
  messages: ChatMessage[];
  mode?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: SYSTEM_PROMPT,
  };

  const fullMessages = [systemMessage, ...messages];
  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as any)?.error?.message || `API error: ${response.status}`;

      if (response.status === 401) throw new Error('API key tidak valid.');
      if (response.status === 429) throw new Error('Rate limit. Coba lagi dalam beberapa detik.');
      throw new Error(`AI error: ${errorMsg}`);
    }

    const data = await response.json();
    const responseMs = Date.now() - startTime;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI tidak memberikan respons.');
    }

    const usage = data.usage || {};

    return {
      content: content.trim(),
      tokens: (usage.total_tokens as number) || 0,
      inputTokens: (usage.prompt_tokens as number) || 0,
      outputTokens: (usage.completion_tokens as number) || 0,
      responseMs,
      model: data.model || DEFAULT_MODEL,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Timeout 60s. Coba lagi.');
    }
    if (error.message && !error.message.includes('fetch failed')) {
      throw error;
    }
    throw new Error('Gagal terhubung ke AI. Coba lagi nanti.');
  }
}

// Streaming response (for chat UI via SSE)
export async function streamAIResponse({
  messages,
  maxTokens = 4096,
  temperature = 0.7,
}: {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: SYSTEM_PROMPT,
  };

  const fullMessages = [systemMessage, ...messages];

  const response = await fetch(`${AI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: fullMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = (errorData as any)?.error?.message || `API error: ${response.status}`;
    throw new Error(errorMsg);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  return response.body;
}

// Helper: get system prompt for external use (Telegram AI, etc.)
export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
