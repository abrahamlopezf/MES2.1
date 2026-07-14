require("dotenv").config();
const db = require("./src/database/models");
const scrapService = require("./src/modules/scrap/scrap.service");
const {
  updateContainerInventory,
} = require("./src/modules/scrap/services/updateContainerInventory.service");

async function runTests() {
  try {
    await db.sequelize.authenticate();
    console.log("Conexión a la base de datos establecida.");

    // Limpiar datos previos si existen
    await db.ScrapMovement.destroy({ where: {} });
    await db.ScrapContainer.destroy({ where: {} });

    console.log("\n==========================================");
    console.log("TEST 1: Crear contenedor vacío");
    console.log("==========================================");
    const container = await db.ScrapContainer.create({
      code: "SCRAP-CONT-001",
      name: "Contenedor General de Scrap",
      scrap_catalog_id: 1, // Asumiendo que existe en semilla
      rack_id: 3, // Asumiendo que existe en semilla
      capacity: 100,
      current_quantity: 0,
      status: "EMPTY",
      is_active: true,
    });

    console.log(
      `Contenedor creado: ID: ${container.id}, Código: ${container.code}`,
    );
    console.log(
      `Capacidad: ${container.capacity}, Cantidad Actual: ${container.current_quantity}`,
    );
    console.log(`Estado: ${container.status} (Esperado: EMPTY)`);

    console.log("\n==========================================");
    console.log("TEST 2: Registrar scrap (+20 KG)");
    console.log("==========================================");
    await updateContainerInventory({
      container_id: container.id,
      quantity: 20,
      movement_type: "GENERACION",
      performed_by: 1,
    });

    let updated = await db.ScrapContainer.findByPk(container.id);
    let movements = await db.ScrapMovement.findAll({
      where: { container_id: container.id },
    });

    console.log(`Cantidad Actual: ${updated.current_quantity} (Esperado: 20)`);
    console.log(`Estado: ${updated.status} (Esperado: AVAILABLE)`);
    console.log(`Movimientos registrados: ${movements.length}`);
    if (movements.length > 0) {
      const lastM = movements[movements.length - 1];
      console.log(
        `Ledger -> Balance Antes: ${lastM.balance_before}, Después: ${lastM.balance_after}, Tipo: ${lastM.movement_type}`,
      );
    }

    console.log("\n==========================================");
    console.log("TEST 3: Llenar contenedor (+80 KG)");
    console.log("==========================================");
    await updateContainerInventory({
      container_id: container.id,
      quantity: 80,
      movement_type: "GENERACION",
      performed_by: 1,
    });

    updated = await db.ScrapContainer.findByPk(container.id);
    movements = await db.ScrapMovement.findAll({
      where: { container_id: container.id },
    });

    console.log(`Cantidad Actual: ${updated.current_quantity} (Esperado: 100)`);
    console.log(`Estado: ${updated.status} (Esperado: FULL)`);
    console.log(`Movimientos registrados: ${movements.length}`);
    if (movements.length > 0) {
      const lastM = movements[movements.length - 1];
      console.log(
        `Ledger -> Balance Antes: ${lastM.balance_before}, Después: ${lastM.balance_after}, Tipo: ${lastM.movement_type}`,
      );
    }

    console.log("\n==========================================");
    console.log("TEST 4: Salida por transferencia (-30 KG)");
    console.log("==========================================");
    await updateContainerInventory({
      container_id: container.id,
      quantity: -30,
      movement_type: "TRASLADO",
      performed_by: 1,
    });

    updated = await db.ScrapContainer.findByPk(container.id);
    movements = await db.ScrapMovement.findAll({
      where: { container_id: container.id },
    });

    console.log(`Cantidad Actual: ${updated.current_quantity} (Esperado: 70)`);
    console.log(`Estado: ${updated.status} (Esperado: AVAILABLE)`);
    console.log(`Movimientos registrados: ${movements.length}`);
    if (movements.length > 0) {
      const lastM = movements[movements.length - 1];
      console.log(
        `Ledger -> Balance Antes: ${lastM.balance_before}, Después: ${lastM.balance_after}, Tipo: ${lastM.movement_type}`,
      );
    }

    console.log("\n==========================================");
    console.log("TEST 5: Traslado entre contenedores");
    console.log("==========================================");

    // Crear contenedor destino
    const containerDest = await db.ScrapContainer.create({
      code: "SCRAP-CONT-002",
      name: "Contenedor Destino de Scrap",
      scrap_catalog_id: 1,
      rack_id: 3,
      capacity: 100,
      current_quantity: 0,
      status: "EMPTY",
      is_active: true,
    });
    console.log(`Contenedor destino creado: ID: ${containerDest.id}, Código: ${containerDest.code}`);

    // El contenedor origen (container) tiene 70 KG del test anterior.
    // Para el traslado usamos una transacción compartida.
    const trx = await db.sequelize.transaction();
    try {
      // Restar 30 KG del origen
      await updateContainerInventory({
        container_id: container.id,
        quantity: -30,
        movement_type: "TRASLADO",
        reference_folio: `TRAN-${Date.now()}`,
        notes: "Traslado parcial al contenedor destino",
        performed_by: 1,
        transaction: trx,
      });

      // Sumar 30 KG al destino
      await updateContainerInventory({
        container_id: containerDest.id,
        quantity: 30,
        movement_type: "TRASLADO",
        reference_folio: `TRAN-${Date.now()}`,
        notes: "Recepción desde contenedor origen",
        performed_by: 1,
        transaction: trx,
      });

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    const origen5 = await db.ScrapContainer.findByPk(container.id);
    const destino5 = await db.ScrapContainer.findByPk(containerDest.id);
    const movOrigen5 = await db.ScrapMovement.findAll({ where: { container_id: container.id }, order: [["id", "ASC"]] });
    const movDestino5 = await db.ScrapMovement.findAll({ where: { container_id: containerDest.id }, order: [["id", "ASC"]] });

    console.log(`\nOrigen  -> Cantidad: ${origen5.current_quantity} (Esperado: 40), Estado: ${origen5.status} (Esperado: AVAILABLE)`);
    console.log(`Destino -> Cantidad: ${destino5.current_quantity} (Esperado: 30), Estado: ${destino5.status} (Esperado: AVAILABLE)`);

    const lastMovOrigen5 = movOrigen5[movOrigen5.length - 1];
    console.log(`Ledger Origen  -> Tipo: ${lastMovOrigen5.movement_type} (Esperado: TRASLADO), Balance: ${lastMovOrigen5.balance_before} -> ${lastMovOrigen5.balance_after}`);

    const lastMovDestino5 = movDestino5[movDestino5.length - 1];
    console.log(`Ledger Destino -> Tipo: ${lastMovDestino5.movement_type} (Esperado: TRASLADO), Balance: ${lastMovDestino5.balance_before} -> ${lastMovDestino5.balance_after}`);

    console.log("\n==========================================");
    console.log("TEST 6: Salida definitiva a reciclaje");
    console.log("==========================================");

    // El contenedor destino tiene 30 KG. Se saca todo con SALIDA_RECICLAJE.
    const balanceAntesT6 = Number(destino5.current_quantity);

    await updateContainerInventory({
      container_id: containerDest.id,
      quantity: -balanceAntesT6,
      movement_type: "SALIDA_RECICLAJE",
      notes: "Salida definitiva a reciclaje",
      performed_by: 1,
    });

    const destino6 = await db.ScrapContainer.findByPk(containerDest.id);
    const movDestino6 = await db.ScrapMovement.findAll({ where: { container_id: containerDest.id }, order: [["id", "ASC"]] });
    const lastMovDestino6 = movDestino6[movDestino6.length - 1];

    console.log(`Cantidad Actual: ${destino6.current_quantity} (Esperado: 0)`);
    console.log(`Estado: ${destino6.status} (Esperado: EMPTY)`);
    console.log(`Ledger -> Tipo: ${lastMovDestino6.movement_type} (Esperado: SALIDA_RECICLAJE), Balance: ${lastMovDestino6.balance_before} -> ${lastMovDestino6.balance_after}`);

    console.log("\n==========================================");
    console.log("TESTS 1-6 COMPLETADOS CON ÉXITO");
    console.log("==========================================");

    // ──────────────────────────────────────────────
    // TEST 7: No permitir exceder capacidad
    // ──────────────────────────────────────────────
    console.log("\n==========================================");
    console.log("TEST 7: No permitir exceder capacidad del contenedor");
    console.log("==========================================");
    {
      const contT7 = await db.ScrapContainer.create({
        code: `T7-${Date.now()}`,
        name: "Contenedor FULL para Test 7",
        capacity: 100,
        current_quantity: 100,
        status: "FULL",
        is_active: true,
      });

      const movsBefore = await db.ScrapMovement.count({ where: { container_id: contT7.id } });
      let errorCaught = null;

      try {
        await updateContainerInventory({
          container_id: contT7.id,
          quantity: 10,          // excede capacidad
          movement_type: "GENERACION",
          performed_by: 1,
        });
        console.error("  ❌ FALLÓ: La operación debió haber sido rechazada.");
      } catch (err) {
        errorCaught = err.message;
      }

      const contT7After  = await db.ScrapContainer.findByPk(contT7.id);
      const movsAfter    = await db.ScrapMovement.count({ where: { container_id: contT7.id } });

      if (
        errorCaught &&
        Number(contT7After.current_quantity) === 100 &&
        contT7After.status === "FULL" &&
        movsAfter === movsBefore
      ) {
        console.log("  ✅ Error capturado correctamente:", errorCaught);
        console.log(`  ✅ Cantidad conservada: ${contT7After.current_quantity} KG (Esperado: 100)`);
        console.log(`  ✅ Estado conservado: ${contT7After.status} (Esperado: FULL)`);
        console.log(`  ✅ Sin movimientos nuevos: ${movsAfter} (Esperado: ${movsBefore})`);
      } else {
        console.error("  ❌ Test 7 FALLÓ — Estado inesperado:");
        console.error(`     Error capturado: ${errorCaught}`);
        console.error(`     Cantidad después: ${contT7After.current_quantity}`);
        console.error(`     Estado después: ${contT7After.status}`);
        console.error(`     Movimientos antes: ${movsBefore}, después: ${movsAfter}`);
      }
    }

    // ──────────────────────────────────────────────
    // TEST 8: No permitir salida mayor al inventario
    // ──────────────────────────────────────────────
    console.log("\n==========================================");
    console.log("TEST 8: No permitir salida mayor al inventario disponible");
    console.log("==========================================");
    {
      const contT8 = await db.ScrapContainer.create({
        code: `T8-${Date.now()}`,
        name: "Contenedor para Test 8",
        capacity: 100,
        current_quantity: 40,
        status: "AVAILABLE",
        is_active: true,
      });

      const movsBefore = await db.ScrapMovement.count({ where: { container_id: contT8.id } });
      let errorCaught = null;

      try {
        await updateContainerInventory({
          container_id: contT8.id,
          quantity: -50,         // más de lo disponible
          movement_type: "TRASLADO",
          performed_by: 1,
        });
        console.error("  ❌ FALLÓ: La operación debió haber sido rechazada.");
      } catch (err) {
        errorCaught = err.message;
      }

      const contT8After = await db.ScrapContainer.findByPk(contT8.id);
      const movsAfter   = await db.ScrapMovement.count({ where: { container_id: contT8.id } });

      if (
        errorCaught &&
        Number(contT8After.current_quantity) === 40 &&
        contT8After.status === "AVAILABLE" &&
        movsAfter === movsBefore
      ) {
        console.log("  ✅ Error capturado correctamente:", errorCaught);
        console.log(`  ✅ Cantidad conservada: ${contT8After.current_quantity} KG (Esperado: 40)`);
        console.log(`  ✅ Estado conservado: ${contT8After.status} (Esperado: AVAILABLE)`);
        console.log(`  ✅ Sin movimientos nuevos: ${movsAfter} (Esperado: ${movsBefore})`);
      } else {
        console.error("  ❌ Test 8 FALLÓ — Estado inesperado:");
        console.error(`     Error capturado: ${errorCaught}`);
        console.error(`     Cantidad después: ${contT8After.current_quantity}`);
        console.error(`     Estado después: ${contT8After.status}`);
        console.error(`     Movimientos antes: ${movsBefore}, después: ${movsAfter}`);
      }
    }

    // ──────────────────────────────────────────────
    // TEST 9: Rollback atómico en traslado entre contenedores
    // ──────────────────────────────────────────────
    console.log("\n==========================================");
    console.log("TEST 9: Rollback completo en traslado entre contenedores");
    console.log("==========================================");
    {
      const origenT9 = await db.ScrapContainer.create({
        code: `T9-ORI-${Date.now()}`,
        name: "Origen Test 9",
        capacity: 100,
        current_quantity: 70,
        status: "AVAILABLE",
        is_active: true,
      });

      const destinoT9 = await db.ScrapContainer.create({
        code: `T9-DST-${Date.now()}`,
        name: "Destino Test 9",
        capacity: 100,
        current_quantity: 95,   // 95 + 30 = 125 > 100 → debe fallar
        status: "AVAILABLE",
        is_active: true,
      });

      const movsOrigenBefore  = await db.ScrapMovement.count({ where: { container_id: origenT9.id } });
      const movsDestinoBefore = await db.ScrapMovement.count({ where: { container_id: destinoT9.id } });
      let errorCaught = null;

      const trx9 = await db.sequelize.transaction();
      try {
        // Paso 1: descontar del origen (debería funcionar)
        await updateContainerInventory({
          container_id: origenT9.id,
          quantity: -30,
          movement_type: "TRASLADO",
          performed_by: 1,
          transaction: trx9,
        });

        // Paso 2: agregar al destino (debe fallar — excede capacidad)
        await updateContainerInventory({
          container_id: destinoT9.id,
          quantity: 30,
          movement_type: "TRASLADO",
          performed_by: 1,
          transaction: trx9,
        });

        await trx9.commit();
        console.error("  ❌ FALLÓ: El traslado debió haber sido rechazado.");
      } catch (err) {
        errorCaught = err.message;
        await trx9.rollback();
      }

      const origenT9After  = await db.ScrapContainer.findByPk(origenT9.id);
      const destinoT9After = await db.ScrapContainer.findByPk(destinoT9.id);
      const movsOrigenAfter  = await db.ScrapMovement.count({ where: { container_id: origenT9.id } });
      const movsDestinoAfter = await db.ScrapMovement.count({ where: { container_id: destinoT9.id } });

      const origenIntacto  = Number(origenT9After.current_quantity) === 70;
      const destinoIntacto = Number(destinoT9After.current_quantity) === 95;
      const sinMovOrigen   = movsOrigenAfter === movsOrigenBefore;
      const sinMovDestino  = movsDestinoAfter === movsDestinoBefore;

      if (errorCaught && origenIntacto && destinoIntacto && sinMovOrigen && sinMovDestino) {
        console.log("  ✅ Rollback ejecutado correctamente:", errorCaught);
        console.log(`  ✅ Origen conservado: ${origenT9After.current_quantity} KG (Esperado: 70)`);
        console.log(`  ✅ Destino conservado: ${destinoT9After.current_quantity} KG (Esperado: 95)`);
        console.log(`  ✅ Sin movimientos en origen: ${movsOrigenAfter} (Esperado: ${movsOrigenBefore})`);
        console.log(`  ✅ Sin movimientos en destino: ${movsDestinoAfter} (Esperado: ${movsDestinoBefore})`);
      } else {
        console.error("  ❌ Test 9 FALLÓ — Estado inesperado:");
        console.error(`     Error capturado: ${errorCaught}`);
        console.error(`     Origen antes: 70, después: ${origenT9After.current_quantity}`);
        console.error(`     Destino antes: 95, después: ${destinoT9After.current_quantity}`);
        console.error(`     Movimientos origen antes: ${movsOrigenBefore}, después: ${movsOrigenAfter}`);
        console.error(`     Movimientos destino antes: ${movsDestinoBefore}, después: ${movsDestinoAfter}`);
      }
    }

    console.log("\n==========================================");
    console.log("TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO");
    console.log("==========================================");
  } catch (error) {
    console.error("Error ejecutando las pruebas:", error);
  } finally {
    await db.sequelize.close();
  }
}

runTests();