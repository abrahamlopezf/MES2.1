import { useState } from 'react';
import { QrCode, Save, X } from 'lucide-react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const QrGenerateForm = ({
  areas = [],
  currentUser,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const isSupervisor = currentUser?.role?.code === 'SUPERVISOR';

  const [formData, setFormData] = useState({
    quantity: 10,
    assigned_area_id: isSupervisor && currentUser?.area?.id
      ? String(currentUser.area.id)
      : '',
    notes: '',
  });

  const areaOptions = areas
    .filter((area) => area.is_active)
    .map((area) => ({
      value: String(area.id),
      label: `${area.name} (${area.code})`,
    }));

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      quantity: Number(formData.quantity),
      assigned_area_id: formData.assigned_area_id
        ? Number(formData.assigned_area_id)
        : null,
      notes: formData.notes.trim() || null,
    });
  };

  return (
    <Card
      title="Generar lote de códigos QR"
      description="Crea códigos QR masivos. Puedes dejarlos sin área o asignarlos directamente a un área."
    >
      <form className="qr-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Input
            label="Cantidad de QR"
            name="quantity"
            type="number"
            min="1"
            max="50000"
            icon={QrCode}
            value={formData.quantity}
            onChange={handleChange}
            required
          />

          <Select
            label="Área asignada"
            name="assigned_area_id"
            value={formData.assigned_area_id}
            onChange={handleChange}
            options={areaOptions}
            placeholder="Sin área asignada"
            helperText={
              isSupervisor
                ? 'Como supervisor, el sistema usará tu propia área.'
                : 'Puedes generar QR sin área y asignarlos después.'
            }
            disabled={isSupervisor}
          />

          <label className="ui-field form-grid-full">
            <span className="ui-field-label">Notas</span>
            <textarea
              className="ui-textarea"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Ejemplo: Lote inicial para almacén."
              rows={3}
            />
          </label>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            icon={X}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            icon={Save}
            isLoading={isSubmitting}
          >
            Generar lote
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default QrGenerateForm;