// AI Engine - Local implementation (can be replaced with OpenAI/Claude API)

export type AIMode = 'fast' | 'smart' | 'thinking' | 'creative' | 'focus';

export interface AIModeConfig {
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  maxTokens: number;
  temperature: number;
}

export const AI_MODES: Record<AIMode, AIModeConfig> = {
  fast: {
    name: 'Fast',
    description: 'Respon cepat dan ringan',
    icon: '⚡',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    maxTokens: 500,
    temperature: 0.3,
  },
  smart: {
    name: 'Smart',
    description: 'Keseimbangan kecepatan dan kualitas',
    icon: '🧠',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    maxTokens: 1000,
    temperature: 0.5,
  },
  thinking: {
    name: 'Thinking',
    description: 'Reasoning lebih mendalam',
    icon: '🤔',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    maxTokens: 2000,
    temperature: 0.7,
  },
  creative: {
    name: 'Creative',
    description: 'Jawaban kreatif dan unik',
    icon: '🎨',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    maxTokens: 1500,
    temperature: 0.9,
  },
  focus: {
    name: 'Focus',
    description: 'Singkat dan to the point',
    icon: '🎯',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    maxTokens: 300,
    temperature: 0.2,
  },
};

// Smart response generator based on mode
export async function generateAIResponse(
  prompt: string,
  mode: AIMode,
  context?: string[]
): Promise<{
  content: string;
  tokens: number;
  responseMs: number;
}> {
  const startTime = Date.now();
  const config = AI_MODES[mode];
  
  // Simulate processing based on mode
  const delay = mode === 'fast' ? 300 : mode === 'thinking' ? 1500 : 800;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Generate contextual response based on mode and prompt
  const response = generateContextualResponse(prompt, mode, context);
  
  const responseMs = Date.now() - startTime;
  const tokens = Math.ceil(response.length / 4); // Approximate token count
  
  return {
    content: response,
    tokens,
    responseMs,
  };
}

function generateContextualResponse(prompt: string, mode: AIMode, context?: string[]): string {
  const promptLower = prompt.toLowerCase();
  
  // Greeting responses
  if (promptLower.match(/^(hi|hello|halo|hai|hey|selamat)/i)) {
    return getGreetingResponse(mode);
  }
  
  // Help/capability questions
  if (promptLower.includes('apa yang bisa') || promptLower.includes('what can you')) {
    return getCapabilityResponse(mode);
  }
  
  // Coding questions
  if (promptLower.includes('code') || promptLower.includes('kode') || 
      promptLower.includes('function') || promptLower.includes('program')) {
    return getCodingResponse(prompt, mode);
  }
  
  // Explanation requests
  if (promptLower.includes('jelaskan') || promptLower.includes('explain') ||
      promptLower.includes('apa itu') || promptLower.includes('what is')) {
    return getExplanationResponse(prompt, mode);
  }
  
  // Creative requests
  if (promptLower.includes('tulis') || promptLower.includes('write') ||
      promptLower.includes('buat') || promptLower.includes('create')) {
    return getCreativeResponse(prompt, mode);
  }
  
  // Math/calculation
  if (promptLower.match(/\d+\s*[\+\-\*\/]\s*\d+/)) {
    return getMathResponse(prompt, mode);
  }
  
  // Default intelligent response
  return getDefaultResponse(prompt, mode);
}

