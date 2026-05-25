'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  HiOutlinePlus, 
  HiOutlineSearch,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineStar,
  HiOutlineArchive,
  HiOutlineMenuAlt2,
  HiOutlineX,
} from 'react-icons/hi';
import ChatInterface from '@/components/chat/ChatInterface';
import ChatSidebar from '@/components/chat/ChatSidebar';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Chat {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  mode: string;
  updatedAt: string;
  messageCount?: number;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();
      
      if (data.chats) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Handle URL params for chat selection
  useEffect(() => {
    const chatId = searchParams.get('id');
    if (chatId && chats.some(c => c.id === chatId)) {
      setActiveChat(chatId);
    }
  }, [searchParams, chats]);

  // Create new chat
  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      const data = await response.json();
      
      if (data.chat) {
        setChats(prev => [data.chat, ...prev]);
        setActiveChat(data.chat.id);
        router.push(`/dashboard/chat?id=${data.chat.id}`);
        setSidebarOpen(false);
      }
    } catch (error) {
      toast.error('Failed to create chat');
    }
  };

  // Select chat
  const selectChat = (chatId: string) => {
    setActiveChat(chatId);
    router.push(`/dashboard/chat?id=${chatId}`);
    setSidebarOpen(false);
  };

  // Delete chat
  const deleteChat = async (chatId: string) => {
    if (!confirm('Hapus chat ini?')) return;

    try {
      await fetch(`/api/chat/${chatId}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c.id !== chatId));
      
      if (activeChat === chatId) {
        setActiveChat(null);
        router.push('/dashboard/chat');
      }
      
      toast.success('Chat deleted');
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  // Toggle pin
  const togglePin = async (chatId: string) => {
    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;

      await fetch(`/api/chat/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !chat.isPinned }),
      });

      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, isPinned: !c.isPinned } : c
      ));
    } catch (error) {
      toast.error('Failed to update chat');
    }
  };

  // Rename chat
  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      await fetch(`/api/chat/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, title: newTitle } : c
      ));
    } catch (error) {
      toast.error('Failed to rename chat');
    }
  };

  // Filter chats
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter(c => c.isPinned && !c.isArchived);
  const recentChats = filteredChats.filter(c => !c.isPinned && !c.isArchived);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-30 p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-white"
      >
        <HiOutlineMenuAlt2 className="w-5 h-5" />
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat sidebar */}
      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-dark-900 border-r border-dark-800 flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-dark-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">AI Chat</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
          
          <Button
            onClick={createNewChat}
            className="w-full"
            leftIcon={<HiOutlinePlus className="w-5 h-5" />}
          >
            New Chat
          </Button>

          {/* Search */}
          <div className="relative mt-3">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-800/50 border border-dark-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-dark-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-dark-400 text-sm">No chats yet</p>
              <p className="text-dark-500 text-xs mt-1">Start a new conversation</p>
            </div>
          ) : (
            <>
              {/* Pinned chats */}
              {pinnedChats.length > 0 && (
                <div className="mb-4">
                  <p className="px-2 py-1 text-xs font-medium text-dark-500 uppercase">Pinned</p>
                  {pinnedChats.map(chat => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat === chat.id}
                      onSelect={() => selectChat(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                      onTogglePin={() => togglePin(chat.id)}
                      onRename={(title) => renameChat(chat.id, title)}
                    />
                  ))}
                </div>
              )}

              {/* Recent chats */}
              {recentChats.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-medium text-dark-500 uppercase">Recent</p>
                  {recentChats.map(chat => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat === chat.id}
                      onSelect={() => selectChat(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                      onTogglePin={() => togglePin(chat.id)}
                      onRename={(title) => renameChat(chat.id, title)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeChat ? (
          <ChatInterface 
            chatId={activeChat} 
            onTitleChange={(title) => {
              setChats(prev => prev.map(c => 
                c.id === activeChat ? { ...c, title } : c
              ));
            }}
          />
        ) : (
          <EmptyChatState onNewChat={createNewChat} />
        )}
      </main>
    </div>
  );
}

// Chat list item component
function ChatListItem({ 
  chat, 
  isActive, 
  onSelect, 
  onDelete, 
  onTogglePin,
  onRename,
}: {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onRename: (title: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      onRename(newTitle.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div 
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
        isActive 
          ? 'bg-primary-500/10 text-primary-400' 
          : 'text-dark-300 hover:bg-dark-800 hover:text-white'
      )}
      onClick={() => !isRenaming && onSelect()}
    >
      {chat.isPinned && (
        <HiOutlineStar className="w-4 h-4 text-yellow-500 flex-shrink-0" />
      )}
      
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          className="flex-1 bg-dark-700 px-2 py-0.5 rounded text-sm text-white"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm">{chat.title}</span>
      )}

      {/* Menu button */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={cn(
            'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-dark-700 text-dark-400 hover:text-white',
            showMenu && 'opacity-100'
          )}
        >
          <HiOutlineDotsVertical className="w-4 h-4" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)} 
            />
            <div className="absolute right-0 top-full mt-1 w-40 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-20 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-white"
              >
                <HiOutlinePencil className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-white"
              >
                <HiOutlineStar className="w-4 h-4" />
                {chat.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <HiOutlineTrash className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Empty state component
function EmptyChatState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Start a Conversation</h2>
        <p className="text-dark-400 mb-6">
          Chat with AI in multiple modes - Fast, Smart, Thinking, Creative, or Focus.
          Choose the mode that fits your needs.
        </p>
        <Button onClick={onNewChat} size="lg" leftIcon={<HiOutlinePlus className="w-5 h-5" />}>
          New Chat
        </Button>
      </div>
    </div>
  );
}
