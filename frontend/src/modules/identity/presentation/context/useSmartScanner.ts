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
        toast.error("No hay usuario activo en la sesión.");
        return false;
      }

      let tokenStatus = null;
      let cleanQrCode = scannedQr;
      
      // Clean query string if it was scanned from URL
      try {
        if (cleanQrCode.includes('http')) {
          const urlObj = new URL(cleanQrCode);
          const tokenId = urlObj.searchParams.get('tokenId');
          if (tokenId) cleanQrCode = String(tokenId).trim();
        }
      } catch(e) {}

      let realQrCodeValue = cleanQrCode;

      // A fixed PTI rack QR has two valid actions: register extrusion output or
      // request a custody transfer into a specific loom's WIP. Resolve it before
      // the generic traceability flow so the operator lands in the right form.
      const areaCode = getUserAreaCode(user);
      if (['EXTRUSION', 'TELARES'].includes(areaCode) || isAdminUser(user)) {
        try {
          const rackLookupCode = cleanQrCode.trim().toUpperCase();
          const rackResponse = await apiClient.get(`/telares/pti-racks/lookup/${encodeURIComponent(rackLookupCode)}`);
          const rack = rackResponse.data?.data || rackResponse.data;
          if (rack?.id && [rack.qr_code, rack.rack_code].some((value: string) => String(value || '').toUpperCase() === rackLookupCode)) {
            if (areaCode === 'TELARES' && Number(rack.current_quantity) <= 0) {
              toast.error('Este rack está vacío; Telares solo puede solicitar PTI con bobinas disponibles.');
              return false;
            }
            const effectiveArea = areaCode || (
              location.pathname.includes('/production/extrusion') ? 'EXTRUSION' :
              location.pathname.includes('/production/telares') ? 'TELARES' : ''
            );
            const encodedQr = encodeURIComponent(rack.qr_code || rack.rack_code);
            if (effectiveArea === 'EXTRUSION') {
              navigate(`/production/extrusion?rackQr=${encodedQr}`);
              return true;
            }
            if (effectiveArea === 'TELARES') {
              navigate(`/production/telares?ptiRackQr=${encodedQr}`);
              return true;
            }
            toast.warning('Rack identificado. Abre el terminal de Extrusión o Telares para continuar con la operación correspondiente.');
            return false;
          }
        } catch (lookupError: any) {
          if (lookupError?.response?.status !== 404) {
            toast.error(lookupError?.response?.data?.message || 'No se pudo validar el QR del rack. Revisa la conexión e inténtalo de nuevo.');
            return false;
          }
        }
      }

      // 1. Try real backend first (so we know if it was used/activated)
      try {
        const response = await apiClient.get(`/qr/lookup/${encodeURIComponent(cleanQrCode)}`);
        const responseData = response.data || response;
        const resultData = responseData.data || responseData;
        const qrData = resultData.qr || resultData;
        if (qrData && qrData.status) {
          tokenStatus = qrData.status;
          if (qrData.qr_code) {
            realQrCodeValue = qrData.qr_code;
          }
        }
      } catch (backendError) {
        // Ignorar error, caerá en el fallback
      }

      // 1.5 Intercept Consumption Order QRs (Now using the potentially decrypted value from DB)
      if (realQrCodeValue.startsWith('ORD-')) {
        const orderUuid = realQrCodeValue.replace('ORD-', '');
        navigate(`/warehouse/orders?order_id=${orderUuid}`);
        return true;
      }

      // 2. Fallback to Identity in-memory mock (for freshly generated virgin QRs not yet in DB)
      if (!tokenStatus) {
        const mockToken = await identityFacade.getTokenById(cleanQrCode);
        if (mockToken) {
          tokenStatus = mockToken.status;
        }
      }

      if (!tokenStatus) {
        toast.error("QR no reconocido por el sistema.");
        return false;
      }

      // Routing logic based on Token Status & User Role
      if (tokenStatus === 'GENERATED' || tokenStatus === 'AVAILABLE' || tokenStatus === 'UNASSIGNED') {
        // Virgin QR logic
        const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || ''))?.toUpperCase();
        switch (roleCode) {
          case 'ADMIN_ALM':
          case 'ADMIN':
          case 'ADMIN_GENERAL':
          case 'ADMIN_GRAL':
          case 'SUPERADMIN':
            // Route warehouse admins to the reception screen
            navigate(`/warehouse/receive?qr=${cleanQrCode}`);
            return true;
          case 'WAREHOUSE_OPERATOR':
          case 'WAREHOUSEMAN':
            toast.warning("El registro de ingresos en almacén solo puede ser realizado por el Administrador de Almacén (ADMIN_ALM).");
            return false;
          case 'MIXING_OPERATOR':
            navigate(`/production/mixing?qr=${cleanQrCode}`);
            return true;
          case 'EXTRUSION_OPERATOR':
            toast.warning("El módulo de extrusión está restringido temporalmente a Superadmin.");
            return false;
          default:
            toast.warning("No hay una acción predeterminada para este QR virgen con tu rol actual.");
            return false;
        }
      } else {
        // En uso o consumido: Puede ser un lote de material, una mezcla, etc.
        // Para cualquier estatus en uso (ACTIVE, CONSUMED, IN_WIP, etc.) abrimos trazabilidad
        navigate(`/traceability/genealogy?tokenId=${cleanQrCode}`);
        return true;
      }
    } catch (e: any) {
      toast.error(`Error al escanear: ${e.message}`);
      return false;
    }
  };

  return { handleScan };
};
