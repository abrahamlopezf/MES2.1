import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  description?: string;
  actor?: string;
  isCompleted: boolean;
  isCurrent?: boolean;
}

interface ProcessTimelineProps {
  events: TimelineEvent[];
}

export function ProcessTimeline({ events }: ProcessTimelineProps) {
  return (
    <div className="flex flex-col gap-0 relative">
      {/* Línea conectora */}
      <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border z-0" />
      
      {events.map((event, idx) => (
        <div key={event.id} className={cn("flex gap-4 relative z-10 py-3", idx === events.length - 1 ? "pb-0" : "", idx === 0 ? "pt-0" : "")}>
          
          <div className="shrink-0 mt-1">
            {event.isCompleted ? (
              <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center border border-success/30">
                <CheckCircle2 size={16} className="text-success" />
              </div>
            ) : event.isCurrent ? (
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30 ring-4 ring-primary/10">
                <Circle size={12} className="text-primary fill-primary" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border">
                <Clock size={14} className="text-muted" />
              </div>
            )}
          </div>

          <div className="flex flex-col pb-2">
            <h4 className={cn("text-sm font-bold", event.isCompleted || event.isCurrent ? "text-foreground" : "text-muted-foreground")}>
              {event.title}
            </h4>
            
            <div className="flex items-center gap-2 mt-0.5">
              {event.timestamp && (
                <span className="text-xs font-mono font-semibold text-muted bg-background px-1.5 py-0.5 rounded border border-border">
                  {event.timestamp}
                </span>
              )}
              {event.actor && (
                <span className="text-xs font-semibold text-muted">
                  por {event.actor}
                </span>
              )}
            </div>

            {event.description && (
              <p className="text-xs text-muted mt-1.5 font-medium leading-relaxed max-w-sm">
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
