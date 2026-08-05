/**
 * Crea la estructura estandarizada de metadatos para un componente.
 * Permite descubrir capacidades y validar componentes en el futuro.
 */
export const createComponentMetadata = ({
  component,
  category = "Core",
  accessibility = "AA",
  touchTarget = 56,
  supportsKeyboard = true,
  supportsScanner = false
}) => {
  return {
    component,
    version: "1.0.0",
    designSystemVersion: "1.0.0",
    supportedRuntime: "^1.0",
    category,
    accessibility,
    touchTarget,
    supportsKeyboard,
    supportsScanner
  };
};
