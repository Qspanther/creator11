const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const TeamCreator = sequelize.define('TeamCreator', {
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
}, {
  tableName: 'team_creators',
});

module.exports = TeamCreator;
