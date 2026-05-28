'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  HiOutlineHome,
  HiOutlineChat,
  HiOutlineLightningBolt,
  HiOutlineCollection,
  HiOutlineUser,
} from 'react-icons/hi';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: HiOutlineHome },
  { href: '/dashboard/chat', label: 'Chat', icon: HiOutlineChat },
  { href: '/dashboard/tools', label: 'Tools', icon: HiOutlineLightningBolt },
  { href: '/dashboard/hub', label: 'Hub', icon: HiOutlineCollection },
  { href: '/dashboard/profile', label: 'Profile', icon: HiOutlineUser },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-lg border-t border-dark-800 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                isActive 
                  ? 'text-primary-400' 
                  : 'text-dark-400 active:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
