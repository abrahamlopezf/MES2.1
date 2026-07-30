import React from 'react';
import { cn } from '../../utils';

interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function TopBar({ title, leftAction, rightAction, className, ...props }: TopBarProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md',
        className
      )}
      {...props}
    >
      <div className="flex w-12 items-center justify-start">{leftAction}</div>
      <h1 className="flex-1 truncate text-center text-lg font-bold text-foreground">
        {title}
      </h1>
      <div className="flex w-12 items-center justify-end">{rightAction}</div>
    </div>
  );
}
