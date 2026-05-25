'use client';

import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn(
          'rounded-full object-cover',
          sizes[size],
          className
        )}
      />
    );
  }

  const initials = name ? getInitials(name) : '?';
  
  // Generate consistent color from name
  const colors = [
    'bg-primary-500',
    'bg-accent-purple',
    'bg-accent-pink',
    'bg-accent-cyan',
    'bg-accent-emerald',
    'bg-accent-orange',
  ];
  
  const colorIndex = name 
    ? name.charCodeAt(0) % colors.length 
    : 0;
  
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium text-white',
        colors[colorIndex],
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
