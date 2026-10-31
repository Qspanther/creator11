const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ShareLog = sequelize.define('ShareLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  platform: {
    type: DataTypes.STRING,
    defaultValue: 'whatsapp', // 'whatsapp', 'telegram', 'copy_link', 'social', etc.
  },
  recipient: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  share_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'share_logs',
  timestamps: true,
  underscored: true,
});

module.exports = ShareLog;