function getGreetingResponse(mode: AIMode): string {
  const responses: Record<AIMode, string> = {
    fast: "Hai! Ada yang bisa saya bantu? 👋",
    smart: "Halo! Senang bertemu dengan Anda. Saya siap membantu dengan berbagai pertanyaan atau tugas. Apa yang ingin Anda ketahui hari ini?",
    thinking: "Halo! 👋\n\nSenang sekali bisa berinteraksi dengan Anda. Sebagai AI assistant, saya dirancang untuk membantu Anda dalam berbagai hal:\n\n• **Menjawab pertanyaan** - dari topik umum hingga teknis\n• **Membantu coding** - debugging, review, atau menulis kode\n• **Analisis & penjelasan** - menguraikan konsep kompleks\n• **Tugas kreatif** - menulis, brainstorming ide\n\nApa yang bisa saya bantu hari ini?",
    creative: "✨ Halo, teman!\n\nWah, senang sekali ada yang mampir! Saya seperti asisten digital yang selalu siap sedia - bayangkan saja seperti punya teman yang tahu banyak hal dan selalu siap diajak ngobrol.\n\nMau diskusi tentang apa nih? Coding? Ide kreatif? Atau sekadar ngobrol santai? 🚀",
    focus: "Hai! Silakan langsung sampaikan pertanyaan Anda.",
  };
  return responses[mode];
}

function getCapabilityResponse(mode: AIMode): string {
  const capabilities = `
**Kemampuan saya meliputi:**

🔹 **AI Chat** - Percakapan natural dengan berbagai mode
🔹 **Code Assistant** - Membantu menulis, review, dan debug kode
🔹 **Content Writing** - Menulis artikel, caption, bio, dll
🔹 **Translation** - Menerjemahkan berbagai bahasa
🔹 **Summarization** - Merangkum teks panjang
🔹 **Grammar Check** - Memeriksa tata bahasa
🔹 **Problem Solving** - Membantu memecahkan masalah
🔹 **Creative Ideas** - Brainstorming dan ide kreatif

Silakan tanyakan apapun!
  `.trim();
  
  if (mode === 'fast') return "Saya bisa membantu chat, coding, writing, translation, dan banyak lagi!";
  if (mode === 'focus') return "Chat, coding, writing, translation, summarization, problem solving.";
  return capabilities;
}

function getCodingResponse(prompt: string, mode: AIMode): string {
  // Detect programming language or concept
  const languages = ['javascript', 'python', 'typescript', 'java', 'react', 'nodejs', 'sql'];
  const detectedLang = languages.find(lang => prompt.toLowerCase().includes(lang)) || 'javascript';
  
  if (prompt.toLowerCase().includes('hello world')) {
    const examples: Record<string, string> = {
      javascript: '```javascript\nconsole.log("Hello, World!");\n```',
      python: '```python\nprint("Hello, World!")\n```',
      typescript: '```typescript\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);\n```',
      java: '```java\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n```',
    };
    return examples[detectedLang] || examples.javascript;
  }
  
  if (prompt.toLowerCase().includes('function') || prompt.toLowerCase().includes('fungsi')) {
    return `Berikut contoh function dalam ${detectedLang}:

\`\`\`${detectedLang}
// Function dengan parameter dan return value
function calculateSum(a, b) {
  return a + b;
}

// Arrow function
const multiply = (x, y) => x * y;

// Async function
async function fetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Contoh penggunaan
const sum = calculateSum(5, 3);
console.log(sum); // Output: 8
\`\`\`

${mode === 'thinking' ? '\n**Penjelasan:**\n- Function reguler menggunakan keyword `function`\n- Arrow function lebih ringkas untuk function sederhana\n- Async/await untuk operasi asynchronous' : ''}`;
  }
  
  return `Untuk pertanyaan coding tentang "${prompt.slice(0, 50)}...", saya sarankan:

1. **Pahami requirement** - Apa yang ingin dicapai?
2. **Break down** - Pecah menjadi langkah-langkah kecil
3. **Implement** - Tulis kode step by step
4. **Test** - Uji dengan berbagai input

Bisa jelaskan lebih spesifik apa yang ingin dibuat?`;
}

