import { useMemo, useState } from 'react';
import { Activity, CheckCircle, Clock, RefreshCw } from 'lucide-react';

import { TFAlert, TFButton } from '../../../components/tf-ui';

import ErrorState from '../../../components/feedback/ErrorState';
import LoadingState from '../../../components/feedback/LoadingState';

import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAuthStore } from '../../../store/authStore';

import QrActionSheet from '../components/QrActionSheet';
import QrAssignForm from '../components/QrAssignForm';
import QrCancelDialog from '../components/QrCancelDialog';
import QrCodesTable from '../components/QrCodesTable';
import QrEventsPanel from '../components/QrEventsPanel';
import QrFiltersPanel from '../components/QrFiltersPanel';
import QrGenerateForm from '../components/QrGenerateForm';
import QrListSection from '../components/QrListSection';
import QrModuleHeader from '../components/QrModuleHeader';
import QrSummaryCard from '../components/QrSummaryCard';
import QrValidatePanel from '../components/QrValidatePanel';

import {
  useAreasQuery,
  useAssignQrCodesMutation,
  useCancelQrMutation,
  useGenerateQrBatchMutation,
  useQrCodesQuery,
  useQrEventsQuery,
  useValidateQrMutation,
} from '../hooks/useQrQueries';

const getApiErrorMessage = (error) => {
  const baseMessage =
    error?.friendlyMessage ||
    error?.response?.data?.message ||
    error?.message ||
    'Ocurrió un problema al procesar la solicitud.';

  const validationErrors = error?.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const details = validationErrors
      .map((item) => item.message || item.field)
      .filter(Boolean)
      .join(' ');

    return `${baseMessage} ${details}`;
  }

  return baseMessage;
};

