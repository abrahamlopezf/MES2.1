import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { identityFacade } from '../../infrastructure/di/IdentityModuleDI';

export const useSmartScanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleScan = async (scannedQr: string) => {
    try {
      if (!user) throw new Error("No hay usuario activo en la sesión.");

      // Check token status
      const token = await identityFacade.getTokenById(scannedQr);
      if (!token) throw new Error("QR no reconocido por el sistema.");

      // Routing logic based on Token Status & User Role
      if (token.status === 'GENERATED' || token.status === 'AVAILABLE') {
        // Virgin QR logic
        switch (user.role) {
          case 'WAREHOUSE_OPERATOR':
            navigate(`/warehouse/entry/new?qr=${scannedQr}`);
            break;
          case 'MIXING_OPERATOR':
            navigate(`/production/mixing?qr=${scannedQr}`);
            break;
          case 'EXTRUSION_OPERATOR':
            // Racks init usually uses virgin QRs
            navigate(`/production/extrusion/rack/new?qr=${scannedQr}`);
            break;
          default:
            alert("No hay una acción predeterminada para este QR virgen con tu rol actual.");
        }
      } else if (token.status === 'ACTIVE') {
        // En uso: Puede ser un lote de material, una mezcla, etc.
        switch (user.role) {
          case 'EXTRUSION_OPERATOR':
            // If they scan an active QR in extrusion, it's likely they are feeding a MixBatch
            navigate(`/production/extrusion?feedQr=${scannedQr}`);
            break;
          default:
            // Just show custody details (Trazabilidad)
            navigate(`/identity/custody/${scannedQr}`);
        }
      } else {
        alert(`QR escaneado en estado: ${token.status}`);
      }
    } catch (e: any) {
      alert(`Error al escanear: ${e.message}`);
    }
  };

  return { handleScan };
};
