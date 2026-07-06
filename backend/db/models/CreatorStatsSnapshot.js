const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const CreatorStatsSnapshot = sequelize.define('CreatorStatsSnapshot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tournament_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  snapshot_type: {
    // 'start' | 'end'
    type: DataTypes.STRING,
    allowNull: false,
  },
  views: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  likes: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  followers: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  captured_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'creator_stats_snapshots',
});

module.exports = CreatorStatsSnapshot;
