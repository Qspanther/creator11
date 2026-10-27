const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user', // 'user' or 'admin'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otp_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otp_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  otp_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  kyc_status: {
    // ASSUMPTION: KYC status is a simple enum: 'none' | 'pending' | 'verified'
    type: DataTypes.STRING,
    defaultValue: 'none',
  },
  kyc_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  kyc_pan: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'users',
});

module.exports = User;
