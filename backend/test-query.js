const db = require('./src/database/models');

async function test() {
  try {
    const formulas = await db.ProcessFormula.findAll({
      include: [
        {
          model: db.Area,
          as: 'target_area',
          required: false,
        },
        {
          model: db.ProcessFormulaItem,
          as: 'items',
          required: false,
          include: [
            {
              model: db.Material,
              as: 'material',
              required: false,
            }
          ]
        }
      ]
    });
    console.log("Success! Found", formulas.length, "formulas.");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit();
}

test();
