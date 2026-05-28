'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {
  HiOutlinePaperAirplane,
  HiOutlineRefresh,
  HiOutlineClipboardCopy,
  HiOutlineStop,
  HiOutlineSparkles,
  HiOutlineCheck,
} from 'react-icons/hi';
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

export default function ChatInterface({ chatId, onTitleChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
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
        if (data.messages) setMessages(data.messages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (chatId) loadMessages();
  }, [chatId]);

  // Auto scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Send message with streaming
  const sendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userContent = input.trim();
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userContent,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setIsGenerating(true);
    setStreamingContent('');

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userContent, stream: true }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Request failed');
      }

      const contentType = response.headers.get('content-type') || '';

      // Handle SSE streaming
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'user_message') {
                // Replace temp user message with real one
                setMessages(prev => prev.map(m => 
                  m.id === tempUserMsg.id ? parsed.data : m
                ));
              } else if (parsed.type === 'content') {
                accumulated += parsed.data;
                setStreamingContent(accumulated);
              } else if (parsed.type === 'done') {
                // Finalize: add assistant message
                setMessages(prev => [...prev, parsed.data]);
                setStreamingContent('');
                
                if (messages.length === 0 && onTitleChange) {
                  onTitleChange(userContent.slice(0, 50));
                }
              } else if (parsed.type === 'error') {
                toast.error(parsed.data);
              }
            } catch {
              // Skip unparseable
            }
          }
        }
      } else {
        // Non-streaming JSON fallback
        const data = await response.json();
        if (data.userMessage) {
          setMessages(prev => prev.map(m =>
            m.id === tempUserMsg.id ? data.userMessage : m
          ));
        }
        if (data.assistantMessage) {
          setMessages(prev => [...prev, data.assistantMessage]);
        }
        if (data.error) {
          toast.error(data.error);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error(error.message || 'Gagal mengirim pesan');
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  };

  const stopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  const regenerateResponse = async () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;

    // Remove last assistant
    setMessages(prev => {
      const lastAssistantIdx = prev.map(m => m.role).lastIndexOf('assistant');
      if (lastAssistantIdx > -1) return prev.slice(0, lastAssistantIdx);
      return prev;
    });

    setInput(lastUser.content);
    // Will send on next tick via effect or manually
    setTimeout(() => {
      setInput('');
      setIsGenerating(true);
      setStreamingContent('');
      // Replay the send
      sendMessageDirect(lastUser.content, true);
    }, 100);
  };

  const sendMessageDirect = async (content: string, regenerate: boolean) => {
    abortControllerRef.current = new AbortController();
    setStreamingContent('');

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, stream: true, regenerate }),
        signal: abortControllerRef.current.signal,
      });

      if (response.body && response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === 'content') {
                accumulated += parsed.data;
                setStreamingContent(accumulated);
              } else if (parsed.type === 'done') {
                setMessages(prev => [...prev, parsed.data]);
                setStreamingContent('');
              }
            } catch {}
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') toast.error('Regenerate gagal');
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    'Jelaskan apa itu API',
    'Buatkan function sorting array',
    'Ringkas teks panjang ini',
    'Bantu fix error kode saya',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 bg-dark-900/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500/10 text-primary-400">
            <HiOutlineSparkles className="w-4 h-4" />
            Auto Mode
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-2 h-2 rounded-full',
              isGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'
            )} />
            <span className="text-xs text-dark-400">
              {isGenerating ? 'AI sedang berpikir...' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <HiOutlineSparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Nexus AI</h3>
            <p className="text-dark-400 mb-6 max-w-md">
              Tanya apapun. Coding, writing, analisis, ide — saya bantu.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-4 py-3 text-left text-sm bg-dark-800/50 border border-dark-700 rounded-xl text-dark-300 hover:text-white hover:border-dark-600 transition-colors"
                >
                  {s}
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

            {/* Streaming content */}
            {streamingContent && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center flex-shrink-0">
                  <HiOutlineSparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl rounded-tl-md px-4 py-3 prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent + '▊'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator without content yet */}
            {isGenerating && !streamingContent && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center flex-shrink-0">
                  <HiOutlineSparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-dark-800/50 border border-dark-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-dark-400 text-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-dark-800 bg-dark-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan..."
              disabled={isGenerating}
              rows={1}
              className="flex-1 bg-dark-800/50 border border-dark-700 rounded-xl px-4 py-3 text-white placeholder-dark-400 resize-none focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all disabled:opacity-50"
            />
            {isGenerating ? (
              <Button onClick={stopGenerating} variant="danger" size="lg" className="flex-shrink-0">
                <HiOutlineStop className="w-5 h-5" />
              </Button>
            ) : (
              <Button onClick={sendMessage} disabled={!input.trim()} size="lg" className="flex-shrink-0">
                <HiOutlinePaperAirplane className="w-5 h-5" />
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-dark-500 text-center">
            Enter untuk kirim • Shift+Enter baris baru
          </p>
        </div>
      </div>
    </div>
  );
}

// Message bubble
function MessageBubble({ message, onRegenerate }: { message: Message; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(message.content);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (message.role === 'user') {
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
          {message.responseMs && (
            <span className="text-xs text-dark-500">{(message.responseMs / 1000).toFixed(1)}s</span>
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
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        <span className="text-xs text-dark-400 px-2 py-0.5 bg-dark-700 rounded">{language}</span>
                        <button
                          onClick={() => copyToClipboard(String(children))}
                          className="p-1.5 rounded bg-dark-700 text-dark-400 hover:text-white opacity-0 group-hover/code:opacity-100 transition-opacity"
                        >
                          <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={language}
                        PreTag="div"
                        customStyle={{ margin: 0, borderRadius: '0.5rem', background: 'rgb(30 41 59)', padding: '1rem', fontSize: '0.85rem' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return <code className="bg-dark-700 text-primary-400 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-dark-400 hover:text-white hover:bg-dark-800 transition-colors">
            {copied ? <><HiOutlineCheck className="w-3.5 h-3.5" />Copied</> : <><HiOutlineClipboardCopy className="w-3.5 h-3.5" />Copy</>}
          </button>
          {onRegenerate && (
            <button onClick={onRegenerate} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-dark-400 hover:text-white hover:bg-dark-800 transition-colors">
              <HiOutlineRefresh className="w-3.5 h-3.5" />Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
