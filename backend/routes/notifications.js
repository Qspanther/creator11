const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Notification } = require('../db/models');

const router = express.Router();

// Fetch notifications for the user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;
    
    // We only have global notifications right now, so we fetch where user_id is null or user_id matches.
    // In our implementation, we've set `authenticate` middleware, which sets `req.user.userId`.
    // Wait, the `authenticate` middleware uses `jwt.verify(token)` and usually sets `req.user`?
    // Let's rely on the token decoded in middleware or just extract from header if we want to be safe.
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const actualUserId = decoded.userId;

    const notifications = await Notification.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // We need to parse read_by to see if it's read by this user
    const processed = notifications.map(n => {
      const nObj = n.toJSON();
      let readByArray = [];
      try {
        readByArray = JSON.parse(nObj.read_by || '[]');
      } catch(e) {}
      
      nObj.isRead = readByArray.includes(actualUserId);
      delete nObj.read_by; // don't send large arrays to frontend
      return nObj;
    });

    res.json(processed);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const actualUserId = decoded.userId;

    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ error: 'Not found' });

    let readByArray = [];
    try {
      readByArray = JSON.parse(notification.read_by || '[]');
    } catch(e) {}

    if (!readByArray.includes(actualUserId)) {
      readByArray.push(actualUserId);
      notification.read_by = JSON.stringify(readByArray);
      await notification.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const actualUserId = decoded.userId;

    const notifications = await Notification.findAll();
    for (const notification of notifications) {
      let readByArray = [];
      try {
        readByArray = JSON.parse(notification.read_by || '[]');
      } catch(e) {}
      
      if (!readByArray.includes(actualUserId)) {
        readByArray.push(actualUserId);
        notification.read_by = JSON.stringify(readByArray);
        await notification.save();
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

module.exports = router;
