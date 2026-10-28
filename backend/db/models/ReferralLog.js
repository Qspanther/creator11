const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ReferralLog = sequelize.define('ReferralLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  referrer_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  referred_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  round: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'referral_logs',
  timestamps: true,
  underscored: true,
});

module.exports = ReferralLog;
