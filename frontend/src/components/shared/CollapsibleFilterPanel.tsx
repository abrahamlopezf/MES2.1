import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from '@/design-system/components/Icon/googleIconCompat';

interface CollapsibleFilterPanelProps {
  title: string;
  description?: string;
  summary?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: 'card' | 'plain';
}

/** Shared disclosure for search and filter controls. Starts compact on phones. */
export function CollapsibleFilterPanel({
  title,
  description,
  summary,
  actions,
  children,
  className = '',
  contentClassName = '',
  variant = 'card',
}: CollapsibleFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  const contentId = useId();

  return (
    <section className={`${variant === 'card' ? 'min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4' : 'min-w-0'} ${className}`}>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="min-w-0">
            <span className="block text-base font-bold text-foreground sm:text-lg">{title}</span>
            <span className="mt-0.5 block truncate text-sm font-medium text-muted-foreground">
              {isExpanded ? description || summary : summary || description}
            </span>
          </span>
          <span className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-3 text-sm font-bold text-foreground">
            {isExpanded ? 'Ocultar' : 'Mostrar'}
            {isExpanded ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
          </span>
        </button>
        {actions && <div className="flex min-w-0 items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
      <div id={contentId} hidden={!isExpanded} className={`mt-3 border-t border-border pt-3 ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
}

export default CollapsibleFilterPanel;
