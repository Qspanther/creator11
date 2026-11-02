const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Notification } = require('../db/models');

const router = express.Router();

// Fetch notifications for the user (only within last 30 days, auto-purging older entries)
router.get('/', authenticate, async (req, res) => {
  try {
    const actualUserId = req.userId;
    const { Op } = require('sequelize');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Auto-purge notifications older than 30 days
    await Notification.destroy({
      where: {
        createdAt: { [Op.lt]: thirtyDaysAgo }
      }
    }).catch(() => {});

    const notifications = await Notification.findAll({
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      order: [['createdAt', 'DESC']],
      limit: 200
    });

    // We need to parse read_by to see if it's read by this user
    const processed = notifications.map(n => {
      const nObj = n.toJSON();
      let readByArray = [];
      try {
        readByArray = JSON.parse(nObj.read_by || '[]');
      } catch (e) {}
      
      const isRead = readByArray.includes(actualUserId);
      nObj.isRead = isRead;
      nObj.is_read = isRead;
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
    const actualUserId = req.userId;

    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ error: 'Not found' });

    let readByArray = [];
    try {
      readByArray = JSON.parse(notification.read_by || '[]');
    } catch (e) {}

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
    const actualUserId = req.userId;

    const notifications = await Notification.findAll();
    for (const notification of notifications) {
      let readByArray = [];
      try {
        readByArray = JSON.parse(notification.read_by || '[]');
      } catch (e) {}
      
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