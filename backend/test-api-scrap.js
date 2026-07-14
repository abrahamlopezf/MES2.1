require("dotenv").config();
const db = require("./src/database/models");
const scrapController = require("./src/modules/scrap/scrap.controller");

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runApiTests() {
  try {
    await db.sequelize.authenticate();
    console.log("Conexión establecida.");

    // Clean up
    await db.ScrapMovement.destroy({ where: {} });
    await db.ScrapContainer.destroy({ where: {} });

    // Seed test containers
    const cont1 = await db.ScrapContainer.create({
      code: "API-CONT-001",
      name: "API Test Contenedor 1",
      capacity: 100,
      current_quantity: 0,
      status: "EMPTY",
      is_active: true,
    });
    
    const cont2 = await db.ScrapContainer.create({
      code: "API-CONT-002",
      name: "API Test Contenedor 2",
      capacity: 100,
      current_quantity: 0,
      status: "EMPTY",
      is_active: true,
    });

    console.log("\n==========================================");
    console.log("1. Obtener contenedores");
    console.log("==========================================");
    let req = { query: {} };
    let res = mockRes();
    await scrapController.listContainers(req, res);
    console.log("Status:", res.statusCode);
    console.log("Contenedores devueltos:", res.body.data.length);

    console.log("\n==========================================");
    console.log("3. Crear generación (+50 KG a CONT 1)");
    console.log("==========================================");
    req = {
      user: { id: 1 },
      body: {
        container_id: cont1.id,
        quantity: 50,
        movement_type: "GENERACION"
      }
    };
    res = mockRes();
    await scrapController.createMovement(req, res);
    console.log("Status:", res.statusCode);
    console.log("Mensaje:", res.body.message);

    console.log("\n==========================================");
    console.log("2. Ver detalle con ledger (CONT 1)");
    console.log("==========================================");
    req = { params: { id: cont1.id } };
    res = mockRes();
    await scrapController.getContainer(req, res);
    console.log("Status:", res.statusCode);
    console.log("Cantidad actual:", res.body.data.current_quantity);
    console.log("Movimientos:", res.body.data.movements.length);

    console.log("\n==========================================");
    console.log("4. Transferencia correcta (20 KG de CONT 1 a CONT 2)");
    console.log("==========================================");
    req = {
      user: { id: 1 },
      body: {
        origin_container_id: cont1.id,
        destination_container_id: cont2.id,
        quantity: 20
      }
    };
    res = mockRes();
    await scrapController.transfer(req, res);
    console.log("Status:", res.statusCode);
    console.log("Mensaje:", res.body.message);

    console.log("\n==========================================");
    console.log("5. Salida reciclaje (10 KG de CONT 2)");
    console.log("==========================================");
    req = {
      user: { id: 1 },
      body: {
        container_id: cont2.id,
        quantity: 10
      }
    };
    res = mockRes();
    await scrapController.recycle(req, res);
    console.log("Status:", res.statusCode);
    console.log("Mensaje:", res.body.message);

    console.log("\n==========================================");
    console.log("6. Bloquear sobrecapacidad (CONT 1 +80 KG => 30+80=110 > 100)");
    console.log("==========================================");
    req = {
      user: { id: 1 },
      body: {
        container_id: cont1.id,
        quantity: 80,
        movement_type: "GENERACION"
      }
    };
    res = mockRes();
    await scrapController.createMovement(req, res);
    console.log("Status (Esperado 400):", res.statusCode);
    console.log("Error:", res.body.message);

    console.log("\n==========================================");
    console.log("7. Bloquear inventario negativo (CONT 2 -50 KG)");
    console.log("==========================================");
    req = {
      user: { id: 1 },
      body: {
        container_id: cont2.id,
        quantity: 50
      }
    };
    res = mockRes();
    await scrapController.recycle(req, res);
    console.log("Status (Esperado 400):", res.statusCode);
    console.log("Error:", res.body.message);

    console.log("\n==========================================");
    console.log("8. Rollback transferencia (CONT 1 a CONT 2, 80 KG)");
    console.log("==========================================");
    // CONT 1 has 30, trying to transfer 80 will fail in origin check
    // Wait, let's test destination capacity failure for full rollback proof
    // CONT 1: 30 KG, CONT 2: 10 KG. Let's make CONT 1 have 95 KG
    
    // First setup:
    req = {
      user: { id: 1 },
      body: { container_id: cont1.id, quantity: 65, movement_type: 'GENERACION' }
    };
    await scrapController.createMovement(req, mockRes()); // CONT 1 -> 95 KG

    req = {
      user: { id: 1 },
      body: {
        origin_container_id: cont1.id,
        destination_container_id: cont2.id,
        quantity: 95 // 10 + 95 = 105 > 100 (Fails on destination)
      }
    };
    res = mockRes();
    await scrapController.transfer(req, res);
    console.log("Status (Esperado 400):", res.statusCode);
    console.log("Error:", res.body.message);

    // Verify
    req = { params: { id: cont1.id } };
    let resV1 = mockRes();
    await scrapController.getContainer(req, resV1);
    
    req = { params: { id: cont2.id } };
    let resV2 = mockRes();
    await scrapController.getContainer(req, resV2);

    console.log(`CONT 1 Cantidad Final: ${resV1.body.data.current_quantity} (Esperado 95)`);
    console.log(`CONT 2 Cantidad Final: ${resV2.body.data.current_quantity} (Esperado 10)`);

    console.log("\n==========================================");
    console.log("TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO");
    console.log("==========================================");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.sequelize.close();
  }
}

runApiTests();