function getExplanationResponse(prompt: string, mode: AIMode): string {
  // Extract topic
  const topic = prompt.replace(/jelaskan|explain|apa itu|what is/gi, '').trim();
  
  if (mode === 'focus') {
    return `${topic}: Konsep/teknologi yang digunakan untuk [tujuan spesifik]. Fitur utama: [fitur]. Penggunaan: [use case].`;
  }
  
  return `## ${topic || 'Topik'}

**Definisi:**
${topic} adalah [konsep/teknologi/istilah] yang digunakan dalam [konteks].

**Karakteristik Utama:**
• Fitur 1 - Penjelasan singkat
• Fitur 2 - Penjelasan singkat
• Fitur 3 - Penjelasan singkat

**Contoh Penggunaan:**
Dalam praktiknya, ${topic} sering digunakan untuk...

**Kesimpulan:**
${topic} merupakan bagian penting dari [bidang] karena [alasan].

${mode === 'thinking' ? '\n---\n*Apakah ada aspek spesifik yang ingin dibahas lebih detail?*' : ''}`;
}

function getCreativeResponse(prompt: string, mode: AIMode): string {
  if (prompt.toLowerCase().includes('caption')) {
    return `📸 **Caption Ideas:**

1. "Sometimes the smallest step in the right direction ends up being the biggest step of your life. ✨"

2. "Creating my own sunshine on cloudy days ☀️"

3. "Plot twist: You're the main character 🎬"

4. "Living proof that dreams do come true 🌟"

5. "Making memories one moment at a time 📷"

${mode === 'creative' ? '\n💡 **Bonus creative:**\n"In a world of algorithms, be a poet." 🦋' : ''}`;
  }
  
  if (prompt.toLowerCase().includes('bio')) {
    return `✍️ **Bio Suggestions:**

**Professional:**
"Builder of things | Problem solver | Coffee enthusiast ☕"

**Creative:**
"Turning caffeine into code | Living my plot twist 🎬"

**Minimal:**
"Creating • Learning • Growing 🌱"

**Bold:**
"CEO of my own destiny | Making impossible possible 🚀"

Pilih yang sesuai dengan personality Anda!`;
  }
  
  return `Saya akan membantu Anda membuat "${prompt.slice(0, 30)}..."

**Beberapa ide:**

1. **Opsi A** - [Pendekatan kreatif]
2. **Opsi B** - [Pendekatan profesional]  
3. **Opsi C** - [Pendekatan unik]

Mau saya kembangkan salah satu ide di atas?`;
}

function getMathResponse(prompt: string, mode: AIMode): string {
  // Extract and calculate simple math
  const match = prompt.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
  if (match) {
    const a = parseFloat(match[1]);
    const op = match[2];
    const b = parseFloat(match[3]);
    let result: number;
    
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b !== 0 ? a / b : NaN; break;
      default: result = NaN;
    }
    
    if (mode === 'focus') return `${a} ${op} ${b} = ${result}`;
    
    return `**Perhitungan:**

${a} ${op} ${b} = **${result}**

${mode === 'thinking' ? `\n**Langkah:**\n1. Ambil nilai pertama: ${a}\n2. Operasi: ${op === '+' ? 'penjumlahan' : op === '-' ? 'pengurangan' : op === '*' ? 'perkalian' : 'pembagian'}\n3. Nilai kedua: ${b}\n4. Hasil: ${result}` : ''}`;
  }
  
  return "Silakan berikan operasi matematika yang ingin dihitung.";
}

