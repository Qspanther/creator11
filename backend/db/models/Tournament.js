const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Tournament = sequelize.define('Tournament', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  platform: {
    // 'youtube' | 'instagram'
    type: DataTypes.STRING,
    allowNull: false,
  },
  duration_type: {
    // '24h' | '2d' | '3d'
    type: DataTypes.STRING,
    allowNull: false,
  },
  entry_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  prize_pool: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  lock_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    // 'upcoming' | 'locked' | 'live' | 'completed'
    type: DataTypes.STRING,
    defaultValue: 'upcoming',
  },
  max_participants: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
  },
  current_participants: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  rankings_finalized: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'tournaments',
});

module.exports = Tournament;
