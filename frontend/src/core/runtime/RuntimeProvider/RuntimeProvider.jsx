import React, { createContext, useContext, useMemo } from 'react';
import { CapabilityRegistry } from '../../platform/CapabilityRegistry/CapabilityRegistry';
import { EventBus } from '../../platform/EventBus/EventBus';

const RuntimeContext = createContext(null);

/**
 * Runtime Provider
 * Envuelve toda la aplicación y provee acceso al Engine y a la Plataforma.
 */
export const RuntimeProvider = ({ children }) => {
  const value = useMemo(() => ({
    registry: CapabilityRegistry,
    events: EventBus,
  }), []);

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
};

export const useRuntime = () => {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error('useRuntime debe usarse dentro de un RuntimeProvider');
  }
  return context;
};