function getDefaultResponse(prompt: string, mode: AIMode): string {
  const responses: Record<AIMode, string> = {
    fast: `Mengenai "${prompt.slice(0, 50)}..." - ini topik menarik! Bisa jelaskan lebih spesifik apa yang ingin diketahui?`,
    smart: `Terima kasih atas pertanyaannya tentang "${prompt.slice(0, 50)}..."

Ini adalah topik yang cukup luas. Untuk memberikan jawaban yang tepat, saya perlu tahu:
1. Konteks spesifik yang Anda maksud
2. Tingkat detail yang diinginkan
3. Tujuan informasi ini

Bisa diperjelas?`,
    thinking: `## Analisis: ${prompt.slice(0, 30)}...

**Pemahaman Awal:**
Berdasarkan pertanyaan Anda, saya mengidentifikasi beberapa aspek yang bisa dibahas:

1. **Aspek Teknis** - Detail implementasi atau cara kerja
2. **Aspek Konseptual** - Teori dan prinsip dasar
3. **Aspek Praktis** - Penerapan di dunia nyata

**Rekomendasi:**
Untuk mendapatkan jawaban yang paling bermanfaat, sebaiknya kita fokus pada satu aspek terlebih dahulu.

Aspek mana yang paling relevan untuk Anda?`,
    creative: `💭 *Hmm, pertanyaan menarik!*

"${prompt.slice(0, 40)}..." - ini mengingatkan saya pada pepatah:

> "The only stupid question is the one not asked."

Mari kita explore bersama! Saya punya beberapa perspektif yang bisa dishare...

Tapi pertama, ceritakan dulu konteksnya - supaya saya bisa kasih insight yang pas! 🎯`,
    focus: `Topik: ${prompt.slice(0, 50)}. Perlu informasi lebih spesifik untuk menjawab dengan tepat.`,
  };
  
  return responses[mode];
}

// AI Tools Functions
export async function summarizeText(text: string): Promise<string> {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const summary = sentences.slice(0, Math.min(3, sentences.length)).join('. ');
  return summary + (sentences.length > 3 ? '...' : '.');
}

export async function rewriteText(text: string, style: 'formal' | 'casual' | 'simple'): Promise<string> {
  // Simple rewrite simulation
  if (style === 'formal') {
    return text.replace(/\bi\b/gi, 'I').replace(/dont/gi, "do not").replace(/cant/gi, "cannot");
  }
  if (style === 'casual') {
    return text.replace(/do not/gi, "don't").replace(/cannot/gi, "can't");
  }
  return text;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  // Placeholder - in production, use actual translation API
  const translations: Record<string, Record<string, string>> = {
    'hello': { 'id': 'halo', 'en': 'hello', 'ja': 'こんにちは' },
    'thank you': { 'id': 'terima kasih', 'en': 'thank you', 'ja': 'ありがとう' },
    'good morning': { 'id': 'selamat pagi', 'en': 'good morning', 'ja': 'おはよう' },
  };
  
  const key = text.toLowerCase().trim();
  if (translations[key] && translations[key][targetLang]) {
    return translations[key][targetLang];
  }
  
  return `[${targetLang.toUpperCase()}] ${text}`;
}

export async function checkGrammar(text: string): Promise<{ corrected: string; suggestions: string[] }> {
  const suggestions: string[] = [];
  let corrected = text;
  
  // Basic grammar checks
  if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
    suggestions.push('Tambahkan tanda baca di akhir kalimat');
    corrected += '.';
  }
  
  if (text[0] !== text[0].toUpperCase()) {
    suggestions.push('Huruf pertama harus kapital');
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Tidak ditemukan kesalahan grammar');
  }
  
  return { corrected, suggestions };
}

export async function generateUsername(keywords: string[]): Promise<string[]> {
  const prefixes = ['the', 'cool', 'pro', 'epic', 'ninja', 'cyber', 'neo', 'dark', 'light'];
  const suffixes = ['master', 'king', 'queen', 'pro', 'x', 'official', 'real', '007', '99'];
  
  const usernames: string[] = [];
  
  for (const keyword of keywords) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    usernames.push(`${keyword}${suffix}`);
    usernames.push(`${prefix}${keyword}`);
    usernames.push(`${keyword}_${Math.floor(Math.random() * 1000)}`);
  }
  
  return usernames.slice(0, 10);
}

export async function enhancePrompt(prompt: string): Promise<string> {
  return `${prompt}

Please provide a detailed, well-structured response that includes:
1. Clear explanation of the concept
2. Practical examples where applicable
3. Best practices and recommendations
4. Any relevant considerations or caveats`;
}
