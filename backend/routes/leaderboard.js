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

    // 1. Fetch all registered teams directly from Team table
    const allTeams = await Team.findAll({
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

    // 2. If tournament is live or locked, and newly created teams are missing from Leaderboard, trigger immediate calculateScores
    const isLiveOrLocked = tournament.status === 'locked' || tournament.status === 'live' || tournament.status === 'completed';
    if (isLiveOrLocked && (entries.length < allTeams.length || entries.length === 0)) {
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
          limit: 1200,
        });
      } catch (err) {
        console.error('Error auto-syncing leaderboard scores:', err.message);
      }
    }

    // Fetch live creators performance strictly for this tournament
    const creatorsPerformance = await getTournamentCreatorsPerformance(tournamentId).catch(err => {
      console.error('Error fetching creators performance:', err);
      return [];
    });

    const canViewTeams = true; // Transparency: users can inspect any participant's team
    const entryFee = parseFloat(tournament.entry_fee) || 99;
    const standardRefund = Math.max(0, entryFee - 2);

    let formattedEntries = [];
    const teamIdsInFormatted = new Set();

    // Official rankings are ONLY revealed when contest is completed AND bot manager finalized rankings
    const isRankingsFinalized = tournament.status === 'completed' && Boolean(tournament.rankings_finalized);

    // 3. Map computed Leaderboard entries first
    if (entries.length > 0) {
      entries.forEach(e => {
        teamIdsInFormatted.add(e.team_id);
        const prizeAmt = isRankingsFinalized ? parseFloat(e.prize_amount || 0) : 0;
        const isRefund = prizeAmt < 100;
        formattedEntries.push({
          rank: isRankingsFinalized ? e.rank : null,
          teamId: e.team_id,
          userId: e.user_id,
          userName: e.user ? e.user.name : 'Competitor',
          userEmail: e.user_id === req.userId ? (e.user ? e.user.email : '') : undefined,
          totalPoints: parseFloat(e.total_points || 0),
          prizeAmount: prizeAmt,
          refundAmount: isRankingsFinalized ? (isRefund ? (prizeAmt > 0 ? prizeAmt : standardRefund) : 0) : 0,
          isRefund: isRankingsFinalized ? isRefund : false,
          platformFee: isRankingsFinalized && isRefund ? 2 : 0,
          isCurrentUser: e.user_id === req.userId,
          canViewTeam: true,
          status: tournament.status,
        });
      });
    }

    // 4. Ensure EVERY team from allTeams (human users, newly joined teams) is ALWAYS included!
    const missingTeams = allTeams.filter(t => !teamIdsInFormatted.has(t.id));
    missingTeams.forEach((t) => {
      teamIdsInFormatted.add(t.id);
      const isCurrent = t.user_id === req.userId;
      formattedEntries.push({
        rank: isRankingsFinalized ? formattedEntries.length + 1 : null,
        teamId: t.id,
        userId: t.user_id,
        userName: t.user ? t.user.name : (t.user_id ? 'Player ' + t.user_id.slice(0, 5) : 'Competitor'),
        userEmail: isCurrent ? (t.user ? t.user.email : '') : undefined,
        totalPoints: 0.0000,
        prizeAmount: 0,
        refundAmount: 0,
        isRefund: false,
        platformFee: 0,
        isCurrentUser: isCurrent,
        canViewTeam: true,
        status: tournament.status === 'upcoming' ? 'registered' : tournament.status,
      });
    });

    // 5. Accurate user rank and points calculation (rank hidden during live match)
    let userRank = null;
    let userPoints = null;
    let userPrize = null;

    const myEntry = formattedEntries.find(e => e.userId === req.userId);
    if (myEntry) {
      userRank = isRankingsFinalized ? myEntry.rank : null;
      userPoints = myEntry.totalPoints;
      userPrize = isRankingsFinalized ? myEntry.prizeAmount : null;
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
        rankingsFinalized: isRankingsFinalized,
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
