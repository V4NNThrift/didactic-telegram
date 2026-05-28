'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  HiOutlineChat, 
  HiOutlineLightningBolt,
  HiOutlineDocumentText,
  HiOutlineUser,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineShieldCheck,
  HiOutlineCollection,
  HiOutlineSparkles,
} from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';

interface SidebarProps {
  user: {
    username: string;
    isAdmin: boolean;
  };
}

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { href: '/dashboard/chat', label: 'AI Chat', icon: HiOutlineChat },
  { href: '/dashboard/tools', label: 'AI Tools', icon: HiOutlineLightningBolt },
  { href: '/dashboard/hub', label: 'Personal Hub', icon: HiOutlineCollection },
];

const bottomNavItems = [
  { href: '/dashboard/profile', label: 'Profile', icon: HiOutlineUser },
  { href: '/dashboard/settings', label: 'Settings', icon: HiOutlineCog },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    
    return (
      <Link
        href={href}
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          isActive 
            ? 'bg-primary-500/10 text-primary-400' 
            : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-400')} />
        {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-white"
      >
        <HiOutlineMenu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col bg-dark-900 border-r border-dark-800',
          'transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[68px]' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
                <HiOutlineSparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Nexus AI</span>
            </Link>
          )}
          
          {/* Mobile close / Desktop collapse */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileOpen(false);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            {isMobileOpen ? (
              <HiOutlineX className="w-5 h-5 lg:hidden" />
            ) : null}
            <HiOutlineMenu className={cn('w-5 h-5 hidden lg:block', isCollapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          
          {user.isAdmin && (
            <>
              <div className="my-4 border-t border-dark-800" />
              <NavLink 
                href="/dashboard/admin" 
                label="Admin Panel" 
                icon={HiOutlineShieldCheck} 
              />
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-dark-800 space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          
          {/* Logout */}
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <HiOutlineLogout className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </form>
        </div>

        {/* User info */}
        <div className="p-3 border-t border-dark-800">
          <div className={cn(
            'flex items-center gap-3 p-2 rounded-lg bg-dark-800/50',
            isCollapsed && 'justify-center'
          )}>
            <Avatar name={user.username} size="sm" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.username}</p>
                <p className="text-xs text-dark-400">
                  {user.isAdmin ? 'Admin' : 'Member'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
