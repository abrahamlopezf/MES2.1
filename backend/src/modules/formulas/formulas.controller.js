const formulasService = require('./formulas.service');

const listFormulas = async (req, res, next) => {
  try {
    const result = await formulasService.listFormulas({
      query: req.query,
    });

    return res.json({
      success: true,
      message: result,
      data: 'Fórmulas obtenidas correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const getFormulaById = async (req, res, next) => {
  try {
    const result = await formulasService.getFormulaById({
      id: req.params.id,
    });

    return res.json({
      success: true,
      message: result,
      data: 'Fórmula obtenida correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const createFormula = async (req, res, next) => {
  try {
    const result = await formulasService.createFormula({
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(201).json({
      success: true,
      message: result,
      data: 'Fórmula creada correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const updateFormula = async (req, res, next) => {
  try {
    const result = await formulasService.updateFormula({
      id: req.params.id,
      payload: req.body,
      user: req.user,
      req,
    });

    return res.json({
      success: true,
      message: result,
      data: 'Fórmula actualizada correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const deactivateFormula = async (req, res, next) => {
  try {
    const result = await formulasService.deactivateFormula({
      id: req.params.id,
      user: req.user,
      req,
    });

    return res.json({
      success: true,
      message: result,
      data: 'Fórmula desactivada correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listFormulas,
  getFormulaById,
  createFormula,
  updateFormula,
  deactivateFormula,
};