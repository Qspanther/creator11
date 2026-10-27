const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../db/models');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Admin Check Middleware ───
// Must be used AFTER authenticate middleware
async function isAdmin(req, res, next) {
  try {
    const { User } = require('../db/models');
    const user = await User.findByPk(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error during authorization' });
  }
}

module.exports = { authenticate, isAdmin };
