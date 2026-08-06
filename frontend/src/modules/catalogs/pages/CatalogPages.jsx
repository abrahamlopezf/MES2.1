import { TFCard, TFCardContent } from "../../../components/tf-ui";
import { Construction } from "lucide-react";

export const StorageLocationsPage = () => {
  return (
    <TFCard>
      <TFCardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Construction className="size-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">En Construcción</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          El catálogo de Localidades se está implementando. 
          Aquí podrás gestionar las ubicaciones físicas de los almacenes.
        </p>
      </TFCardContent>
    </TFCard>
  );
};

export const WarehousesPage = () => {
  return (
    <TFCard>
      <TFCardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Construction className="size-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">En Construcción</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          El catálogo de Almacenes se está implementando.
        </p>
      </TFCardContent>
    </TFCard>
  );
};

export const StorageLocationTypesPage = () => {
  return (
    <TFCard>
      <TFCardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Construction className="size-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">En Construcción</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          El catálogo de Tipos de Localidad se está implementando.
        </p>
      </TFCardContent>
    </TFCard>
  );
};

export const StorageLocationStatusesPage = () => {
  return (
    <TFCard>
      <TFCardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Construction className="size-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">En Construcción</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          El catálogo de Estatus de Localidad se está implementando.
        </p>
      </TFCardContent>
    </TFCard>
  );
};
