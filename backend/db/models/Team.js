const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tournament_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  captain_creator_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  vice_captain_creator_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  total_credits_used: {
    type: DataTypes.DECIMAL(6, 1),
    defaultValue: 0,
  },
}, {
  tableName: 'teams',
});

module.exports = Team;
