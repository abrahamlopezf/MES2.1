'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Eliminar el valor por defecto anterior para evitar errores de conversión
    await queryInterface.sequelize.query(`
      ALTER TABLE "scrap_containers"
      ALTER COLUMN "status" DROP DEFAULT;
    `);

    // 2. Renombrar de forma segura usando un bloque condicional en PostgreSQL
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_scrap_containers_status') THEN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_scrap_containers_status_old') THEN
            ALTER TYPE "enum_scrap_containers_status_old" RENAME TO "enum_scrap_containers_status_old_temp";
          END IF;
          ALTER TYPE "enum_scrap_containers_status" RENAME TO "enum_scrap_containers_status_old";
        END IF;
      END
      $$;
    `);

    // 3. Crear nuevo enum si no existe
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_scrap_containers_status"
      AS ENUM (
        'EMPTY',
        'AVAILABLE',
        'FULL',
        'BLOCKED',
        'IN_REPROCESS',
        'DISPOSED'
      );
    `);

    // 4. Convertir columna mapeando los estados antiguos a los nuevos
    // Nota: Soporta convertir tanto si la columna usa actualmente 'enum_scrap_containers_status_old' o 'enum_scrap_containers_status_old_temp'
    await queryInterface.sequelize.query(`
      ALTER TABLE "scrap_containers"
      ALTER COLUMN "status"
      TYPE "enum_scrap_containers_status"
      USING (
        CASE status::text
          WHEN 'VACIO' THEN 'EMPTY'::"enum_scrap_containers_status"
          WHEN 'EN_USO' THEN 'AVAILABLE'::"enum_scrap_containers_status"
          WHEN 'LLENO' THEN 'FULL'::"enum_scrap_containers_status"
          WHEN 'BLOQUEADO' THEN 'BLOCKED'::"enum_scrap_containers_status"
          ELSE 'EMPTY'::"enum_scrap_containers_status"
        END
      );
    `);

    // 5. Establecer el nuevo valor por defecto
    await queryInterface.sequelize.query(`
      ALTER TABLE "scrap_containers"
      ALTER COLUMN "status" SET DEFAULT 'EMPTY'::"enum_scrap_containers_status";
    `);

    // 6. Eliminar enums viejos una vez liberados de la columna
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_scrap_containers_status_old";
      DROP TYPE IF EXISTS "enum_scrap_containers_status_old_temp";
    `);
  },

  async down(queryInterface) {
    // Deshacer el valor por defecto
    await queryInterface.sequelize.query(`
      ALTER TABLE "scrap_containers"
      ALTER COLUMN "status" DROP DEFAULT;
    `);

    // Eliminar tipos temporales si existen
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_scrap_containers_status_new";
      DROP TYPE IF EXISTS "enum_scrap_containers_status_new_temp";
    `);

    // Renombrar condicional en reversa
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_scrap_containers_status') THEN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_scrap_containers_status_new') THEN
            ALTER TYPE "enum_scrap_containers_status_new" RENAME TO "enum_scrap_containers_status_new_temp";
          END IF;
          ALTER TYPE "enum_scrap_containers_status" RENAME TO "enum_scrap_containers_status_new";
        END IF;
      END
      $$;
    `);

    // Crear enum viejo
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_scrap_containers_status"
      AS ENUM (
        'VACIO',
        'EN_USO',
        'LLENO',
        'BLOQUEADO'
      );
    `);

    // Convertir columna de regreso
    await queryInterface.sequelize.query(`
      ALTER TABLE "scrap_containers"
      ALTER COLUMN "status"
      TYPE "enum_scrap_containers_status"
      USING (
        CASE status::text
          WHEN 'EMPTY' THEN 'VACIO'::"enum_scrap_containers_status"
          WHEN 'AVAILABLE' THEN 'EN_USO'::"enum_scrap_containers_status"
          WHEN 'FULL' THEN 'LLENO'::"enum_scrap_containers_status"
          WHEN 'BLOCKED' THEN 'BLOQUEADO'::"enum_scrap_containers_status"
          ELSE 'VACIO'::"enum_scrap_containers_status"
        END
      );
    `);

    // Establecer el valor por defecto original
    await queryInterface.sequelize.query(`
      ALTER TABLE "scrap_containers"
      ALTER COLUMN "status" SET DEFAULT 'VACIO'::"enum_scrap_containers_status";
    `);

    // Eliminar tipos viejos una vez liberados
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_scrap_containers_status_new";
      DROP TYPE IF EXISTS "enum_scrap_containers_status_new_temp";
    `);
  }
};