import React from 'react';
import { cn } from '../../utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  withBottomNav?: boolean;
}

export function PageContainer({
  children,
  className,
  maxWidth = 'lg',
  withBottomNav = false,
  ...props
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto flex flex-col',
        maxWidthClasses[maxWidth],
        withBottomNav && 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
