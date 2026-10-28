const express = require('express');
const { authenticate } = require('../middleware/auth');
const config = require('../config');
const { Team, TeamCreator, Creator, Tournament, Wallet, Transaction, User, SystemSetting } = require('../db/models');
const sequelize = require('../db/index');
const { getTeamScorecard } = require('../services/scoring-engine');

const router = express.Router();

/**
 * Validate team composition:
 * - Exactly TOTAL_TEAM_SIZE creators
 * - Exactly CREATORS_PER_CATEGORY per category
 * - Total credit cost <= TOTAL_CREDITS
 * - Captain and vice-captain must be in the team
 * - All creators must be from the correct platform
 */
async function validateTeam(creatorIds, captainId, viceCaptainId, tournamentPlatform) {
  const errors = [];

  // Check total count
  if (creatorIds.length !== config.TOTAL_TEAM_SIZE) {
    errors.push(`Team must have exactly ${config.TOTAL_TEAM_SIZE} creators, got ${creatorIds.length}`);
  }

  // Check for duplicates
  const uniqueIds = new Set(creatorIds);
  if (uniqueIds.size !== creatorIds.length) {
    errors.push('Duplicate creators in team');
  }

  // Fetch all creators
  const creators = await Creator.findAll({
    where: { id: creatorIds },
  });

  if (creators.length !== creatorIds.length) {
    errors.push(`Some creators not found. Expected ${creatorIds.length}, found ${creators.length}`);
  }

  // Check platform
  const wrongPlatform = creators.filter(c => c.platform !== tournamentPlatform);
  if (wrongPlatform.length > 0) {
    errors.push(`All creators must be from ${tournamentPlatform}. Wrong platform: ${wrongPlatform.map(c => c.name).join(', ')}`);
  }

  // Check category distribution
  const categoryCounts = {};
  for (const creator of creators) {
    categoryCounts[creator.category] = (categoryCounts[creator.category] || 0) + 1;
  }

  let categoriesWithThree = 0;
  for (const category of config.CATEGORIES) {
    const count = categoryCounts[category] || 0;
    if (count > 3) {
      errors.push(`Category "${category}" can have at most 3 creators, got ${count}`);
    } else if (count === 3) {
      categoriesWithThree++;
    }
    if (count < 2) {
      errors.push(`Category "${category}" must have at least 2 creators, got ${count}`);
    }
  }

  if (categoriesWithThree > 1) {
    errors.push(`Only 1 category can have 3 creators. Found ${categoriesWithThree} categories with 3 creators.`);
  } else if (categoriesWithThree < 1 && creatorIds.length === config.TOTAL_TEAM_SIZE) {
    errors.push('Exactly one category must have 3 creators to complete the 11-player lineup (3 + 2 + 2 + 2 + 2).');
  }

  // Check total credits
  const totalCredits = creators.reduce((sum, c) => sum + parseFloat(c.credit_cost), 0);
  if (totalCredits > config.TOTAL_CREDITS) {
    errors.push(`Total credits ${totalCredits} exceeds limit of ${config.TOTAL_CREDITS}`);
  }

  // Check captain/vc
  if (captainId && !creatorIds.includes(captainId)) {
    errors.push('Captain must be a member of the team');
  }
  if (viceCaptainId && !creatorIds.includes(viceCaptainId)) {
    errors.push('Vice-captain must be a member of the team');
  }
  if (captainId && viceCaptainId && captainId === viceCaptainId) {
    errors.push('Captain and vice-captain must be different creators');
  }

  return { valid: errors.length === 0, errors, totalCredits };
}

