const API_URL = 'http://localhost:4000/api';

async function qaFlow() {
  try {
    console.log('--- 1. Logging in as SUPERADMIN ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nexus',
        password: 'Admin123!'
      })
    }).then(r => r.json());
    
    console.log(loginRes);
    if (!loginRes?.data?.token) throw new Error('Superadmin login failed');
    const saToken = loginRes.data.token;
    console.log('Superadmin login successful');

    console.log('\n--- 2. Creating ADMIN_ALM user ---');
    const rolesRes = await fetch(`${API_URL}/roles`, {
      headers: { Authorization: `Bearer ${saToken}` }
    }).then(r => r.json());
    
    const adminAlmRole = rolesRes.data.find(r => r.code === 'ADMIN_ALM' || r.name.includes('ADMIN_ALM'));
    if (!adminAlmRole) throw new Error('ADMIN_ALM role not found');

    const newUserPayload = {
      first_name: 'QA',
      last_name: 'Tester',
      email: `qa.admin.alm.${Date.now()}@test.com`,
      telefono: '1234567890',
      role_id: adminAlmRole.id,
      is_active: true,
      password: 'Password123!'
    };
    
    const createUserRes = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
      body: JSON.stringify(newUserPayload)
    }).then(r => r.json());
    
    if (!createUserRes.success) throw new Error('Failed to create QA User: ' + JSON.stringify(createUserRes));
    
    const qaUserId = createUserRes.data.id;
    const qaUserEmail = createUserRes.data.email;
    const qaUsername = createUserRes.data.username;
    console.log(`User created: ${qaUsername} (${qaUserEmail})`);

    console.log('\n--- 3. Logging in as QA ADMIN_ALM ---');
    const qaLoginRes2 = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: qaUsername,
        password: 'Password123!'
      })
    }).then(r => r.json());
    
    console.log(qaLoginRes2);
    if (!qaLoginRes2?.data?.token) throw new Error('QA login failed');
    const qaToken = qaLoginRes2.data.token;
    console.log('QA user login successful');

    console.log('\n--- 4. Creating a test Material ---');
    const [fams, codes, types, brands, units, locs] = await Promise.all([
      fetch(`${API_URL}/material-families`, { headers: { Authorization: `Bearer ${qaToken}` } }).then(r => r.json()),
      fetch(`${API_URL}/material-codes`, { headers: { Authorization: `Bearer ${qaToken}` } }).then(r => r.json()),
      fetch(`${API_URL}/material-types`, { headers: { Authorization: `Bearer ${qaToken}` } }).then(r => r.json()),
      fetch(`${API_URL}/material-brands`, { headers: { Authorization: `Bearer ${qaToken}` } }).then(r => r.json()),
      fetch(`${API_URL}/material-units`, { headers: { Authorization: `Bearer ${qaToken}` } }).then(r => r.json()),
      fetch(`${API_URL}/locations`, { headers: { Authorization: `Bearer ${qaToken}` } }).then(r => r.json())
    ]);

    let famId, codeId, typeId, brandId, unitId, locId;

    if (!fams?.data?.length) {
      const createRes = await fetch(`${API_URL}/material-families`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` }, body: JSON.stringify({ name: 'Test Family ' + Date.now(), description: 'QA test' }) }).then(r => r.json());
      if(!createRes.success) throw new Error('Failed to create fam: ' + JSON.stringify(createRes));
      famId = createRes.data.uuid || createRes.data.id;
    } else { famId = fams.data[0].uuid || fams.data[0].id; }

    if (!codes?.data?.length) {
      const createRes = await fetch(`${API_URL}/material-codes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` }, body: JSON.stringify({ name: 'Test Code ' + Date.now(), description: 'QA test' }) }).then(r => r.json());
      if(!createRes.success) throw new Error('Failed to create code: ' + JSON.stringify(createRes));
      codeId = createRes.data.uuid || createRes.data.id;
    } else { codeId = codes.data[0].uuid || codes.data[0].id; }

    if (!types?.data?.length) {
      const createRes = await fetch(`${API_URL}/material-types`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` }, body: JSON.stringify({ name: 'Test Type ' + Date.now(), description: 'QA test' }) }).then(r => r.json());
      if(!createRes.success) throw new Error('Failed to create type: ' + JSON.stringify(createRes));
      typeId = createRes.data.uuid || createRes.data.id;
    } else { typeId = types.data[0].uuid || types.data[0].id; }

    if (!brands?.data?.length) {
      const createRes = await fetch(`${API_URL}/material-brands`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` }, body: JSON.stringify({ name: 'Test Brand ' + Date.now(), description: 'QA test' }) }).then(r => r.json());
      if(!createRes.success) throw new Error('Failed to create brand: ' + JSON.stringify(createRes));
      brandId = createRes.data.uuid || createRes.data.id;
    } else { brandId = brands.data[0].uuid || brands.data[0].id; }

    if (!units?.data?.length) {
      const createRes = await fetch(`${API_URL}/material-units`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` }, body: JSON.stringify({ name: 'Test Unit ' + Date.now(), description: 'QA test', symbol: 'U' }) }).then(r => r.json());
      if(!createRes.success) throw new Error('Failed to create unit: ' + JSON.stringify(createRes));
      unitId = createRes.data.uuid || createRes.data.id;
    } else { unitId = units.data[0].uuid || units.data[0].id; }

    if (!locs?.data?.length) {
      const areaRes = await fetch(`${API_URL}/operational-areas`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` }, body: JSON.stringify({ name: 'Test Area ' + Date.now(), description: 'QA test' }) }).then(r => r.json());
      if(!areaRes.success) throw new Error('Failed to create area: ' + JSON.stringify(areaRes));
      const createRes = await fetch(`${API_URL}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` }, body: JSON.stringify({ name: 'Test Loc ' + Date.now(), description: 'QA test', operational_area_id: areaRes.data.id }) }).then(r => r.json());
      if(!createRes.success) throw new Error('Failed to create loc: ' + JSON.stringify(createRes));
      locId = createRes.data.uuid || createRes.data.id;
    } else { locId = locs.data[0].uuid || locs.data[0].id; }

    const materialPayload = {
      name: `Test Material ${Date.now()}`,
      family_uuid: famId,
      material_code_uuid: codeId,
      type_uuid: typeId,
      brand_uuid: brandId,
      base_unit_uuid: unitId,
      location_uuid: locId,
      ranking_id: 1
    };

    const createMatRes = await fetch(`${API_URL}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${qaToken}` },
      body: JSON.stringify(materialPayload)
    }).then(r => r.json());
    
    if (!createMatRes.success) throw new Error('Failed to create material: ' + JSON.stringify(createMatRes));
    const materialUuid = createMatRes.data.uuid;
    const materialId = createMatRes.data.id;
    console.log(`Material created with UUID: ${materialUuid}`);

    console.log('\n--- 5. Deactivating Material ---');
    const deactRes = await fetch(`${API_URL}/materials/${materialUuid}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${qaToken}` },
      body: JSON.stringify({ action: 'deactivate', reason: 'Prueba E2E de QA Desactivación' })
    }).then(r => r.json());
    if (!deactRes.success) throw new Error('Failed to deactivate: ' + JSON.stringify(deactRes));
    console.log('Material deactivated successfully');

    console.log('\n--- 6. Deleting Material logically ---');
    const delRes = await fetch(`${API_URL}/materials/${materialUuid}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${qaToken}` },
      body: JSON.stringify({ action: 'delete', reason: 'Prueba E2E de QA Eliminación Lógica' })
    }).then(r => r.json());
    if (!delRes.success) throw new Error('Failed to delete');
    console.log('Material deleted successfully');

    console.log('\n--- 7. Verifying Audit Logs via DB ---');
    const { sequelize } = require('./src/config/database');
    const [dbLogs] = await sequelize.query(`SELECT * FROM audit_logs WHERE entity_type = 'Material' AND entity_id = '${materialId}' ORDER BY created_at DESC`);
    
    console.log('Found audit logs for material:', dbLogs.length);
    dbLogs.forEach(l => console.log(`- ${l.action} por usuario ${l.user_id} en record ${l.entity_id}: ${l.description || 'no reason'}`));

    if (dbLogs.length >= 2) {
      console.log('\nQA FLOW COMPLETED SUCCESSFULLY!');
    } else {
      console.log('\nWARNING: Missing some audit logs for the actions performed. Found: ' + dbLogs.length);
    }
  } catch (error) {
    console.error('QA Flow failed:', error.message);
  }
}

qaFlow();
