const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Leaderboard, Team, User, Tournament } = require('../db/models');
const { calculateScores } = require('../services/scoring-engine');

const router = express.Router();

// GET /leaderboard/:tournamentId — Get tournament leaderboard (Top 100 winners)
router.get('/:tournamentId', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const tournament = await Tournament.findByPk(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    let entries = await Leaderboard.findAll({
      where: { tournament_id: tournamentId },
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

    // Auto-compute scores if live or completed and no leaderboard entries yet
    if (entries.length === 0 && (tournament.status === 'live' || tournament.status === 'completed')) {
      try {
        await calculateScores(tournamentId);
        entries = await Leaderboard.findAll({
          where: { tournament_id: tournamentId },
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
      } catch (err) {
        console.error('Error auto-calculating leaderboard:', err);
      }
    }

    const userEntry = entries.find(e => e.user_id === req.userId);
    const canViewTeams = tournament.status === 'completed' || tournament.status === 'live';

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        platform: tournament.platform,
        status: tournament.status,
        startTime: tournament.start_time,
        endTime: tournament.end_time,
        lockTime: tournament.lock_time,
        prizePool: parseFloat(tournament.prize_pool) || 0,
        entryFee: parseFloat(tournament.entry_fee) || 0,
        currentParticipants: tournament.current_participants || entries.length,
      },
      canViewTeams,
      entries: entries.map(e => ({
        rank: e.rank,
        teamId: e.team_id,
        userId: e.user_id,
        userName: e.user ? e.user.name : 'Unknown User',
        totalPoints: parseFloat(e.total_points),
        prizeAmount: parseFloat(e.prize_amount || 0),
        isCurrentUser: e.user_id === req.userId,
        canViewTeam: canViewTeams || e.user_id === req.userId,
      })),
      userRank: userEntry ? userEntry.rank : null,
      userPoints: userEntry ? parseFloat(userEntry.total_points) : null,
      userPrize: userEntry ? parseFloat(userEntry.prize_amount || 0) : 0,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