// POST /teams — Create a new team for a tournament
router.post('/', authenticate, async (req, res) => {
  try {
    const { tournamentId, creatorIds, captainId, viceCaptainId } = req.body;

    // Check tournament exists and is joinable
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Server-side lock time check — never trust client (unless authorized bot with API key)
    const isBotBypass = (req.headers['x-bot-api-key'] === config.BOT_API_KEY) || req.user?.is_bot;
    const now = new Date();
    if (!isBotBypass && now >= new Date(tournament.lock_time)) {
      return res.status(400).json({ error: 'Tournament is locked. Cannot create or edit teams.' });
    }

    // ★★★ TOURNAMENT ACCESS GATE: Check Active Subscription or Referral Pass ★★★
    if (!isBotBypass) {
      const subEnabledSetting = await SystemSetting.findOne({ where: { key: 'subscription_enabled' } });
      const isSubCheckEnabled = !subEnabledSetting || subEnabledSetting.value === 'true';

      if (isSubCheckEnabled) {
        const user = await User.findByPk(req.userId);
        const hasActivePass = user && user.subscription_active_until && new Date(user.subscription_active_until) > now;
        if (!hasActivePass && user?.role !== 'admin') {
          const priceSetting = await SystemSetting.findOne({ where: { key: 'subscription_monthly_price' } });
          const monthlyPrice = priceSetting ? parseFloat(priceSetting.value) : 199;

          const round = user ? user.referral_round || 1 : 1;
          const targetSetting = await SystemSetting.findOne({ where: { key: `referral_round_${round}_target` } });
          const daysSetting = await SystemSetting.findOne({ where: { key: `referral_round_${round}_days` } });

          const target = targetSetting ? parseInt(targetSetting.value) : 2;
          const rewardDays = daysSetting ? parseInt(daysSetting.value) : 15;

          return res.status(403).json({
            error: 'Active Monthly Subscription or Referral Pass required to enter tournaments.',
            requiresSubscription: true,
            monthlyPrice,
            referralCode: user ? user.referral_code : '',
            referralRound: round,
            referralsInRound: user ? user.referrals_in_current_round || 0 : 0,
            targetForRound: target,
            rewardDaysForRound: rewardDays,
          });
        }
      }
    }

    // Check if user already has a team for this tournament
    const existingTeam = await Team.findOne({
      where: { user_id: req.userId, tournament_id: tournamentId },
    });
    if (existingTeam) {
      return res.status(409).json({ error: 'You already have a team for this tournament. Use PUT to edit.' });
    }

    // Validate team composition
    const validation = await validateTeam(creatorIds, captainId, viceCaptainId, tournament.platform);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Team validation failed', details: validation.errors });
    }

    // Check wallet balance and deduct entry fee
    const t = await sequelize.transaction();
    try {
      const wallet = await Wallet.findOne({ where: { user_id: req.userId }, transaction: t });
      if (!wallet) {
        await t.rollback();
        return res.status(400).json({ error: 'Wallet not found' });
      }

      const balance = parseFloat(wallet.balance) || 0;
      const entryFee = 99.00; // Strictly ₹99 INR for all tournaments

      if (balance < entryFee) {
        await t.rollback();
        return res.status(400).json({
          error: `Insufficient wallet balance. ₹99.00 is required to lock and enter this contest, but your wallet balance is ₹${balance.toFixed(2)}.`,
          requiresDeposit: true,
          requiredAmount: 99.00,
          currentBalance: balance,
          redirectTo: '/wallet?required=99'
        });
      }

      // Deduct entry fee
      await wallet.update({ balance: balance - entryFee }, { transaction: t });

      // Create entry fee transaction
      await Transaction.create({
        wallet_id: wallet.id,
        type: 'entry_fee',
        amount: -entryFee,
        status: 'completed',
        reference_tournament_id: tournamentId,
        description: `Entry fee (₹99.00) for ${tournament.name}`,
      }, { transaction: t });

      // Create team
      const team = await Team.create({
        user_id: req.userId,
        tournament_id: tournamentId,
        captain_creator_id: captainId,
        vice_captain_creator_id: viceCaptainId,
        is_locked: false,
        total_credits_used: validation.totalCredits,
      }, { transaction: t });

      // Create team-creator associations
      const teamCreators = creatorIds.map(cid => ({
        team_id: team.id,
        creator_id: cid,
      }));
      await TeamCreator.bulkCreate(teamCreators, { transaction: t });

      // Increment tournament participant count
      await tournament.increment('current_participants', { transaction: t });

      await t.commit();

      res.status(201).json({
        message: 'Team created successfully',
        team: {
          id: team.id,
          tournamentId: team.tournament_id,
          captainId: team.captain_creator_id,
          viceCaptainId: team.vice_captain_creator_id,
          creditsUsed: validation.totalCredits,
          creatorCount: creatorIds.length,
        },
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /teams/:id — Edit a team (before lock time only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    if (team.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not your team' });
    }

    const tournament = await Tournament.findByPk(team.tournament_id);

    // Server-side lock time check — never trust client
    const now = new Date();
    if (now >= new Date(tournament.lock_time) || team.is_locked) {
      return res.status(400).json({ error: 'Tournament is locked. Cannot edit team.' });
    }

    const { creatorIds, captainId, viceCaptainId } = req.body;

    // Validate new team
    const validation = await validateTeam(creatorIds, captainId, viceCaptainId, tournament.platform);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Team validation failed', details: validation.errors });
    }

    // Update team
    const t = await sequelize.transaction();
    try {
      // Remove old team-creator associations
      await TeamCreator.destroy({ where: { team_id: team.id }, transaction: t });

      // Create new associations
      const teamCreators = creatorIds.map(cid => ({
        team_id: team.id,
        creator_id: cid,
      }));
      await TeamCreator.bulkCreate(teamCreators, { transaction: t });

      // Update captain/vc
      await team.update({
        captain_creator_id: captainId,
        vice_captain_creator_id: viceCaptainId,
        total_credits_used: validation.totalCredits,
      }, { transaction: t });

      await t.commit();

      res.json({
        message: 'Team updated successfully',
        team: {
          id: team.id,
          captainId,
          viceCaptainId,
          creditsUsed: validation.totalCredits,
        },
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Edit team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /teams/:id/score — Full transparent live scorecard for a team
router.get('/:id/score', authenticate, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id, {
      include: [{ model: Tournament, as: 'Tournament' }],
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const tournament = team.Tournament;
    const isOwner = team.user_id === req.userId;
    const canView = isOwner || tournament.status === 'completed' || tournament.status === 'live';

    if (!canView) {
      return res.status(403).json({
        error: 'Team lineups and scorecards remain hidden until the tournament goes live to protect competitive tactics.',
      });
    }

    const scorecard = await getTeamScorecard(team.id);
    if (!scorecard) {
      return res.status(404).json({ error: 'Scorecard could not be calculated' });
    }

    res.json(scorecard);
  } catch (error) {
    console.error('Get team scorecard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /teams/:id — Get team details (allows viewing other users' teams once contest starts or completes)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id, {
      include: [
        {
          model: TeamCreator,
          as: 'teamCreators',
          include: [{ model: Creator, as: 'creator' }],
        },
        { model: Tournament, as: 'Tournament' },
        { model: User, as: 'User', attributes: ['id', 'name'] },
      ],
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const isOwner = team.user_id === req.userId;
    const canView = isOwner || team.Tournament.status === 'completed' || team.Tournament.status === 'live';

    if (!canView) {
      return res.status(403).json({
        error: 'Lineup hidden until tournament starts',
      });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /teams/tournament/:tournamentId — Get user's team for a specific tournament
router.get('/tournament/:tournamentId', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({
      where: {
        user_id: req.userId,
        tournament_id: req.params.tournamentId,
      },
      include: [
        {
          model: TeamCreator,
          as: 'teamCreators',
          include: [{ model: Creator, as: 'creator' }],
        },
      ],
    });

    if (!team) {
      return res.status(404).json({ error: 'No team found for this tournament' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team by tournament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /teams — Get all teams for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const teams = await Team.findAll({
      where: { user_id: req.userId },
      include: [
        { model: Tournament, as: 'Tournament' },
        {
          model: TeamCreator,
          as: 'teamCreators',
          include: [{ model: Creator, as: 'creator' }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
