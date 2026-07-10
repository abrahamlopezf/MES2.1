const getHealthStatus = () => {
  return {
    service: 'Sistema Web Enterprise',
    status: 'OK',
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  getHealthStatus,
};