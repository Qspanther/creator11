const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize({
  dialect: config.DB_DIALECT,
  storage: config.DB_STORAGE,
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

module.exports = sequelize;
