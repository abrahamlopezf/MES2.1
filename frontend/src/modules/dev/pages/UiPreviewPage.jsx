import { AlertTriangle, CheckCircle, Plus, QrCode, Save, Search } from 'lucide-react';

import {
  TFAlert,
  TFBadge,
  TFButton,
  TFCard,
  TFCardActions,
  TFCardContent,
  TFCardHeader,
  TFCardTitleGroup,
  TFDialog,
  TFDialogContent,
  TFDialogDescription,
  TFDialogFooter,
  TFDialogHeader,
  TFDialogTitle,
  TFDialogTrigger,
  TFInput,
  TFSelect,
  TFSheet,
  TFSheetContent,
  TFSheetDescription,
  TFSheetFooter,
  TFSheetHeader,
  TFSheetTitle,
  TFSheetTrigger,
  TFTextarea,
} from '../../../components/tf-ui';

const UiPreviewPage = () => {
  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <TFCard>
        <TFCardHeader>
          <TFCardTitleGroup
            eyebrow="TraceFlow UI"
            title="Sistema visual moderno"
            description="Componentes base con Tailwind, Radix y estilo personalizado para operación móvil."
          />

          <TFCardActions>
            <TFButton variant="secondary" icon={Search}>
              Buscar
            </TFButton>

            <TFButton icon={Plus}>
              Nuevo registro
            </TFButton>
          </TFCardActions>
        </TFCardHeader>

        <TFCardContent className="grid gap-6">
          <div className="flex flex-wrap gap-3">
            <TFBadge variant="primary">QR</TFBadge>
            <TFBadge variant="success">Activo</TFBadge>
            <TFBadge variant="warning">Pendiente</TFBadge>
            <TFBadge variant="danger">Bloqueado</TFBadge>
            <TFBadge variant="neutral">Neutral</TFBadge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TFAlert
              variant="info"
              title="Mensaje informativo"
              message="Este es el estilo base para mensajes claros y legibles."
            />

            <TFAlert
              variant="success"
              title="Operación correcta"
              message="La acción se realizó correctamente."
            />

            <TFAlert
              variant="warning"
              title="Revisa los datos"
              message="Hay información que debe confirmarse antes de continuar."
            />

            <TFAlert
              variant="danger"
              title="Acción bloqueada"
              message="No tienes permisos para realizar esta acción."
            />
          </div>
        </TFCardContent>
      </TFCard>

      <TFCard>
        <TFCardHeader>
          <TFCardTitleGroup
            eyebrow="Formulario"
            title="Campos accesibles"
            description="Inputs grandes, legibles y cómodos para pantallas táctiles."
          />
        </TFCardHeader>

        <TFCardContent>
          <form className="grid gap-5 md:grid-cols-2">
            <TFInput
              label="Código QR"
              name="qr_code"
              icon={QrCode}
              placeholder="Escanea o escribe el código"
            />

            <TFSelect
              label="Estado"
              name="status"
              placeholder="Selecciona estado"
              options={[
                { value: 'GENERADO', label: 'Generado' },
                { value: 'DISPONIBLE', label: 'Disponible' },
                { value: 'EN_USO', label: 'En uso' },
              ]}
            />

            <TFTextarea
              label="Descripción"
              name="description"
              containerClassName="md:col-span-2"
              placeholder="Observaciones del registro"
            />

            <div className="grid gap-3 md:col-span-2 md:flex md:justify-end">
              <TFButton variant="secondary" fullWidth className="md:w-auto">
                Cancelar
              </TFButton>

              <TFButton icon={Save} fullWidth className="md:w-auto">
                Guardar
              </TFButton>
            </div>
          </form>
        </TFCardContent>
      </TFCard>

      <TFCard>
        <TFCardHeader>
          <TFCardTitleGroup
            eyebrow="Capas interactivas"
            title="Dialog y Sheet"
            description="Componentes accesibles para confirmaciones y acciones móviles."
          />
        </TFCardHeader>

        <TFCardContent className="flex flex-col gap-3 sm:flex-row">
          <TFDialog>
            <TFDialogTrigger asChild>
              <TFButton variant="danger" icon={AlertTriangle}>
                Abrir diálogo
              </TFButton>
            </TFDialogTrigger>

            <TFDialogContent>
              <TFDialogHeader>
                <TFDialogTitle>Confirmar acción</TFDialogTitle>
                <TFDialogDescription>
                  Esta acción debe confirmarse antes de continuar. El diseño está optimizado para lectura clara.
                </TFDialogDescription>
              </TFDialogHeader>

              <TFDialogFooter>
                <TFButton variant="secondary">
                  Cancelar
                </TFButton>

                <TFButton variant="danger" icon={CheckCircle}>
                  Confirmar
                </TFButton>
              </TFDialogFooter>
            </TFDialogContent>
          </TFDialog>

          <TFSheet>
            <TFSheetTrigger asChild>
              <TFButton variant="primary">
                Abrir panel móvil
              </TFButton>
            </TFSheetTrigger>

            <TFSheetContent side="bottom">
              <TFSheetHeader>
                <TFSheetTitle>Acciones rápidas</TFSheetTitle>
                <TFSheetDescription>
                  Este panel es ideal para celulares. Puede usarse para filtros, acciones o formularios cortos.
                </TFSheetDescription>
              </TFSheetHeader>

              <div className="mt-6 grid gap-3">
                <TFButton icon={QrCode}>
                  Validar QR
                </TFButton>

                <TFButton variant="secondary">
                  Consultar historial
                </TFButton>
              </div>

              <TFSheetFooter>
                <TFButton variant="secondary">
                  Cerrar
                </TFButton>
              </TFSheetFooter>
            </TFSheetContent>
          </TFSheet>
        </TFCardContent>
      </TFCard>
    </section>
  );
};

export default UiPreviewPage;