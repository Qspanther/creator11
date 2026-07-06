const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Score = sequelize.define('Score', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  team_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  raw_metric_diff: {
    // Raw numeric difference in metrics
    type: DataTypes.DECIMAL(16, 6),
    defaultValue: 0,
  },
  multiplier_applied: {
    // 1.0, 1.5, or 2.0
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 1.0,
  },
  points: {
    // Final weighted points with at least 4 decimal places
    type: DataTypes.DECIMAL(16, 6),
    defaultValue: 0,
  },
  calculated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'scores',
});

module.exports = Score;
