const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Leaderboard = sequelize.define('Leaderboard', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tournament_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  team_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  total_points: {
    type: DataTypes.DECIMAL(16, 6),
    defaultValue: 0,
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  prize_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
}, {
  tableName: 'leaderboard',
});

module.exports = Leaderboard;
