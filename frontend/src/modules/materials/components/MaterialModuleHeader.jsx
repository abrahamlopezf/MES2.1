import { Boxes, Layers3, Plus, RefreshCw } from 'lucide-react';

import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardContent,
} from '../../../components/tf-ui';

const MaterialModuleHeader = ({
  total = 0,
  canCreate,
  onCreateMaterial,
  onCreateCategory,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <TFCard className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,var(--color-primary),#2f855a)] text-white shadow-[0_24px_70px_rgba(31,58,95,0.28)]">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />
      <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-sm" />

      <TFCardContent className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid gap-4">
          <div className="flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-black backdrop-blur-md">
            <Boxes className="size-5" />
            <span>Catálogo maestro</span>
          </div>

          <div className="grid gap-2">
            <h2 className="m-0 text-4xl font-black leading-none tracking-tight sm:text-5xl">
              Materiales
            </h2>

            <p className="m-0 max-w-3xl text-base font-semibold leading-relaxed text-white/88 sm:text-lg">
              Controla materias primas, materiales secundarios y materiales generales
              para evitar capturas libres y errores operativos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TFBadge variant="neutral" className="bg-white/18 text-white">
              {total} materiales visibles
            </TFBadge>

            <TFBadge variant="success" className="bg-white/18 text-white">
              Catálogo controlado
            </TFBadge>

            {isRefreshing && (
              <TFBadge variant="primary" className="bg-white/18 text-white">
                Sincronizando
              </TFBadge>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:min-w-64">
          <TFButton
            variant="secondary"
            fullWidth
            icon={RefreshCw}
            className="border-white/20 bg-white/16 text-white hover:bg-white/22"
            onClick={onRefresh}
            isLoading={isRefreshing}
          >
            Actualizar
          </TFButton>

          {canCreate && (
            <>
              <TFButton
                variant="secondary"
                fullWidth
                icon={Plus}
                className="border-white/20 bg-white/16 text-white hover:bg-white/22"
                onClick={onCreateMaterial}
              >
                Nuevo material
              </TFButton>

              <TFButton
                variant="secondary"
                fullWidth
                icon={Layers3}
                className="border-white/20 bg-white/16 text-white hover:bg-white/22"
                onClick={onCreateCategory}
              >
                Nueva categoría
              </TFButton>
            </>
          )}
        </div>
      </TFCardContent>
    </TFCard>
  );
};

export default MaterialModuleHeader;