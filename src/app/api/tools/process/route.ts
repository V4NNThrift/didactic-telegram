import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

// Tool processing functions
async function summarizeText(text: string): Promise<string> {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  if (sentences.length <= 3) {
    return text;
  }
  
  // Extract key sentences
  const keyPoints = sentences
    .slice(0, Math.min(5, Math.ceil(sentences.length / 3)))
    .map(s => `• ${s.trim()}`)
    .join('\n');
  
  return `**Summary:**\n\n${keyPoints}`;
}

async function rewriteText(text: string, style: string): Promise<string> {
  let rewritten = text;
  
  switch (style) {
    case 'formal':
      rewritten = text
        .replace(/\bi'm\b/gi, "I am")
        .replace(/\bdon't\b/gi, "do not")
        .replace(/\bcan't\b/gi, "cannot")
        .replace(/\bwon't\b/gi, "will not")
        .replace(/\bkinda\b/gi, "kind of")
        .replace(/\bgonna\b/gi, "going to")
        .replace(/\bwanna\b/gi, "want to");
      break;
    case 'casual':
      rewritten = text
        .replace(/\bdo not\b/gi, "don't")
        .replace(/\bcannot\b/gi, "can't")
        .replace(/\bwill not\b/gi, "won't")
        .replace(/\bI am\b/gi, "I'm");
      break;
    case 'simple':
      // Simplify by breaking into shorter sentences
      rewritten = text.replace(/([.!?])\s*/g, '$1\n');
      break;
  }
  
  return `**${style.charAt(0).toUpperCase() + style.slice(1)} version:**\n\n${rewritten}`;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  // Basic translations for demo
  const commonPhrases: Record<string, Record<string, string>> = {
    'hello': { en: 'Hello', id: 'Halo', ja: 'こんにちは', ko: '안녕하세요', zh: '你好' },
    'thank you': { en: 'Thank you', id: 'Terima kasih', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢' },
    'good morning': { en: 'Good morning', id: 'Selamat pagi', ja: 'おはようございます', ko: '좋은 아침', zh: '早上好' },
    'goodbye': { en: 'Goodbye', id: 'Selamat tinggal', ja: 'さようなら', ko: '안녕히 가세요', zh: '再见' },
    'how are you': { en: 'How are you?', id: 'Apa kabar?', ja: 'お元気ですか', ko: '어떻게 지내세요?', zh: '你好吗?' },
  };
  
  const lower = text.toLowerCase().trim();
  const translation = commonPhrases[lower]?.[targetLang];
  
  if (translation) {
    return `**Translation (${targetLang.toUpperCase()}):**\n\n${translation}`;
  }
  
  // For other text, return placeholder
  const langNames: Record<string, string> = {
    en: 'English',
    id: 'Indonesian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
  };
  
  return `**Translation (${langNames[targetLang] || targetLang}):**\n\n[Translated text would appear here]\n\n*Note: Full translation requires external API integration.*`;
}

async function explainCode(code: string): Promise<string> {
  // Detect language
  let language = 'Code';
  if (code.includes('function') || code.includes('const') || code.includes('let')) {
    language = 'JavaScript/TypeScript';
  } else if (code.includes('def ') || code.includes('import ')) {
    language = 'Python';
  } else if (code.includes('public class') || code.includes('void ')) {
    language = 'Java';
  }
  
  const lines = code.split('\n').length;
  const hasFunction = /function|def |const .* = \(|=>/.test(code);
  const hasLoop = /for|while|foreach/.test(code);
  const hasCondition = /if|else|switch/.test(code);
  
  return `**Code Analysis:**

**Language:** ${language}
**Lines of code:** ${lines}

**Structure:**
${hasFunction ? '• Contains function definition(s)\n' : ''}${hasLoop ? '• Contains loop(s)\n' : ''}${hasCondition ? '• Contains conditional logic\n' : ''}

**What this code does:**
This ${language} code appears to ${hasFunction ? 'define functionality' : 'execute statements'} that ${hasLoop ? 'iterates over data' : 'processes input'}${hasCondition ? ' with conditional logic' : ''}.

**Key components identified:**
• Main logic block
${hasFunction ? '• Function definition(s)' : ''}
${hasLoop ? '• Loop structure for iteration' : ''}
${hasCondition ? '• Conditional branching' : ''}

*For detailed line-by-line explanation, please specify the exact part you want explained.*`;
}

async function checkGrammar(text: string): Promise<string> {
  const issues: string[] = [];
  let corrected = text;
  
  // Check capitalization
  if (text[0] !== text[0].toUpperCase()) {
    issues.push('• First letter should be capitalized');
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }
  
  // Check ending punctuation
  if (!/[.!?]$/.test(text.trim())) {
    issues.push('• Missing punctuation at the end');
    corrected = corrected.trim() + '.';
  }
  
  // Check double spaces
  if (/  +/.test(text)) {
    issues.push('• Multiple consecutive spaces detected');
    corrected = corrected.replace(/  +/g, ' ');
  }
  
  // Check common mistakes
  if (/\bi\b/.test(text)) {
    issues.push('• Lowercase "i" should be "I"');
    corrected = corrected.replace(/\bi\b/g, 'I');
  }
  
  if (issues.length === 0) {
    return '**Grammar Check:**\n\n✅ No grammar issues found! Your text looks good.';
  }
  
  return `**Grammar Check:**

**Issues found:**
${issues.join('\n')}

**Corrected version:**
${corrected}`;
}

async function generateCaption(context: string, platform: string): Promise<string> {
  const captions = {
    Instagram: [
      `✨ ${context} | Living my best life 🌟`,
      `📸 ${context} vibes | #goodvibes #lifestyle`,
      `Making memories with ${context.toLowerCase()} 💫`,
      `${context} | Because every moment matters ❤️`,
    ],
    Twitter: [
      `${context} - thoughts? 🤔`,
      `Just discovered something about ${context.toLowerCase()} and wow...`,
      `Hot take: ${context} is underrated. Change my mind.`,
    ],
    LinkedIn: [
      `Excited to share my journey with ${context}. Key learnings below 👇`,
      `${context} has taught me valuable lessons about growth and persistence.`,
      `Reflecting on ${context} - here's what I've learned...`,
    ],
    TikTok: [
      `POV: you're experiencing ${context.toLowerCase()} for the first time 😱`,
      `${context} check ✅ | #fyp #viral`,
      `Wait for it... ${context} reveal! 🔥`,
    ],
  };
  
  const platformCaptions = captions[platform as keyof typeof captions] || captions.Instagram;
  
  return `**Caption Ideas for ${platform}:**\n\n${platformCaptions.map((c, i) => `${i + 1}. ${c}`).join('\n\n')}`;
}

async function generateUsername(input: string, keywords: string): Promise<string> {
  const baseWords = input.toLowerCase().split(/\s+/);
  const keywordList = keywords ? keywords.toLowerCase().split(',').map(k => k.trim()) : [];
  
  const prefixes = ['the', 'cool', 'pro', 'epic', 'ninja', 'cyber', 'neo', 'dark', 'light', 'real'];
  const suffixes = ['master', 'king', 'queen', 'pro', 'x', 'official', 'real', '007', '99', 'gg'];
  
  const usernames: string[] = [];
  
  // Generate variations
  for (const word of [...baseWords, ...keywordList].slice(0, 3)) {
    if (!word) continue;
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 1000);
    
    usernames.push(`${word}${suffix}`);
    usernames.push(`${prefix}${word}`);
    usernames.push(`${word}_${num}`);
    usernames.push(`${word}${num}${suffix}`);
    usernames.push(`_${word}_`);
  }
  
  const unique = [...new Set(usernames)].slice(0, 10);
  
  return `**Username Suggestions:**\n\n${unique.map((u, i) => `${i + 1}. @${u}`).join('\n')}`;
}

async function generateBio(context: string): Promise<string> {
  return `**Bio Suggestions:**

**Professional:**
${context} enthusiast | Building the future | Lifelong learner 📚

**Creative:**
Turning ${context.toLowerCase()} into art ✨ | Dreamer & Doer | Creating my own path

**Minimal:**
${context} | Create • Learn • Grow 🌱

**Bold:**
${context} is my superpower 🚀 | CEO of my destiny | Making impossible possible

**Friendly:**
Hey! I'm into ${context.toLowerCase()} 👋 | Coffee lover ☕ | Always learning something new`;
}

async function enhancePrompt(prompt: string): Promise<string> {
  return `**Enhanced Prompt:**

${prompt}

Please provide a detailed, well-structured response that includes:

1. **Clear explanation** of the main concept or topic
2. **Practical examples** to illustrate key points
3. **Step-by-step guide** if applicable
4. **Best practices** and recommendations
5. **Common pitfalls** to avoid
6. **Additional resources** for further learning

Format the response with clear headings and bullet points for easy reading.`;
}

async function generateArticleIdeas(topic: string): Promise<string> {
  return `**Article Ideas for "${topic}":**

1. **Beginner's Guide to ${topic}**
   Complete introduction for newcomers

2. **${topic}: Common Mistakes and How to Avoid Them**
   Learning from others' experiences

3. **The Future of ${topic}: Trends and Predictions**
   Forward-looking analysis

4. **${topic} vs [Alternative]: Which Should You Choose?**
   Comparative analysis

5. **How I Mastered ${topic} in [Timeframe]**
   Personal journey story

6. **${topic} Best Practices for ${new Date().getFullYear()}**
   Updated guidelines and tips

7. **The Hidden Benefits of ${topic}**
   Unexpected advantages

8. **${topic}: A Complete Case Study**
   In-depth real-world example`;
}

async function helpWithRegex(description: string): Promise<string> {
  const commonPatterns: Record<string, { pattern: string; explanation: string }> = {
    email: {
      pattern: '/^[\\w.-]+@[\\w.-]+\\.\\w+$/',
      explanation: 'Matches standard email format (user@domain.com)',
    },
    phone: {
      pattern: '/^\\+?[\\d\\s-]{10,}$/',
      explanation: 'Matches phone numbers with optional + prefix',
    },
    url: {
      pattern: '/https?:\\/\\/[\\w.-]+(?:\\.[\\w.-]+)+[\\w\\-._~:/?#[\\]@!$&\'()*+,;=]*/',
      explanation: 'Matches HTTP/HTTPS URLs',
    },
    number: {
      pattern: '/^-?\\d+(\\.\\d+)?$/',
      explanation: 'Matches integers and decimal numbers',
    },
    date: {
      pattern: '/^\\d{4}-\\d{2}-\\d{2}$/',
      explanation: 'Matches dates in YYYY-MM-DD format',
    },
  };
  
  const lower = description.toLowerCase();
  
  for (const [key, value] of Object.entries(commonPatterns)) {
    if (lower.includes(key)) {
      return `**Regex Pattern:**

\`\`\`
${value.pattern}
\`\`\`

**Explanation:**
${value.explanation}

**Usage example (JavaScript):**
\`\`\`javascript
const pattern = ${value.pattern};
const isValid = pattern.test('your-text-here');
\`\`\``;
    }
  }
  
  return `**Regex Help:**

Based on your description: "${description}"

I'll help you create a pattern. Here are some common regex components:

• \\d - Match any digit
• \\w - Match word character (letter, digit, underscore)
• \\s - Match whitespace
• . - Match any character
• * - Zero or more times
• + - One or more times
• ? - Zero or one time
• ^ - Start of string
• $ - End of string
• [] - Character class
• () - Grouping

**Need help with a specific pattern?** Describe what you want to match more specifically.`;
}

async function formatJson(input: string): Promise<string> {
  try {
    const parsed = JSON.parse(input);
    const formatted = JSON.stringify(parsed, null, 2);
    
    return `**Formatted JSON:**

\`\`\`json
${formatted}
\`\`\`

✅ Valid JSON with ${Object.keys(parsed).length} top-level ${Array.isArray(parsed) ? 'items' : 'keys'}`;
  } catch (error: any) {
    return `**JSON Error:**

❌ Invalid JSON

**Error:** ${error.message}

**Tips:**
• Check for missing commas between properties
• Ensure all strings use double quotes (not single)
• Verify all brackets are properly closed
• Remove trailing commas`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(session.userId, 'ai-tool');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { tool, input, options = {} } = body;

    if (!tool || !input) {
      return NextResponse.json({ error: 'Tool and input required' }, { status: 400 });
    }

    let result = '';

    switch (tool) {
      case 'summarize':
        result = await summarizeText(input);
        break;
      case 'rewrite':
        result = await rewriteText(input, options.style || 'formal');
        break;
      case 'translate':
        result = await translateText(input, options.targetLang || 'en');
        break;
      case 'explain-code':
        result = await explainCode(input);
        break;
      case 'grammar':
        result = await checkGrammar(input);
        break;
      case 'caption':
        result = await generateCaption(input, options.platform || 'Instagram');
        break;
      case 'username':
        result = await generateUsername(input, options.keywords || '');
        break;
      case 'bio':
        result = await generateBio(input);
        break;
      case 'prompt':
        result = await enhancePrompt(input);
        break;
      case 'article-idea':
        result = await generateArticleIdeas(input);
        break;
      case 'regex':
        result = await helpWithRegex(input);
        break;
      case 'json':
        result = await formatJson(input);
        break;
      default:
        return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
    }

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'tool',
        action: `Used ${tool} tool`,
        metadata: JSON.stringify({ inputLength: input.length }),
      },
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Tool process error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
