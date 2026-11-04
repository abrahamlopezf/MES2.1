import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getUserAreaCode, isAdminUser } from '@/utils/authHelpers';
import { identityFacade } from '../../infrastructure/di/IdentityModuleDI';
import { toast } from 'sonner';
import { apiClient } from '@core/api/apiClient';

export const useSmartScanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const handleScan = async (scannedQr: string): Promise<boolean> => {
    try {
      if (!user) {
        toast.error('No hay usuario activo en la sesión.');
        return false;
      }

      let cleanQrCode = String(scannedQr || '').trim();
      if (!cleanQrCode) return false;

      // Extraer el código si se escaneó una URL completa
      try {
        if (cleanQrCode.includes('http')) {
          const urlObj = new URL(cleanQrCode);
          const extracted =
            urlObj.searchParams.get('tokenId') ||
            urlObj.searchParams.get('qr') ||
            urlObj.searchParams.get('rackQr') ||
            urlObj.searchParams.get('ptiRackQr');
          if (extracted) cleanQrCode = String(extracted).trim();
        }
      } catch {
        // Conservar valor original si no es URL válida
      }

      const areaCode = getUserAreaCode(user);
      const roleCode = String(
        typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')
      ).toUpperCase();
      const globalAdmin = isAdminUser(user);

      // 1. Consulta unificada al backend (reconoce QR Virgen, Lote Almacén, Silo, ODC, Sub-lote WIP, Mezcla, Rack PTI y QR Viajero)
      try {
        const response = await apiClient.get(`/qr/lookup/${encodeURIComponent(cleanQrCode)}`);
        const responseData = response.data || response;
        const resultData = responseData.data || responseData;
        const routing = resultData?.operational_routing;
        const actionsByArea = routing?.actions_by_area || {};
        const canonicalCode = routing?.scanned_code || resultData?.qr?.qr_code || cleanQrCode;

        // Caso A: El usuario pertenece a un área operativa específica
        if (areaCode) {
          let matchedAction = actionsByArea[areaCode];

          // Si el usuario es de Telares/Corte y está en la estación de Corte, priorizar la acción de Corte
          if (!matchedAction && areaCode === 'TELARES' && actionsByArea.CORTE) {
            matchedAction = actionsByArea.CORTE;
          }
          if (areaCode === 'TELARES' && location.pathname.includes('/production/corte') && actionsByArea.CORTE) {
            matchedAction = actionsByArea.CORTE;
          }

          if (matchedAction?.route) {
            // Validar restricción de recepción de QR virgen en Almacén (exclusivo ADMIN_ALM / Admin General)
            const isWarehouseOperatorOnly = ['WAREHOUSE_OPERATOR', 'WAREHOUSEMAN'].includes(roleCode);
            if (matchedAction.requires_admin_alm && isWarehouseOperatorOnly) {
              toast.info('Mostrando Árbol de Trazabilidad (el registro de ingreso en almacén requiere rol ADMIN_ALM).');
              navigate(`/traceability/genealogy?tokenId=${encodeURIComponent(canonicalCode)}`);
              return true;
            }

            toast.success(`${routing?.entity_title || canonicalCode}: redirigiendo a la acción de tu área.`);
            navigate(matchedAction.route);
            return true;
          }

          // Si el usuario NO es del área operativa del QR (o no hay acción pendiente para su área),
          // mostrar siempre el Árbol de Trazabilidad completo desde el ingreso en Almacén.
          toast.info(`Mostrando Árbol de Trazabilidad de ${routing?.entity_title || canonicalCode}.`);
          navigate(`/traceability/genealogy?tokenId=${encodeURIComponent(canonicalCode)}`);
          return true;
        }

        // Caso B: Administrador General / Superadmin (sin área única fija)
        if (globalAdmin) {
          const path = location.pathname;
          const contextualArea =
            path.includes('/production/extrusion') || path.startsWith('/extrusion')
              ? 'EXTRUSION'
              : path.includes('/production/telares') || path.startsWith('/telares')
              ? 'TELARES'
              : path.includes('/production/laminado') || path.startsWith('/laminado')
              ? 'LAMINADO'
              : path.includes('/production/corte')
              ? 'CORTE'
              : path.includes('/production/globo') || path.startsWith('/globo')
              ? 'GLOBO'
              : path.startsWith('/warehouse')
              ? 'ALMACEN'
              : '';

          if (contextualArea && actionsByArea[contextualArea]?.route) {
            navigate(actionsByArea[contextualArea].route);
            return true;
          }

          if (routing?.qr_kind === 'VIRGIN_QR' && actionsByArea.ALMACEN?.route) {
            navigate(actionsByArea.ALMACEN.route);
            return true;
          }

          if (routing?.qr_kind === 'CONSUMPTION_ORDER' && actionsByArea.ALMACEN?.route) {
            navigate(actionsByArea.ALMACEN.route);
            return true;
          }

          // En cualquier otra vista general, abrir el Árbol de Trazabilidad completo (que incluye botones a las acciones de cada área)
          navigate(`/traceability/genealogy?tokenId=${encodeURIComponent(canonicalCode)}`);
          return true;
        }

        // Cualquier otro rol sin área asignada va al Árbol de Trazabilidad completo
        navigate(`/traceability/genealogy?tokenId=${encodeURIComponent(canonicalCode)}`);
        return true;
      } catch (backendError: any) {
        if (backendError?.response?.status && backendError.response.status !== 404) {
          toast.error(backendError?.response?.data?.message || 'Error al consultar el código QR.');
          return false;
        }
      }

      // 2. Fallback para QRs vírgenes recién generados en memoria (Identity mock)
      const mockToken = await identityFacade.getTokenById(cleanQrCode);
      if (mockToken) {
        const isVirginStatus = ['GENERATED', 'AVAILABLE', 'UNASSIGNED'].includes(String(mockToken.status || '').toUpperCase());
        if (isVirginStatus && (['ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode) || globalAdmin)) {
          navigate(`/warehouse/receive?qr=${encodeURIComponent(cleanQrCode)}`);
          return true;
        }
        if (isVirginStatus && areaCode === 'EXTRUSION') {
          navigate(`/production/mixing?qr=${encodeURIComponent(cleanQrCode)}`);
          return true;
        }
        navigate(`/traceability/genealogy?tokenId=${encodeURIComponent(cleanQrCode)}`);
        return true;
      }

      toast.error('QR no reconocido por el sistema.');
      return false;
    } catch (e: any) {
      toast.error(`Error al escanear: ${e.message}`);
      return false;
    }
  };

  return { handleScan };
};
