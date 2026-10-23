const { Formula, FormulaIngredient, Material } = require('../database/models');

async function main() {
  const formulas = await Formula.findAll({
    include: [{
      model: FormulaIngredient,
      as: 'ingredients',
      include: [{ model: Material, as: 'material' }]
    }],
    order: [['id', 'ASC']]
  });

  console.log(`Total formulas found: ${formulas.length}`);
  formulas.forEach(f => {
    console.log(`ID ${f.id} | ${f.code} | ${f.name} | Allowed: ${JSON.stringify(f.allowed_extruders)} | Restricted: ${JSON.stringify(f.restricted_extruders)}`);
    f.ingredients.forEach(i => {
      console.log(`   - ${i.material?.name || i.material_id}: ${i.quantity}kg (${i.percentage}%)`);
    });
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
