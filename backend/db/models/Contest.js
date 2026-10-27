const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Contest = sequelize.define('Contest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tournament_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Mega Contest'
  },
  type: {
    // 'mega', 'mini', 'h2h', 'winner_takes_all', 'practice'
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'mega'
  },
  entry_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  prize_pool: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  platform_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  max_participants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000
  },
  joined_participants: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  prize_distribution: {
    // JSON string describing the rank-wise prize mapping, e.g., {"1": 1000, "2-5": 500}
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    // 'upcoming', 'live', 'completed', 'cancelled'
    type: DataTypes.STRING,
    defaultValue: 'upcoming'
  },
  is_guaranteed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'contests',
});

module.exports = Contest;
