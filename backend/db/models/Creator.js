const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Creator = sequelize.define('Creator', {
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
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  credit_cost: {
    type: DataTypes.DECIMAL(6, 1),
    allowNull: false,
  },
  profile_image_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  external_channel_id: {
    // YouTube channel ID or Instagram user ID
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Base stats for mock data generation
  base_views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  base_likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  base_followers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'creators',
});

module.exports = Creator;
