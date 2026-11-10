require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async () => {
 const c = new Client({ host:'127.0.0.1', port:5433, database:'sistema_enterprise_ext_e2e_20261109', user:process.env.DB_USER, password:process.env.DB_PASSWORD, ssl:false });
 await c.connect();
 for (const t of ['formulas','formula_ingredients','materials','pti_products','users','roles','extruder_queues','process_preparations','extrusion_shift_sessions','extrusion_production_entries','pti_racks','silo_receipt_lots']) {
  const cols=await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['public',t]);
  console.log(t+': '+cols.rows.map(x=>x.column_name).join(', '));
 }
 for (const [t,where] of [['formulas','id=15'],['formula_ingredients','formula_id=15'],['pti_products','true'],['users',"username IN ('admin','nexus','admin_extrusion','supervisor_extrusion')"]]) {
  try { const x=await c.query('SELECT to_jsonb(t) AS row FROM '+t+' t WHERE '+where+' LIMIT 30'); console.log('DATA '+t+' '+JSON.stringify(x.rows.map(r=>r.row))); }
  catch(e) { console.log('DATAERR '+t+' '+e.message); }
 }
 await c.end();
})().catch(e=>{console.error(e.message);process.exitCode=1});
