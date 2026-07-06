const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Creator } = require('../db/models');

const router = express.Router();

// GET /creators — List creators with optional filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { platform, category, sort } = req.query;
    const where = {};
    if (platform) where.platform = platform;
    if (category) where.category = category;

    const order = [];
    if (sort === 'cost_asc') order.push(['credit_cost', 'ASC']);
    else if (sort === 'cost_desc') order.push(['credit_cost', 'DESC']);
    else if (sort === 'name') order.push(['name', 'ASC']);
    else order.push(['credit_cost', 'DESC']); // Default: most expensive first

    const creators = await Creator.findAll({ where, order });
    res.json(creators);
  } catch (error) {
    console.error('Error fetching creators:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /creators/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const creator = await Creator.findByPk(req.params.id);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    res.json(creator);
  } catch (error) {
    console.error('Error fetching creator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
