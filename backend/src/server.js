require("dotenv").config();

const app = require("./app");
const { testDatabaseConnection } = require("./config/database");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testDatabaseConnection();
    // Sync for new Phase 3 models
    const db = require('./database/models');
    // Nullify default_location_id to avoid foreign key violations since we changed it to point to material_locations
    await db.sequelize.query('UPDATE materials SET default_location_id = NULL;');

    await db.Ranking.sync({ alter: true });
    await db.Location.sync({ alter: true });
    await db.Material.sync({ alter: true });
    await db.TipoBaja.sync({ alter: true });
    await db.Lote.sync({ alter: true });
    await db.Inventory.sync({ alter: true });

    // Seed Ranking
    const rankingsCount = await db.Ranking.count();
    if (rankingsCount === 0) {
      await db.Ranking.bulkCreate([
        { id: 1, name: 'Materia Prima', nomenclature: 'MP', description: 'Materiales base' },
        { id: 2, name: 'Materia Secundaria', nomenclature: 'MS', description: 'Materiales auxiliares en proceso' },
        { id: 3, name: 'Material de Apoyo', nomenclature: 'MA', description: 'Materiales no relacionados a producción' },
      ]);
    }

    // Seed TipoBaja
    const tipoBajaCount = await db.TipoBaja.count();
    if (tipoBajaCount === 0) {
      await db.TipoBaja.bulkCreate([
        { id: 1, name: 'Material dañado', description: 'Daño físico al material' },
        { id: 2, name: 'Merma', description: 'Pérdida en proceso' },
        { id: 3, name: 'Caducidad', description: 'Material expirado' },
        { id: 4, name: 'Contaminación', description: 'Material contaminado' },
        { id: 5, name: 'Error de recepción', description: 'Ajuste por error al recibir' },
        { id: 6, name: 'Otro', description: 'Motivo no clasificado' },
      ]);
    }

    // Assign default ranking to existing materials if they have none
    await db.Material.update(
      { ranking_id: 1 }, // Default to MP
      { where: { ranking_id: null } }
    );

    app.listen(PORT, () => {
      console.log(`🚀 Backend ejecutándose en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
};

startServer();
