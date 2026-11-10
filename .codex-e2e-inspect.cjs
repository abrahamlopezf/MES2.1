require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();
for(const q of [
`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND (table_name ILIKE '%tag%' OR table_name ILIKE '%material%' OR table_name ILIKE '%formula%' OR table_name ILIKE '%queue%' OR table_name ILIKE '%shift%' OR table_name ILIKE '%user%' OR table_name ILIKE '%role%') ORDER BY 1`,
`SELECT id,code,name,current_stock_kg,capacity_kg,material_tag_id,is_extrusion_feed,is_active FROM silos ORDER BY id`,
`SELECT id,formula_code,name,batch_size_kg,expected_yield_pieces,extruder_assignment_mode,allowed_extruders,is_active FROM formulas WHERE id=15`,
`SELECT fi.id,fi.material_id,m.name,m.code,fi.quantity_kg,fi.equivalence_tag_id FROM formula_ingredients fi LEFT JOIN materials m ON m.id=fi.material_id WHERE fi.formula_id=15 ORDER BY fi.id`,
`SELECT id,code,name,formula_id,color,expected_weight_kg,allowed_destinations,is_active FROM pti_products WHERE formula_id=15 ORDER BY id`,
`SELECT id,username,role_id,area_id FROM users WHERE username ILIKE '%extrusion%' OR username IN ('admin','nexus') ORDER BY username`
]){try{const res=await c.query(q);console.log('\n---\n'+q.split(' ')[3]+' rows='+res.rowCount);console.log(JSON.stringify(res.rows));}catch(e){console.log('\nQUERY_ERROR '+e.message)}} await c.end()})().catch(e=>{console.error(e.message);process.exitCode=1});
