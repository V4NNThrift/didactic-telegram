'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { HiOutlineSearch, HiOutlineBell, HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';

interface HeaderProps {
  title?: string;
  user: {
    username: string;
  };
}

export default function Header({ title, user }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);

  return (
    <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-lg border-b border-dark-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Title */}
        <div className="flex items-center gap-4">
          <div className="lg:hidden w-8" /> {/* Spacer for mobile menu button */}
          {title && (
            <h1 className="text-lg font-semibold text-white hidden sm:block">{title}</h1>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Search (desktop only) */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-48 lg:w-64 bg-dark-800/50 border border-dark-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            {isDark ? (
              <HiOutlineSun className="w-5 h-5" />
            ) : (
              <HiOutlineMoon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors">
            <HiOutlineBell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
          </button>

          {/* User avatar */}
          <div className="ml-2">
            <Avatar name={user.username} size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
