'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-dark-500">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-dark-200 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-dark-400 text-sm max-w-sm mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
