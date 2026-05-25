'use client';

import { useState } from 'react';
import { 
  HiOutlineDocumentText,
  HiOutlinePencilAlt,
  HiOutlineTranslate,
  HiOutlineCode,
  HiOutlineCheckCircle,
  HiOutlinePhotograph,
  HiOutlineUser,
  HiOutlineSparkles,
  HiOutlineLightningBolt,
  HiOutlineClipboardList,
  HiOutlineTerminal,
  HiOutlineTemplate,
  HiOutlineArrowLeft,
} from 'react-icons/hi';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';
import { cn, copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

const tools = [
  {
    id: 'summarize',
    name: 'Text Summarizer',
    description: 'Ringkas teks panjang menjadi poin-poin penting',
    icon: HiOutlineDocumentText,
    color: 'from-blue-500 to-cyan-500',
    category: 'Writing',
  },
  {
    id: 'rewrite',
    name: 'Text Rewriter',
    description: 'Tulis ulang teks dengan gaya berbeda',
    icon: HiOutlinePencilAlt,
    color: 'from-purple-500 to-pink-500',
    category: 'Writing',
  },
  {
    id: 'translate',
    name: 'Translator',
    description: 'Terjemahkan teks ke berbagai bahasa',
    icon: HiOutlineTranslate,
    color: 'from-emerald-500 to-teal-500',
    category: 'Language',
  },
  {
    id: 'explain-code',
    name: 'Code Explainer',
    description: 'Jelaskan kode secara detail',
    icon: HiOutlineCode,
    color: 'from-orange-500 to-red-500',
    category: 'Coding',
  },
  {
    id: 'grammar',
    name: 'Grammar Checker',
    description: 'Periksa dan perbaiki tata bahasa',
    icon: HiOutlineCheckCircle,
    color: 'from-green-500 to-emerald-500',
    category: 'Writing',
  },
  {
    id: 'caption',
    name: 'Caption Generator',
    description: 'Buat caption menarik untuk sosial media',
    icon: HiOutlinePhotograph,
    color: 'from-pink-500 to-rose-500',
    category: 'Social',
  },
  {
    id: 'username',
    name: 'Username Generator',
    description: 'Generate username unik dan kreatif',
    icon: HiOutlineUser,
    color: 'from-indigo-500 to-purple-500',
    category: 'Social',
  },
  {
    id: 'bio',
    name: 'Bio Generator',
    description: 'Buat bio profesional atau kreatif',
    icon: HiOutlineSparkles,
    color: 'from-amber-500 to-orange-500',
    category: 'Social',
  },
  {
    id: 'prompt',
    name: 'Prompt Enhancer',
    description: 'Tingkatkan kualitas prompt AI',
    icon: HiOutlineLightningBolt,
    color: 'from-yellow-500 to-amber-500',
    category: 'AI',
  },
  {
    id: 'article-idea',
    name: 'Article Ideas',
    description: 'Generate ide artikel berdasarkan topik',
    icon: HiOutlineClipboardList,
    color: 'from-cyan-500 to-blue-500',
    category: 'Writing',
  },
  {
    id: 'regex',
    name: 'Regex Helper',
    description: 'Buat dan jelaskan pola regex',
    icon: HiOutlineTerminal,
    color: 'from-slate-500 to-gray-600',
    category: 'Coding',
  },
  {
    id: 'json',
    name: 'JSON Formatter',
    description: 'Format dan validate JSON',
    icon: HiOutlineTemplate,
    color: 'from-teal-500 to-cyan-500',
    category: 'Coding',
  },
];

const categories = ['All', 'Writing', 'Language', 'Coding', 'Social', 'AI'];

export default function ToolsPage() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTools = activeCategory === 'All' 
    ? tools 
    : tools.filter(t => t.category === activeCategory);

  if (selectedTool) {
    return (
      <ToolView 
        toolId={selectedTool} 
        onBack={() => setSelectedTool(null)} 
      />
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Badge variant="primary" className="mb-2">AI Tools</Badge>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          AI Tool Hub
        </h1>
        <p className="text-dark-400">
          Koleksi tools AI untuk meningkatkan produktivitas Anda
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeCategory === cat
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tools grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className="text-left"
          >
            <Card hover className="h-full group">
              <div className={cn(
                'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform',
                tool.color
              )}>
                <tool.icon className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="group-hover:text-primary-400 transition-colors">
                {tool.name}
              </CardTitle>
              <CardDescription>{tool.description}</CardDescription>
              <Badge variant="default" className="mt-3">{tool.category}</Badge>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

// Tool view component
function ToolView({ toolId, onBack }: { toolId: string; onBack: () => void }) {
  const tool = tools.find(t => t.id === toolId);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>({});

  if (!tool) return null;

  const handleProcess = async () => {
    if (!input.trim()) {
      toast.error('Masukkan teks terlebih dahulu');
      return;
    }

    setIsLoading(true);
    setOutput('');

    try {
      const response = await fetch('/api/tools/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: toolId,
          input: input.trim(),
          options,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        setOutput(data.result);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (output) {
      await copyToClipboard(output);
      toast.success('Copied to clipboard!');
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setOptions({});
  };

  // Tool-specific options
  const renderOptions = () => {
    switch (toolId) {
      case 'rewrite':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-200 mb-2">Style</label>
            <div className="flex gap-2">
              {['formal', 'casual', 'simple'].map(style => (
                <button
                  key={style}
                  onClick={() => setOptions({ ...options, style })}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                    options.style === style
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-800 text-dark-300 hover:text-white'
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'translate':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-200 mb-2">Target Language</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { code: 'en', name: 'English' },
                { code: 'id', name: 'Indonesia' },
                { code: 'ja', name: 'Japanese' },
                { code: 'ko', name: 'Korean' },
                { code: 'zh', name: 'Chinese' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setOptions({ ...options, targetLang: lang.code })}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    options.targetLang === lang.code
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-800 text-dark-300 hover:text-white'
                  )}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        );

      case 'caption':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-200 mb-2">Platform</label>
            <div className="flex gap-2 flex-wrap">
              {['Instagram', 'Twitter', 'LinkedIn', 'TikTok'].map(platform => (
                <button
                  key={platform}
                  onClick={() => setOptions({ ...options, platform })}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    options.platform === platform
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-800 text-dark-300 hover:text-white'
                  )}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
        );

      case 'username':
        return (
          <div className="mb-4">
            <Input
              label="Keywords (optional)"
              placeholder="e.g., gaming, creative, tech"
              value={options.keywords || ''}
              onChange={(e) => setOptions({ ...options, keywords: e.target.value })}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getPlaceholder = () => {
    switch (toolId) {
      case 'summarize': return 'Paste your long text here to summarize...';
      case 'rewrite': return 'Enter the text you want to rewrite...';
      case 'translate': return 'Enter text to translate...';
      case 'explain-code': return 'Paste your code here...';
      case 'grammar': return 'Enter text to check grammar...';
      case 'caption': return 'Describe your photo or context...';
      case 'username': return 'Enter your name or keywords...';
      case 'bio': return 'Tell us about yourself or your brand...';
      case 'prompt': return 'Enter your basic prompt to enhance...';
      case 'article-idea': return 'Enter your topic or niche...';
      case 'regex': return 'Describe what pattern you need...';
      case 'json': return 'Paste your JSON here...';
      default: return 'Enter your input...';
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-dark-400 hover:text-white mb-6 transition-colors"
      >
        <HiOutlineArrowLeft className="w-5 h-5" />
        Back to Tools
      </button>

      {/* Tool header */}
      <div className="flex items-start gap-4 mb-8">
        <div className={cn(
          'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
          tool.color
        )}>
          <tool.icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{tool.name}</h1>
          <p className="text-dark-400">{tool.description}</p>
        </div>
      </div>

      {/* Options */}
      {renderOptions()}

      {/* Input */}
      <Card className="mb-4">
        <Textarea
          label="Input"
          placeholder={getPlaceholder()}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          autoResize
          maxHeight={300}
        />
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-dark-500">
            {input.length} characters
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleProcess} isLoading={isLoading}>
              Process
            </Button>
          </div>
        </div>
      </Card>

      {/* Output */}
      {output && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-dark-200">Result</span>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              Copy
            </Button>
          </div>
          <div className="bg-dark-900/50 rounded-lg p-4 whitespace-pre-wrap text-dark-200">
            {output}
          </div>
        </Card>
      )}
    </div>
  );
}
