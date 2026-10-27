const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ContestParticipant = sequelize.define('ContestParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contest_id: {
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
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  prize_won: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'contest_participants',
  indexes: [
    {
      unique: true,
      fields: ['contest_id', 'team_id']
    }
  ]
});

module.exports = ContestParticipant;
