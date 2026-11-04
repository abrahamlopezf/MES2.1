import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button.tsx';
import { AllowedAction } from '@/core/qr-workspace/types/qr-workspace.types';
import { cn } from '@/lib/utils';
import { Icon as GoogleIcon } from '@/design-system';
import * as GoogleSymbols from '@/design-system/components/Icon/googleIconCompat';

const ACTION_ICON_MAP: Record<string, string> = {
  Play: 'play_arrow',
  Check: 'check_circle',
  CheckCircle: 'check_circle',
  Truck: 'local_shipping',
  Package: 'inventory_2',
  AlertTriangle: 'warning',
  ArrowRight: 'arrow_forward',
  RefreshCw: 'refresh',
  X: 'close',
  Trash: 'delete',
  Edit: 'edit',
  Eye: 'visibility',
  Plus: 'add',
  QrCode: 'qr_code_2'
};

interface ActionButtonProps extends Omit<ButtonProps, 'children'> {
  action: AllowedAction;
  showIcon?: boolean;
  isLoading?: boolean;
}

export function ActionButton({ action, showIcon = true, isLoading, className, ...props }: ActionButtonProps) {
  const iconName = action.icon ? (ACTION_ICON_MAP[action.icon] || (action.icon.includes('_') ? action.icon : null)) : null;
  // Compatibilidad con acciones que todavía guardan el nombre anterior del icono.
  const GoogleSymbol = (!iconName && action.icon) ? ((GoogleSymbols as any)[action.icon] || GoogleSymbols.Play) : null;

  return (
    <Button 
      variant={action.severity as any} 
      className={cn("w-full md:w-auto", className)}
      title={action.description}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {showIcon && !isLoading && (
        iconName ? (
          <GoogleIcon name={iconName} size={20} className="mr-2" />
        ) : GoogleSymbol ? (
          <GoogleSymbol size={20} className="mr-2" />
        ) : (
          <GoogleIcon name="play_arrow" size={20} className="mr-2" />
        )
      )}
      {isLoading && <GoogleIcon name="progress_activity" size={20} className="mr-2 animate-spin" />}
      {action.label}
    </Button>
  );
}
