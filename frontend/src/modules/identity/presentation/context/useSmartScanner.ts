import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { identityFacade } from '../../infrastructure/di/IdentityModuleDI';
import { toast } from 'sonner';
import { apiClient } from '@core/api/apiClient';

export const useSmartScanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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

      // 1. Try real backend first (so we know if it was used/activated)
      try {
        const response = await apiClient.get(`/qr/lookup/${cleanQrCode}`);
        const responseData = response.data || response;
        const resultData = responseData.data || responseData;
        const qrData = resultData.qr || resultData;
        if (qrData && qrData.status) {
          tokenStatus = qrData.status;
        }
      } catch (backendError) {
        // Ignorar error, caerá en el fallback
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
        switch (user.role) {
          case 'WAREHOUSE_OPERATOR':
          case 'ADMIN':
          case 'SUPERADMIN':
            // Route admins and warehouse operators to the reception screen
            navigate(`/warehouse/receive?qr=${cleanQrCode}`);
            return true;
          case 'MIXING_OPERATOR':
            navigate(`/production/mixing?qr=${cleanQrCode}`);
            return true;
          case 'EXTRUSION_OPERATOR':
            // Racks init usually uses virgin QRs
            navigate(`/production/extrusion/rack/new?qr=${cleanQrCode}`);
            return true;
          default:
            toast.warning("No hay una acción predeterminada para este QR virgen con tu rol actual.");
            return false;
        }
      } else if (tokenStatus === 'ACTIVE') {
        // En uso: Puede ser un lote de material, una mezcla, etc.
        switch (user.role) {
          case 'EXTRUSION_OPERATOR':
            // If they scan an active QR in extrusion, it's likely they are feeding a MixBatch
            navigate(`/production/extrusion?feedQr=${cleanQrCode}`);
            return true;
          default:
            // Just show custody details (Trazabilidad)
            navigate(`/traceability/genealogy?tokenId=${cleanQrCode}`);
            return true;
        }
      } else {
        toast.error(`QR escaneado en estado: ${tokenStatus}`);
        return false;
      }
    } catch (e: any) {
      toast.error(`Error al escanear: ${e.message}`);
      return false;
    }
  };

  return { handleScan };
};
