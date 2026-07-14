"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn("scrap_containers", "area_id");

    await queryInterface.removeColumn("scrap_containers", "scrap_type_id");

    await queryInterface.removeColumn("scrap_containers", "qr_code_id");

    await queryInterface.removeColumn("scrap_containers", "container_type");

    await queryInterface.removeColumn("scrap_containers", "location");
  },
};
