const intermediateService = require('./intermediate.service');

const listIntermediateMaterials = async (req, res, next) => {
    try {
        const result = await intermediateService.listIntermediateMaterials({
            query: req.query,
        });

        return res.status(200).json({
            success: true,
            message: result,
            data: 'Catálogo MI/PTI consultado correctamente.',
        });
    } catch (error) {
        return next(error);
    }
};

const createIntermediateMaterial = async (req, res, next) => {
    try {
        const result = await intermediateService.createIntermediateMaterial({
            payload: req.body,
            user: req.user,
        });

        return res.status(201).json({
            success: true,
            message: result,
            data: 'MI/PTI creado correctamente.',
        });
    } catch (error) {
        return next(error);
    }
};

const listRacks = async (req, res, next) => {
    try {
        const result = await intermediateService.listRacks({
            query: req.query,
        });

        return res.status(200).json({
            success: true,
            message: result,
            data: 'Racks consultados correctamente.',
        });
    } catch (error) {
        return next(error);
    }
};

const createRack = async (req, res, next) => {
    try {
        const result = await intermediateService.createRack({
            payload: req.body,
            user: req.user,
        });

        return res.status(201).json({
            success: true,
            message: result,
            data: 'Rack creado correctamente.',
        });
    } catch (error) {
        return next(error);
    }
};

const listStocks = async (req, res, next) => {
    try {
        const result = await intermediateService.listStocks({
            query: req.query,
        });

        return res.status(200).json({
            success: true,
            message: result,
            data: 'Stock MI/PTI consultado correctamente.',
        });
    } catch (error) {
        return next(error);
    }
};

const ensureStock = async (req, res, next) => {
    try {
        const result = await intermediateService.ensureStock({
            payload: req.body,
            user: req.user,
        });

        return res.status(201).json({
            success: true,
            message: result,
            data: 'Stock MI/PTI inicializado correctamente.',
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    listIntermediateMaterials,
    createIntermediateMaterial,
    listRacks,
    createRack,
    listStocks,
    ensureStock,
};