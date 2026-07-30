import React from 'react';
import { Card, CardContent } from '../Card/Card';
import { Badge } from '../Badge/Badge';
import { QrCode, Factory } from 'lucide-react';
import { cn } from '../../utils';

interface QRCardProps {
  qrCode: string;
  status: string;
  areaCode?: string;
  description?: string;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

export function QRCard({ qrCode, status, areaCode, description, isActive = true, className, onClick }: QRCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]",
        !isActive && "opacity-60 grayscale",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
      <CardContent className="p-4 pl-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-mono font-bold text-lg text-foreground">{qrCode}</h4>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
              {areaCode && (
                <span className="flex items-center">
                  <Factory className="h-3 w-3 mr-1" />
                  {areaCode}
                </span>
              )}
              {description && (
                <span className="truncate max-w-[150px]">{description}</span>
              )}
            </div>
          </div>
        </div>
        
        <Badge variant={status === 'EN_USO' ? 'success' : status === 'CANCELADO' ? 'destructive' : 'default'} className="ml-4">
          {status.replace('_', ' ')}
        </Badge>
      </CardContent>
    </Card>
  );
}
