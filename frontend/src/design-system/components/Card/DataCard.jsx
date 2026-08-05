import React, { forwardRef } from 'react';
import { PrimitiveCard } from './PrimitiveCard';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';
import { tokens } from '../../foundation/tokens';
import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';

/**
 * DataCard
 * Tarjeta base para representar entidades industriales.
 * Renderiza atributos llave-valor (Ej: Material: PP-001)
 */
export const DataCard = forwardRef(({
  title,
  subtitle,
  data = {}, // { Material: 'PP-001', Cantidad: '1,000 kg' }
  headerRight,
  ...props
}, ref) => {

  const handleInteractiveClick = (e) => {
    if (props.variant === 'interactive') {
       // Opcional emitir métrica si es necesario
    }
    if (props.onClick) props.onClick(e);
  };

  return (
    <PrimitiveCard ref={ref} {...props} onClick={handleInteractiveClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.primitive.spacing['16'] }}>
        <div>
          {title && <h3 style={{ margin: 0, fontSize: tokens.primitive.typography.sizes.lg, fontWeight: 700, color: tokens.semantic.color.textHighEmphasis }}>{title}</h3>}
          {subtitle && <p style={{ margin: 0, marginTop: tokens.primitive.spacing['4'], fontSize: tokens.primitive.typography.sizes.sm, color: tokens.semantic.color.textMediumEmphasis }}>{subtitle}</p>}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.primitive.spacing['8'] }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: tokens.primitive.typography.sizes.sm }}>
            <span style={{ color: tokens.semantic.color.textMediumEmphasis }}>{key}</span>
            <span style={{ fontWeight: 500, color: tokens.semantic.color.textHighEmphasis }}>{value}</span>
          </div>
        ))}
      </div>
    </PrimitiveCard>
  );
});

DataCard.displayName = 'DataCard';

DataCard.metadata = createComponentMetadata({
  component: "DataCard",
});
