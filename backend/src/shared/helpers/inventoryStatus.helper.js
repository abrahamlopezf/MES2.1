const calculateContainerStatus = ({
    currentWeight,
    capacityWeight
}) => {

    if (capacityWeight <= 0)
        return 'EMPTY';

    const percent = Number(currentWeight) / Number(capacityWeight);

    if (currentWeight <= 0)
        return 'EMPTY';

    if (percent >= 1)
        return 'FULL';

    if (percent >= 0.8)
        return 'NEAR_FULL';

    return 'AVAILABLE';
};

module.exports = {
    calculateContainerStatus
};