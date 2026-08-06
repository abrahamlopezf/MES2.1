import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { MapPin, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../../../design-system';
import { Badge } from '../../../../design-system';
import { Input } from '../../../../design-system';
import { Button } from '../../../../design-system';
import { TopBar } from '../../../../design-system';

export const WarehouseInventoryPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['warehouse', 'inventory', search],
    queryFn: async () => {
      const response = await axiosClient.get('/warehouse/inventory', {
        params: { search }
      });
      return response.data.data;
    }
  });

  return (
    <div className="space-y-4 px-4 sm:px-6 md:px-8 py-4 md:py-6 pb-32 sm:pb-12 overflow-x-hidden">
      <TopBar title="Inventario de Almacén" />

      <div className="flex gap-2">
        <Input 
          placeholder="Buscar por QR o Material..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => refetch()} 
          title="Refrescar"
        >
          <RefreshCw className={isRefetching ? "animate-spin" : ""} size={20} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
        {isLoading ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>Cargando inventario...</p>
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-border">
            <p>No se encontraron unidades de stock.</p>
          </div>
        ) : (
          data?.items?.map((item: any) => (
            <Card key={item.id} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-info" />
              <CardContent className="p-4 pl-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{item.material?.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.material?.code}</p>
                  </div>
                  <Badge variant={item.status === 'AVAILABLE' ? 'success' : 'default'}>
                    {item.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-3 rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Cantidad</p>
                    <p className="font-mono font-bold text-lg text-foreground">
                      {Number(item.available_quantity).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{item.unit?.code}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ubicación</p>
                    <div className="flex items-center text-sm font-medium text-foreground">
                      <MapPin size={16} className="text-primary mr-1" />
                      {item.location}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
                  <span className="font-mono bg-muted px-2 py-1 rounded-md">{item.qr_code_value}</span>
                  <span>{new Date(item.received_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
