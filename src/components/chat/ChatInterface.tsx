'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  HiOutlinePaperAirplane,
  HiOutlineRefresh,
  HiOutlineClipboardCopy,
  HiOutlineStop,
  HiOutlineSparkles,
  HiOutlineLightningBolt,
  HiOutlineChip,
  HiOutlineBeaker,
  HiOutlineEye,
  HiOutlineCheck,
} from 'react-icons/hi';
import { AI_MODES, type AIMode } from '@/lib/ai-engine';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { cn, copyToClipboard } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  tokens?: number;
  responseMs?: number;
  createdAt: string;
}

interface ChatInterfaceProps {
  chatId: string;
  onTitleChange?: (title: string) => void;
}

const modeIcons: Record<AIMode, React.ReactNode> = {
  fast: <HiOutlineLightningBolt className="w-4 h-4" />,
  smart: <HiOutlineChip className="w-4 h-4" />,
  thinking: <HiOutlineBeaker className="w-4 h-4" />,
  creative: <HiOutlineSparkles className="w-4 h-4" />,
  focus: <HiOutlineEye className="w-4 h-4" />,
};

export default function ChatInterface({ chatId, onTitleChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<AIMode>('smart');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/chat/${chatId}/messages`);
        const data = await response.json();
        
        if (data.messages) {
          setMessages(data.messages);
          if (data.mode) setMode(data.mode);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userMessage.content,
          mode,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (data.userMessage && data.assistantMessage) {
        setMessages(prev => [
          ...prev.filter(m => m.id !== userMessage.id),
          data.userMessage,
          data.assistantMessage,
        ]);

        // Update title if first message
        if (messages.length === 0 && onTitleChange) {
          const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
          onTitleChange(title);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error('Failed to send message');
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Stop generating
  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Regenerate last response
  const regenerateResponse = async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Remove last assistant message
    setMessages(prev => {
      const idx = prev.findIndex(m => m.role === 'assistant' && prev.indexOf(m) === prev.length - 1);
      if (idx > -1) return prev.slice(0, idx);
      return prev;
    });

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: lastUserMessage.content,
          mode,
          regenerate: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (data.assistantMessage) {
        setMessages(prev => [...prev, data.assistantMessage]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error('Failed to regenerate');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Suggestion prompts
  const suggestions = [
    'Jelaskan tentang machine learning',
    'Tulis function untuk sorting array',
    'Bantu saya buat caption Instagram',
    'Apa perbedaan React dan Vue?',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 bg-dark-900/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
            AI_MODES[mode].bgColor,
            AI_MODES[mode].color
          )}>
            {modeIcons[mode]}
            {AI_MODES[mode].name}
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-2 h-2 rounded-full',
              isGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'
            )} />
            <span className="text-xs text-dark-400">
              {isGenerating ? 'Generating...' : 'Online'}
            </span>
          </div>
        </div>

        {/* Mode selector button */}
        <div className="relative">
          <button
            onClick={() => setShowModeSelector(!showModeSelector)}
            className="px-3 py-1.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
          >
            Change Mode
          </button>

          {showModeSelector && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowModeSelector(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-20 p-2">
                {(Object.keys(AI_MODES) as AIMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setShowModeSelector(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      mode === m
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      AI_MODES[m].bgColor,
                      AI_MODES[m].color
                    )}>
                      {modeIcons[m]}
                    </div>
                    <div>
                      <div className="font-medium">{AI_MODES[m].name}</div>
                      <div className="text-xs text-dark-400">{AI_MODES[m].description}</div>
                    </div>
                    {mode === m && <HiOutlineCheck className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <HiOutlineSparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">How can I help you today?</h3>
            <p className="text-dark-400 mb-6 max-w-md">
              Ask me anything! I can help with coding, writing, analysis, and more.
            </p>
            
            {/* Suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-3 text-left text-sm bg-dark-800/50 border border-dark-700 rounded-xl text-dark-300 hover:text-white hover:border-dark-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                onRegenerate={message.role === 'assistant' ? regenerateResponse : undefined}
              />
            ))}
            
            {isGenerating && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center flex-shrink-0">
                  <HiOutlineSparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-dark-800/50 border border-dark-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-dark-800 bg-dark-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isGenerating}
                rows={1}
                className="w-full bg-dark-800/50 border border-dark-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-dark-400 resize-none focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all disabled:opacity-50"
              />
            </div>

            {isGenerating ? (
              <Button
                onClick={stopGenerating}
                variant="danger"
                size="lg"
                className="flex-shrink-0"
              >
                <HiOutlineStop className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!input.trim()}
                size="lg"
                className="flex-shrink-0"
              >
                <HiOutlinePaperAirplane className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Info text */}
          <p className="mt-2 text-xs text-dark-500 text-center">
            Mode: <span className={AI_MODES[mode].color}>{AI_MODES[mode].name}</span> • 
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({ 
  message, 
  onRegenerate 
}: { 
  message: Message;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-primary-600 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[85%] lg:max-w-[70%]">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center flex-shrink-0">
        <HiOutlineSparkles className="w-4 h-4 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">Nexus AI</span>
          {message.mode && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              AI_MODES[message.mode as AIMode]?.bgColor,
              AI_MODES[message.mode as AIMode]?.color
            )}>
              {AI_MODES[message.mode as AIMode]?.name || message.mode}
            </span>
          )}
          {message.responseMs && (
            <span className="text-xs text-dark-500">{message.responseMs}ms</span>
          )}
        </div>

        <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl rounded-tl-md px-4 py-3 prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                
                if (!inline && language) {
                  return (
                    <div className="relative group/code my-3">
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="text-xs text-dark-400 px-2 py-0.5 bg-dark-700 rounded">
                          {language}
                        </span>
                        <button
                          onClick={() => copyToClipboard(String(children))}
                          className="p-1.5 rounded bg-dark-700 text-dark-400 hover:text-white opacity-0 group-hover/code:opacity-100 transition-opacity"
                        >
                          <HiOutlineClipboardCopy className="w-4 h-4" />
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.5rem',
                          background: 'rgb(30 41 59)',
                          padding: '1rem',
                          fontSize: '0.875rem',
                        }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                return (
                  <code className="bg-dark-700 text-primary-400 px-1.5 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            {copied ? (
              <>
                <HiOutlineCheck className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <HiOutlineRefresh className="w-3.5 h-3.5" />
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
