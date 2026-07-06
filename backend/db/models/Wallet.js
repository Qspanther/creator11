const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  balance: {
    // ASSUMPTION: Using DECIMAL for financial accuracy, stored as string in SQLite
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0,
    allowNull: false,
  },
}, {
  tableName: 'wallets',
});

module.exports = Wallet;
