const express = require('express');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { Tournament, Contest } = require('../db/models');
const { Op } = require('sequelize');

const router = express.Router();

// GET /tournaments — List all tournaments (optionally filter by platform)
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const { platform, status } = req.query;
    const where = {};
    if (platform && platform !== "all") where.platform = platform;
    else if (!platform) where.platform = "youtube";
    if (status) where.status = status;

    const tournaments = await Tournament.findAll({
      where,
      include: [{ model: Contest, as: 'contests' }],
      order: [['start_time', 'ASC']],
    });

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tournaments/:id — Get tournament details
router.get('/:id', optionalAuthenticate, async (req, res) => {
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
router.get('/:id/contests', optionalAuthenticate, async (req, res) => {
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

// GET /tournaments/:id/creators-performance — Get all creators' live performance for this league
router.get('/:id/creators-performance', optionalAuthenticate, async (req, res) => {
  try {
    const { getTournamentCreatorsPerformance } = require('../services/scoring-engine');
    const performance = await getTournamentCreatorsPerformance(req.params.id);
    res.json(performance);
  } catch (error) {
    console.error('Error fetching creators performance:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;
