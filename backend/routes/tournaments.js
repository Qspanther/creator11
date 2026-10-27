const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Tournament } = require('../db/models');
const { Op } = require('sequelize');

const router = express.Router();

// GET /tournaments — List all tournaments (optionally filter by platform)
router.get('/', authenticate, async (req, res) => {
  try {
    const { platform, status } = req.query;
    const where = {};
    if (platform && platform !== "all") where.platform = platform;
    else if (!platform) where.platform = "youtube";
    if (status) where.status = status;

    const tournaments = await Tournament.findAll({
      where,
      order: [['start_time', 'ASC']],
    });

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tournaments/:id — Get tournament details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tournaments/:id/contests — Get contests for a match
router.get('/:id/contests', authenticate, async (req, res) => {
  try {
    const { Contest } = require('../db/models');
    const contests = await Contest.findAll({
      where: { tournament_id: req.params.id },
      order: [['entry_fee', 'DESC']]
    });
    res.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
