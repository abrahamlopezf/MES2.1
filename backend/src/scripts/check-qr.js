const { sequelize } = require('../config/database');

async function main() {
  const qrCode = 'QR-LOT-CARB-1792473431913-86293-SN1';
  const [qrs] = await sequelize.query(`SELECT * FROM qr_codes WHERE qr_code = '${qrCode}'`);
  console.log('QR row:', qrs);

  if (qrs.length > 0) {
    const [wips] = await sequelize.query(`SELECT * FROM wip_inventories WHERE qr_code_id = ${qrs[0].id}`);
    console.log('WIP records for QR:', wips);
  } else {
    const [likeQrs] = await sequelize.query(`SELECT * FROM qr_codes WHERE qr_code LIKE '%CARB%' LIMIT 10`);
    console.log('Similar QRs:', likeQrs);
  }

  const [recentWips] = await sequelize.query(`
    SELECT w.id, w.amount, w.area_id, w.material_id, q.qr_code, m.name as mat_name
    FROM wip_inventories w
    LEFT JOIN qr_codes q ON w.qr_code_id = q.id
    LEFT JOIN materials m ON w.material_id = m.id
    WHERE w.area_id = 2
    ORDER BY w.updated_at DESC
    LIMIT 10
  `);
  console.log('Recent Extrusion WIP records (area_id = 2):', recentWips);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
