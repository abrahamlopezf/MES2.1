import { useState } from 'react';
import { ScanLine } from 'lucide-react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';

const QrValidatePanel = ({
  areas = [],
  currentUser,
  isSubmitting = false,
  result,
  error,
  onSubmit,
}) => {
  const isAreaUser = ['SUPERVISOR', 'EMPLOYEE'].includes(currentUser?.role?.code);

  const [formData, setFormData] = useState({
    qr_code: '',
    area_id: isAreaUser && currentUser?.area?.id
      ? String(currentUser.area.id)
      : '',
    require_available: true,
  });

  const areaOptions = areas
    .filter((area) => area.is_active)
    .map((area) => ({
      value: String(area.id),
      label: `${area.name} (${area.code})`,
    }));

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      qr_code: formData.qr_code.trim(),
      area_id: formData.area_id ? Number(formData.area_id) : null,
      require_available: Boolean(formData.require_available),
    });
  };

  return (
    <Card
      title="Validar código QR"
      description="Simula el escaneo de un QR para confirmar que existe, pertenece al área correcta y está disponible."
    >
      <form className="qr-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Input
            label="Código QR"
            name="qr_code"
            icon={ScanLine}
            value={formData.qr_code}
            onChange={handleChange}
            placeholder="Escanea o pega el código QR"
            required
          />

          <Select
            label="Área de operación"
            name="area_id"
            value={formData.area_id}
            onChange={handleChange}
            options={areaOptions}
            placeholder="Validar sin área específica"
            disabled={isAreaUser}
          />

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="require_available"
              checked={formData.require_available}
              onChange={handleChange}
            />
            <span>Requerir estado DISPONIBLE</span>
          </label>
        </div>

        <div className="form-actions">
          <Button
            type="submit"
            icon={ScanLine}
            isLoading={isSubmitting}
          >
            Validar QR
          </Button>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: '24px' }}>
          <Alert
            variant="danger"
            title="QR no válido"
            message={error}
          />
        </div>
      )}

      {result && (
        <div className="qr-validation-result">
          <Alert
            variant="success"
            title="QR válido"
            message="El código QR pasó las validaciones configuradas."
          />

          <div className="qr-result-grid">
            <div>
              <span>Código</span>
              <strong>{result.qr?.qr_code}</strong>
            </div>

            <div>
              <span>Estado</span>
              <Badge variant="success">{result.qr?.status}</Badge>
            </div>

            <div>
              <span>Área actual</span>
              <strong>{result.qr?.current_area?.name || 'Sin área'}</strong>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default QrValidatePanel;