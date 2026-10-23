import React from 'react';
import { cn } from '../../utils';

const SIZE_MAP: Record<string, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40
};

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number | string | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fill?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  variant?: 'rounded' | 'outlined';
}

/**
 * Componente Icon estándar para Google Fonts Icons (Material Symbols)
 * https://fonts.google.com/icons
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  className = '',
  fill = false,
  weight = 400,
  variant = 'rounded',
  style,
  ...props
}) => {
  let pixelSize: string;
  let numSize: number;

  if (typeof size === 'number') {
    pixelSize = `${size}px`;
    numSize = size;
  } else if (typeof size === 'string' && size in SIZE_MAP) {
    numSize = SIZE_MAP[size];
    pixelSize = `${numSize}px`;
  } else if (typeof size === 'string' && /^\d+$/.test(size)) {
    numSize = parseInt(size, 10);
    pixelSize = `${numSize}px`;
  } else {
    pixelSize = String(size);
    numSize = 24;
  }

  const clampedOpsz = Math.min(48, Math.max(20, Math.round(numSize)));
  const fontClass = variant === 'rounded' ? 'material-symbols-rounded' : 'material-symbols-outlined';

  return (
    <span
      className={cn(
        fontClass,
        'shrink-0 select-none inline-flex items-center justify-center leading-none text-current',
        className
      )}
      style={{
        fontSize: pixelSize,
        width: pixelSize,
        height: pixelSize,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${clampedOpsz}`,
        ...style
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
};

/**
 * Función auxiliar para renderizar de forma unificada iconos de Google Fonts (strings),
 * elementos React o componentes de icono (como Lucide React)
 */
export const renderAnyIcon = (
  icon: any,
  props: { size?: number | string; className?: string; fill?: boolean } = {}
) => {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return <Icon name={icon} {...props} />;
  }
  if (React.isValidElement(icon)) {
    return icon;
  }
  if (typeof icon === 'function' || typeof icon === 'object') {
    const IconComponent = icon;
    return <IconComponent {...props} />;
  }
  return null;
};

export default Icon;
