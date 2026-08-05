import { ShieldAlert, Plus } from 'lucide-react';
import { TFButton, TFCard } from '../../../components/tf-ui';

const SubcatalogActionButtons = ({
  canManageCatalogs,
  onNewFamily,
  onNewCode,
  onNewType,
  onNewBrand
}) => {
  if (!canManageCatalogs) return null;

  return (
    <TFCard className="px-4 py-2.5 rounded-lg border border-border bg-card text-card-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm mb-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-indigo-500" />
        <span className="text-sm font-bold text-foreground">Subcatálogos:</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <TFButton 
          variant="outline" 
          size="sm" 
          icon={Plus} 
          onClick={onNewFamily}
        >
          Familia
        </TFButton>
        <TFButton 
          variant="outline" 
          size="sm" 
          icon={Plus} 
          onClick={onNewCode}
        >
          Artículo
        </TFButton>
        <TFButton 
          variant="outline" 
          size="sm" 
          icon={Plus} 
          onClick={onNewType}
        >
          Tipo
        </TFButton>
        <TFButton 
          variant="outline" 
          size="sm" 
          icon={Plus} 
          onClick={onNewBrand}
        >
          Marca
        </TFButton>
      </div>
    </TFCard>
  );
};

export default SubcatalogActionButtons;
