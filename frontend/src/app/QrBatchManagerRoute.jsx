import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { canManageQrBatches } from '../modules/qrcodes/access/qrBatchAccess';

const QrBatchManagerRoute = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  return canManageQrBatches(user) ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export default QrBatchManagerRoute;
