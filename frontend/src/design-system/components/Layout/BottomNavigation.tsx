import React from 'react';
import { cn } from '../../utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface BottomNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  items: NavItem[];
}

export function BottomNavigation({ items, className, ...props }: BottomNavigationProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex h-20 w-full items-center justify-around border-t border-border bg-card px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden',
        className
      )}
      {...props}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className={cn(
            'flex flex-col items-center justify-center space-y-1 w-full h-full text-muted-foreground transition-colors hover:text-foreground active:scale-95',
            item.isActive && 'text-primary font-semibold'
          )}
        >
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full transition-all',
            item.isActive && 'bg-primary/10'
          )}>
            {item.icon}
          </div>
          <span className="text-[10px] leading-none">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
