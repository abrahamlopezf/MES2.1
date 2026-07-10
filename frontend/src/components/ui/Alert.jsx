import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
};

const Alert = ({
  title,
  message,
  variant = 'info',
  className = '',
}) => {
  const Icon = alertIcons[variant] || Info;

  return (
    <div className={`ui-alert ui-alert-${variant} ${className}`}>
      <Icon size={28} />

      <div>
        {title && <strong>{title}</strong>}
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default Alert;