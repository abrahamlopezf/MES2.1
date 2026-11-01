import React from 'react';
import { cn } from '../../utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface BottomNavigationProps extends React.HTMLAttributes<HTMLElement> {
  items: NavItem[];
}

export function BottomNavigation({ items, className, ...props }: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegación principal móvil"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex w-full items-center justify-around border-t border-border bg-card px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.08)] lg:hidden',
        'h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)]',
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          type="button"
          aria-current={item.isActive ? 'page' : undefined}
          data-ignore-accessibility-min-height
          className={cn(
            'group flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            item.isActive && 'text-primary font-bold'
          )}
        >
          <span aria-hidden="true" className={cn(
            'flex h-9 w-10 items-center justify-center rounded-full transition-colors duration-200',
            item.isActive && 'bg-primary/10'
          )}>
            {item.icon}
          </span>
          <span className="max-w-full truncate text-sm leading-tight">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
