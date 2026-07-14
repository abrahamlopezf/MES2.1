const calculateContainerStatus = (quantity, capacity) => {
    const qty = Number(quantity || 0);
    const cap = Number(capacity || 0);

    if (cap <= 0) {
        throw new Error('El contenedor no tiene capacidad configurada');
    }

    if (qty <= 0) {
        return 'EMPTY';
    }

    if (qty >= cap) {
        return 'FULL';
    }

    return 'AVAILABLE';
};

module.exports = {
    calculateContainerStatus
};
