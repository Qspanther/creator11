const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Leaderboard, Team, User } = require('../db/models');

const router = express.Router();

// GET /leaderboard/:tournamentId — Get tournament leaderboard
router.get('/:tournamentId', authenticate, async (req, res) => {
  try {
    const entries = await Leaderboard.findAll({
      where: { tournament_id: req.params.tournamentId },
      order: [['rank', 'ASC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
        },
      ],
      limit: 100,
    });

    // Check if current user's entry exists
    const userEntry = entries.find(e => e.user_id === req.userId);

    res.json({
      entries: entries.map(e => ({
        rank: e.rank,
        teamId: e.team_id,
        userId: e.user_id,
        userName: e.user ? e.user.name : 'Unknown',
        totalPoints: parseFloat(e.total_points),
        isCurrentUser: e.user_id === req.userId,
      })),
      userRank: userEntry ? userEntry.rank : null,
      userPoints: userEntry ? parseFloat(userEntry.total_points) : null,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
