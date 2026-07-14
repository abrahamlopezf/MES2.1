export const ENDPOINTS = {
  TRACEABILITY: {
    SCAN: (code: string) => `/traceability/scan/${code}`,
  },
  ACTIONS: {
    EXECUTE: (actionCode: string) => `/actions/${actionCode}`,
  }
} as const;
