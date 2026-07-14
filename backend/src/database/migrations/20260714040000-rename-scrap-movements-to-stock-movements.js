"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameTable(
      "scrap_movements",
      "scrap_stock_movements",
    );
  },

  async down(queryInterface) {
    await queryInterface.renameTable(
      "scrap_stock_movements",
      "scrap_movements",
    );
  },
};
