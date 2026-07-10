import { useState } from 'react';
import { Save, X } from 'lucide-react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const QrAssignForm = ({
  areas = [],
  generatedQrCodes = [],
  currentUser,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const isSupervisor = currentUser?.role?.code === 'SUPERVISOR';

  const [formData, setFormData] = useState({
    area_id: isSupervisor && currentUser?.area?.id
      ? String(currentUser.area.id)
      : '',
    batch_id: '',
    quantity: 1,
    mode: 'batch',
    selected_qr_ids: [],
  });

  const areaOptions = areas
    .filter((area) => area.is_active)
    .map((area) => ({
      value: String(area.id),
      label: `${area.name} (${area.code})`,
    }));

  const batchOptions = generatedQrCodes
    .filter((qr) => qr.batch?.id)
    .reduce((acc, qr) => {
      const exists = acc.some((item) => item.value === String(qr.batch.id));

      if (!exists) {
        acc.push({
          value: String(qr.batch.id),
          label: `${qr.batch.batch_code}`,
        });
      }

      return acc;
    }, []);

  const availableGeneratedQrCodes = generatedQrCodes.filter(
    (qr) => qr.status === 'GENERADO'
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleQrToggle = (qrId) => {
    setFormData((currentData) => {
      const exists = currentData.selected_qr_ids.includes(qrId);

      return {
        ...currentData,
        selected_qr_ids: exists
          ? currentData.selected_qr_ids.filter((id) => id !== qrId)
          : [...currentData.selected_qr_ids, qrId],
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (formData.mode === 'manual') {
      onSubmit({
        area_id: Number(formData.area_id),
        qr_code_ids: formData.selected_qr_ids,
      });

      return;
    }

    onSubmit({
      area_id: Number(formData.area_id),
      batch_id: Number(formData.batch_id),
      quantity: Number(formData.quantity),
    });
  };

  return (
    <Card
      title="Asignar códigos QR"
      description="Asigna códigos QR generados a un área operativa para que puedan utilizarse."
    >
      <form className="qr-form" onSubmit={handleSubmit}>
        <Alert
          variant="info"
          title="Asignación segura"
          message="Solo se pueden asignar códigos QR en estado GENERADO. Los QR ya disponibles, usados o cancelados no se reasignan desde aquí."
        />

        <div className="qr-mode-switch">
          <Button
            type="button"
            variant={formData.mode === 'batch' ? 'primary' : 'secondary'}
            onClick={() =>
              setFormData((currentData) => ({
                ...currentData,
                mode: 'batch',
              }))
            }
          >
            Por lote
          </Button>

          <Button
            type="button"
            variant={formData.mode === 'manual' ? 'primary' : 'secondary'}
            onClick={() =>
              setFormData((currentData) => ({
                ...currentData,
                mode: 'manual',
              }))
            }
          >
            Selección manual
          </Button>
        </div>

        <div className="form-grid">
          <Select
            label="Área destino"
            name="area_id"
            value={formData.area_id}
            onChange={handleChange}
            options={areaOptions}
            placeholder="Selecciona un área"
            disabled={isSupervisor}
            required
          />

          {formData.mode === 'batch' && (
            <>
              <Select
                label="Lote"
                name="batch_id"
                value={formData.batch_id}
                onChange={handleChange}
                options={batchOptions}
                placeholder="Selecciona un lote"
                required
              />

              <Input
                label="Cantidad a asignar"
                name="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </>
          )}
        </div>

        {formData.mode === 'manual' && (
          <section className="qr-manual-selector">
            <h3>QR disponibles para asignar</h3>

            {!availableGeneratedQrCodes.length ? (
              <p>No hay códigos QR en estado GENERADO para asignación manual.</p>
            ) : (
              <div className="qr-check-grid">
                {availableGeneratedQrCodes.slice(0, 80).map((qr) => (
                  <label className="permission-check" key={qr.id}>
                    <input
                      type="checkbox"
                      checked={formData.selected_qr_ids.includes(qr.id)}
                      onChange={() => handleQrToggle(qr.id)}
                    />

                    <span>
                      <strong>{qr.qr_code}</strong>
                      <small>{qr.status}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>
        )}

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
            disabled={
              !formData.area_id ||
              (formData.mode === 'manual' && formData.selected_qr_ids.length === 0)
            }
          >
            Asignar QR
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default QrAssignForm;