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
        'w-full mx-auto px-4 py-6 md:px-8 md:py-8 min-h-screen flex flex-col',
        maxWidthClasses[maxWidth],
        withBottomNav && 'pb-24', // Extra padding para que no lo tape el bottom nav en móvil
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
