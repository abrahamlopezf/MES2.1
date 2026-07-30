import React from 'react';
import { cn } from '../../utils';
import { Button, ButtonProps } from '../Button/Button';

interface FABProps extends ButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  withBottomNav?: boolean;
}

export const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ className, position = 'bottom-right', withBottomNav = false, ...props }, ref) => {
    
    const positionClasses = {
      'bottom-right': 'right-6',
      'bottom-left': 'left-6',
      'bottom-center': 'left-1/2 -translate-x-1/2',
    };

    return (
      <Button
        ref={ref}
        size="fab"
        className={cn(
          'fixed z-40',
          positionClasses[position],
          withBottomNav ? 'bottom-24' : 'bottom-6', // Ajuste para cuando hay bottom nav
          className
        )}
        {...props}
      />
    );
  }
);

FAB.displayName = 'FAB';
