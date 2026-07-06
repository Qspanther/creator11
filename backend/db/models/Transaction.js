const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  wallet_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    // deposit | withdraw | entry_fee | prize
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
  },
  status: {
    // completed | pending | failed
    type: DataTypes.STRING,
    defaultValue: 'completed',
  },
  reference_tournament_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'transactions',
});

module.exports = Transaction;
