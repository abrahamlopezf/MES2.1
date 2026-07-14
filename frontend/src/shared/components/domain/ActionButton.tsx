import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button.tsx';
import { AllowedAction } from '@/core/qr-workspace/types/qr-workspace.types';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface ActionButtonProps extends Omit<ButtonProps, 'children'> {
  action: AllowedAction;
  showIcon?: boolean;
  isLoading?: boolean;
}

export function ActionButton({ action, showIcon = true, isLoading, className, ...props }: ActionButtonProps) {
  // @ts-ignore - mapeo dinamico de icono
  const Icon = Icons[action.icon] || Icons.Play;

  return (
    <Button 
      variant={action.severity as any} 
      className={cn("w-full md:w-auto", className)}
      title={action.description}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {showIcon && !isLoading && <Icon className="mr-2 h-5 w-5" />}
      {isLoading && <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {action.label}
    </Button>
  );
}
