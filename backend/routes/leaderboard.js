const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Leaderboard, Team, User, Tournament } = require('../db/models');
const { calculateScores, getTournamentCreatorsPerformance } = require('../services/scoring-engine');

const router = express.Router();

// GET /leaderboard/:tournamentId — Get tournament leaderboard (Top 1200 participants) + Creators Performance
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
      limit: 1200,
    });

        // Auto-populate all bots and compute ranks/scores if locked, live, or completed with missing/incomplete leaderboard
    const shouldPopulateBots = tournament.status === 'locked' || tournament.status === 'live' || tournament.status === 'completed';
    if ((shouldPopulateBots && entries.length < 100) || (entries.length === 0 && tournament.status === 'live')) {
      try {
        const { registerStaggeredBots } = require('./bot-manager');
        await registerStaggeredBots(tournamentId);
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
          limit: 1200,
        });
      } catch (err) {
        console.error('Error auto-calculating leaderboard:', err);
      }
    }

    // Fetch live creators performance strictly for this tournament
    const creatorsPerformance = await getTournamentCreatorsPerformance(tournamentId).catch(err => {
      console.error('Error fetching creators performance:', err);
      return [];
    });

    const userEntry = entries.find(e => e.user_id === req.userId);
    const canViewTeams = true; // Transparency: users can inspect any participant's team in live or completed contests
    const entryFee = parseFloat(tournament.entry_fee) || 99;
    const standardRefund = Math.max(0, entryFee - 2);

    let formattedEntries = [];
    let userRank = null;
    let userPoints = null;
    let userPrize = null;

    if (entries.length > 0) {
      formattedEntries = entries.map(e => {
        const prizeAmt = parseFloat(e.prize_amount || 0);
        const isRefund = prizeAmt < 100;
        return {
          rank: e.rank,
          teamId: e.team_id,
          userId: e.user_id,
          userName: e.user ? e.user.name : 'Competitor',
          userEmail: e.user_id === req.userId ? (e.user ? e.user.email : '') : undefined,
          totalPoints: parseFloat(e.total_points || 0),
          prizeAmount: prizeAmt,
          refundAmount: isRefund ? (prizeAmt > 0 ? prizeAmt : standardRefund) : 0,
          isRefund,
          platformFee: isRefund ? 2 : 0,
          isCurrentUser: e.user_id === req.userId,
          canViewTeam: true,
          status: tournament.status,
        };
      });

      if (userEntry) {
        userRank = userEntry.rank;
        userPoints = parseFloat(userEntry.total_points || 0);
        userPrize = parseFloat(userEntry.prize_amount || 0);
      }
    } else {
      // ⚡ When leaderboard table has not been computed yet (e.g. upcoming tournament or freshly registered league),
      // fetch all registered teams directly from Team table so all competitors appear live in real-time!
      const registeredTeams = await Team.findAll({
        where: { tournament_id: tournamentId },
        order: [['created_at', 'ASC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'is_bot'],
          },
        ],
        limit: 1200,
      });

      formattedEntries = registeredTeams.map((t, idx) => {
        const isCurrent = t.user_id === req.userId;
        return {
          rank: idx + 1,
          teamId: t.id,
          userId: t.user_id,
          userName: t.user ? t.user.name : (t.user_id ? 'Player ' + t.user_id.slice(0, 5) : 'Competitor'),
          userEmail: isCurrent ? (t.user ? t.user.email : '') : undefined,
          totalPoints: 0.0000,
          prizeAmount: 0,
          refundAmount: standardRefund,
          isRefund: false,
          platformFee: 0,
          isCurrentUser: isCurrent,
          canViewTeam: true,
          status: 'registered',
        };
      });

      const userTeamIndex = registeredTeams.findIndex(t => t.user_id === req.userId);
      if (userTeamIndex !== -1) {
        userRank = userTeamIndex + 1;
        userPoints = 0.0000;
        userPrize = 0;
      }
    }

    const totalRegisteredCount = await Team.count({ where: { tournament_id: tournamentId } });
    const currentParticipants = Math.max(tournament.current_participants || 0, totalRegisteredCount, formattedEntries.length);
    if (tournament.current_participants !== currentParticipants) {
      tournament.update({ current_participants: currentParticipants }).catch(() => {});
    }

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
        entryFee: entryFee,
        currentParticipants: currentParticipants,
        rankingsFinalized: tournament.rankings_finalized !== false && tournament.rankings_finalized !== 0,
      },
      canViewTeams,
      entries: formattedEntries,
      creatorsPerformance,
      userRank,
      userPoints,
      userPrize,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
