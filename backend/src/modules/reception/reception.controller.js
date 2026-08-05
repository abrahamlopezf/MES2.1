const receiveMaterialUseCase = require('./useCases/receiveMaterial.useCase');
const { ReceiveMaterialSchema } = require('./dto/reception.dto');

class ReceptionController {
  /**
   * Ejecuta la recepción de material orquestando DTO validation y Use Case.
   */
  async receiveMaterial(req, res) {
    try {
      // 1. DTO Validation
      const parseResult = ReceiveMaterialSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Error de validación de datos',
          errors: parseResult.error.format()
        });
      }

      // El usuario viene del JWT auth middleware
      const userId = req.user.id;

      // 2. Application Logic (Use Case)
      const result = await receiveMaterialUseCase.execute(parseResult.data, userId);

      // 3. Response
      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en ReceptionController.receiveMaterial:', error);
      
      // Manejo de errores de negocio vs errores de sistema
      const status = error.message.includes('no existe') || error.message.includes('estado') ? 400 : 500;
      
      return res.status(status).json({
        message: 'No se pudo completar la recepción',
        error: error.message
      });
    }
  }
}

module.exports = new ReceptionController();