const QrCodesPage = () => {
  const { user: currentUser, hasPermission } = useAuthStore();

  const canGenerate = hasPermission('qr.generate');
  const canAssign = hasPermission('qr.assign');
  const canCancel = hasPermission('qr.cancel');
  const canReadEvents = hasPermission('qr.events.read');

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isValidateOpen, setIsValidateOpen] = useState(false);

  const [selectedQrForEvents, setSelectedQrForEvents] = useState(null);
  const [selectedQrToCancel, setSelectedQrToCancel] = useState(null);

  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const [operationError, setOperationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    area_id: '',
  });

  const debouncedFilters = useDebouncedValue(filters, 300);

  const qrCodesQuery = useQrCodesQuery(debouncedFilters);
  const areasQuery = useAreasQuery();

  const generateQrBatchMutation = useGenerateQrBatchMutation();
  const assignQrCodesMutation = useAssignQrCodesMutation();
  const validateQrMutation = useValidateQrMutation();
  const cancelQrMutation = useCancelQrMutation();

  const qrEventsQuery = useQrEventsQuery(selectedQrForEvents?.id);

  const qrCodes = qrCodesQuery.data?.items || [];
  const total = qrCodesQuery.data?.total || 0;
  const areas = areasQuery.data || [];

  const isInitialLoading =
    (qrCodesQuery.isLoading || areasQuery.isLoading) &&
    !qrCodesQuery.data &&
    !areasQuery.data;

  const loadError = qrCodesQuery.error || areasQuery.error;

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.area_id
  );

  const generatedQrCodes = useMemo(() => {
    return qrCodes.filter((qr) => qr.status === 'GENERADO');
  }, [qrCodes]);

  const availableCount = useMemo(() => {
    return qrCodes.filter((qr) => qr.status === 'DISPONIBLE').length;
  }, [qrCodes]);

  const inUseCount = useMemo(() => {
    return qrCodes.filter((qr) => qr.status === 'EN_USO').length;
  }, [qrCodes]);

  const generatedCount = useMemo(() => {
    return qrCodes.filter((qr) => qr.status === 'GENERADO').length;
  }, [qrCodes]);

  const isRefreshing =
    qrCodesQuery.isFetching && !qrCodesQuery.isLoading;

  const updateFilter = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      area_id: '',
    });
  };

  const closeForms = () => {
    setIsGenerateOpen(false);
    setIsAssignOpen(false);
    setIsValidateOpen(false);
    setValidationResult(null);
    setValidationError(null);
  };

  const openGenerateForm = () => {
    closeForms();
    setOperationError(null);
    setSuccessMessage(null);
    setIsGenerateOpen(true);
  };

  const openAssignForm = () => {
    closeForms();
    setOperationError(null);
    setSuccessMessage(null);
    setIsAssignOpen(true);
  };

  const openValidatePanel = () => {
    closeForms();
    setOperationError(null);
    setSuccessMessage(null);
    setIsValidateOpen(true);
  };

  const handleRefresh = () => {
    qrCodesQuery.refetch();
    areasQuery.refetch();
  };

  const handleGenerateBatch = async (payload) => {
    setOperationError(null);
    setSuccessMessage(null);

    try {
      const response = await generateQrBatchMutation.mutateAsync(payload);

      setSuccessMessage(
        `Lote generado correctamente. Cantidad: ${response.data.generated_quantity}. Estado inicial: ${response.data.initial_status}.`
      );

      setIsGenerateOpen(false);
    } catch (requestError) {
      setOperationError(getApiErrorMessage(requestError));
    }
  };

  const handleAssignQrCodes = async (payload) => {
    setOperationError(null);
    setSuccessMessage(null);

    try {
      const response = await assignQrCodesMutation.mutateAsync(payload);

      setSuccessMessage(
        `Asignación correcta. Se asignaron ${response.data.assigned_quantity} códigos QR al área ${response.data.area?.name}.`
      );

      setIsAssignOpen(false);
    } catch (requestError) {
      setOperationError(getApiErrorMessage(requestError));
    }
  };

  const handleValidateQr = async (payload) => {
    setValidationResult(null);
    setValidationError(null);
    setOperationError(null);

    try {
      const response = await validateQrMutation.mutateAsync(payload);

      setValidationResult(response.data);
    } catch (requestError) {
      setValidationError(getApiErrorMessage(requestError));
    }
  };

  const handleViewEvents = (qr) => {
    setSelectedQrForEvents(qr);
    setOperationError(null);
  };

  const handleCancelQr = async (payload) => {
    if (!selectedQrToCancel) return;

    setOperationError(null);
    setSuccessMessage(null);

    try {
      await cancelQrMutation.mutateAsync({
        qrId: selectedQrToCancel.id,
        payload,
      });

      setSuccessMessage('Código QR cancelado correctamente.');
      setSelectedQrToCancel(null);
    } catch (requestError) {
      setOperationError(getApiErrorMessage(requestError));
    }
  };

  if (isInitialLoading) {
    return (
      <LoadingState
        title="Cargando códigos QR"
        message="Estamos consultando los códigos QR y áreas disponibles."
      />
    );
  }

  if (loadError && !qrCodes.length) {
    return (
      <ErrorState
        title="No pudimos cargar códigos QR"
        message={getApiErrorMessage(loadError)}
        action={
          <TFButton icon={RefreshCw} onClick={handleRefresh}>
            Intentar nuevamente
          </TFButton>
        }
      />
    );
  }

  return (
    <section className="qr-page-shell">
      {successMessage && (
        <TFAlert
          variant="success"
          title="Operación correcta"
          message={successMessage}
        />
      )}

      {operationError && (
        <TFAlert
          variant="danger"
          title="Revisa la operación"
          message={operationError}
        />
      )}

      {loadError && qrCodes.length > 0 && (
        <TFAlert
          variant="warning"
          title="Información parcialmente actualizada"
          message={getApiErrorMessage(loadError)}
        />
      )}

      <QrModuleHeader
        total={total || qrCodes.length}
        canGenerate={canGenerate}
        canAssign={canAssign}
        onGenerate={openGenerateForm}
        onAssign={openAssignForm}
        onValidate={openValidatePanel}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <QrSummaryCard
          title="Disponibles"
          value={availableCount}
          description="Listos para operación"
          icon={CheckCircle}
          tone="success"
        />

        <QrSummaryCard
          title="En uso"
          value={inUseCount}
          description="Vinculados a operación"
          icon={Activity}
          tone="primary"
        />

        <QrSummaryCard
          title="Generados"
          value={generatedCount}
          description="Pendientes de asignación"
          icon={Clock}
          tone="warning"
        />
      </div>

      <QrFiltersPanel
        searchTerm={filters.search}
        statusFilter={filters.status}
        areaFilter={filters.area_id}
        areas={areas}
        onSearchChange={(value) => updateFilter('search', value)}
        onStatusChange={(value) => updateFilter('status', value)}
        onAreaChange={(value) => updateFilter('area_id', value)}
        onClearFilters={clearFilters}
      />

      {hasActiveFilters && (
        <TFAlert
          variant="info"
          title="Filtros activos"
          message={`Mostrando ${qrCodes.length} de ${total} códigos QR según los filtros seleccionados.`}
        />
      )}

      {isRefreshing && (
        <TFAlert
          variant="info"
          title="Actualizando información"
          message="Estamos sincronizando los códigos QR con el servidor."
        />
      )}

      <QrListSection
        qrs={qrCodes}
        onViewEvents={handleViewEvents}
        onCancel={setSelectedQrToCancel}
        canReadEvents={canReadEvents}
        canCancel={canCancel}
        canGenerate={canGenerate}
        onGenerate={openGenerateForm}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      >
        <QrCodesTable
          qrCodes={qrCodes}
          canCancel={canCancel}
          canReadEvents={canReadEvents}
          onViewEvents={handleViewEvents}
          onCancel={setSelectedQrToCancel}
        />
      </QrListSection>

      <QrActionSheet
        open={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generar lote de códigos QR"
        description="Crea códigos QR en bloque y asígnalos a un área si corresponde."
      >
        <QrGenerateForm
          areas={areas}
          currentUser={currentUser}
          isSubmitting={generateQrBatchMutation.isPending}
          onSubmit={handleGenerateBatch}
          onCancel={() => setIsGenerateOpen(false)}
        />
      </QrActionSheet>

      <QrActionSheet
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Asignar códigos QR"
        description="Asigna códigos QR generados a un área operativa para que puedan usarse."
      >
        <QrAssignForm
          areas={areas}
          generatedQrCodes={generatedQrCodes}
          currentUser={currentUser}
          isSubmitting={assignQrCodesMutation.isPending}
          onSubmit={handleAssignQrCodes}
          onCancel={() => setIsAssignOpen(false)}
        />
      </QrActionSheet>

      <QrActionSheet
        open={isValidateOpen}
        onClose={closeForms}
        title="Validar código QR"
        description="Escanea o escribe un código QR para validar su disponibilidad y área operativa."
      >
        <QrValidatePanel
          areas={areas}
          currentUser={currentUser}
          isSubmitting={validateQrMutation.isPending}
          result={validationResult}
          error={validationError}
          onSubmit={handleValidateQr}
        />
      </QrActionSheet>

      <QrActionSheet
        open={Boolean(selectedQrForEvents)}
        onClose={() => {
          setSelectedQrForEvents(null);
        }}
        title="Eventos del código QR"
        description={
          selectedQrForEvents
            ? `Historial operativo de ${selectedQrForEvents.qr_code || selectedQrForEvents.code
            }`
            : 'Historial operativo del código QR.'
        }
      >
        {selectedQrForEvents && (
          <QrEventsPanel
            qr={selectedQrForEvents}
            events={qrEventsQuery.data || []}
            isLoading={qrEventsQuery.isLoading || qrEventsQuery.isFetching}
            onClose={() => setSelectedQrForEvents(null)}
          />
        )}
      </QrActionSheet>

      <QrCancelDialog
        open={Boolean(selectedQrToCancel)}
        qr={selectedQrToCancel}
        isLoading={cancelQrMutation.isPending}
        onConfirm={handleCancelQr}
        onClose={() => setSelectedQrToCancel(null)}
      />
    </section>
  );
};

export default QrCodesPage;