const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const config = require('../config');
const { Team, TeamCreator, Creator, Tournament, Wallet, Transaction, User, SystemSetting } = require('../db/models');
const sequelize = require('../db/index');
const { getTeamScorecard } = require('../services/scoring-engine');
const smartEngine = require('../services/smart-engine');

const router = express.Router();

function isValidBotKey(providedKey) {
  if (!providedKey || typeof providedKey !== 'string' || !config.BOT_API_KEY) return false;
  try {
    const expected = crypto.createHash('sha256').update(String(config.BOT_API_KEY)).digest();
    const provided = crypto.createHash('sha256').update(String(providedKey)).digest();
    return crypto.timingSafeEqual(expected, provided);
  } catch (e) {
    return false;
  }
}

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
    const isBotBypass = isValidBotKey(req.headers['x-bot-api-key']) || req.user?.is_bot;
    const now = new Date();
    const isLocked = (tournament.lock_time && now >= new Date(tournament.lock_time)) ||
                     tournament.status === 'locked' ||
                     tournament.status === 'live' ||
                     tournament.status === 'completed';
    if (!isBotBypass && isLocked) {
      return res.status(400).json({ error: 'This tournament contest is locked. New team entries are closed.' });
    }

    // ★★★ TOURNAMENT ACCESS GATE: Free Mode vs (Subscription OR Share) ★★★
    if (!isBotBypass) {
      const subEnabledSetting = await SystemSetting.findOne({ where: { key: 'subscription_enabled' } });
      const isSubCheckEnabled = !subEnabledSetting || subEnabledSetting.value === 'true';

      // 1. Check Master Switch
      if (isSubCheckEnabled) {
        // 2. Check Free Access Mode
        const freeModeSetting = await SystemSetting.findOne({ where: { key: 'subscription_free_mode' } });
        const isFreeMode = freeModeSetting && freeModeSetting.value === 'true';

        // 3. Check Free Until Date
        const freeUntilSetting = await SystemSetting.findOne({ where: { key: 'subscription_free_until' } });
        const isWithinFreeWindow = freeUntilSetting?.value && new Date(freeUntilSetting.value) > now;

        // If not free for all, verify individual user pass or share progress
        if (!isFreeMode && !isWithinFreeWindow) {
          const user = await User.findByPk(req.userId);
          const isAdminUser = user && user.role === 'admin';
          const hasActivePass = user && user.subscription_active_until && new Date(user.subscription_active_until) > now;

          const targetSetting = await SystemSetting.findOne({ where: { key: 'share_unlock_target' } });
          const targetShares = targetSetting ? parseInt(targetSetting.value, 10) : 3;

          const totalShares = user ? (user.total_shares_count || 0) : 0;
          const totalReferrals = user ? (user.total_referrals_count || 0) : 0;
          const hasReachedShareTarget = Math.max(totalShares, totalReferrals) >= targetShares;

          if (!isAdminUser && !hasActivePass && !hasReachedShareTarget) {
            const priceSetting = await SystemSetting.findOne({ where: { key: 'subscription_monthly_price' } });
            const monthlyPrice = priceSetting ? parseFloat(priceSetting.value) : 199;

            return res.status(403).json({
              error: 'Ya toh Subscription lo ya fir doston ke saath website Share karo!',
              requiresSubscriptionOrShare: true,
              requiresSubscription: true,
              monthlyPrice,
              targetShares,
              totalShares,
              totalReferrals,
              sharesNeeded: Math.max(0, targetShares - Math.max(totalShares, totalReferrals)),
              referralCode: user ? user.referral_code : '',
              shareUrl: `${config.FRONTEND_URL}/signup?ref=${user?.referral_code || ''}`,
            });
          }
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

    // Smart Parallel DB Dispatch: Dedicated user_team lane with lock preemption & auto retry
    const teamResult = await smartEngine.execute('team', async () => {
      const t = await sequelize.transaction();
      try {
        const wallet = await Wallet.findOne({ where: { user_id: req.userId }, transaction: t });
        if (!wallet) {
          await t.rollback();
          return { errorStatus: 400, data: { error: 'Wallet not found' } };
        }

        const balance = parseFloat(wallet.balance) || 0;
        const tournamentFee = parseFloat(tournament.entry_fee);
        const entryFee = (!isNaN(tournamentFee) && tournamentFee >= 0) ? tournamentFee : 99.00;

        if (entryFee > 0 && balance < entryFee) {
          await t.rollback();
          return {
            errorStatus: 400,
            data: {
              error: `Insufficient wallet balance. ₹${entryFee.toFixed(2)} is required to lock and enter this contest, but your wallet balance is ₹${balance.toFixed(2)}.`,
              requiresDeposit: true,
              requiredAmount: entryFee,
              currentBalance: balance,
              redirectTo: `/wallet?required=${Math.ceil(entryFee)}`
            }
          };
        }

        // Deduct entry fee from user wallet balance
        if (entryFee > 0) {
          const newBalance = Math.max(0, balance - entryFee);
          await wallet.update({ balance: newBalance }, { transaction: t });
        }

        // Create entry fee transaction
        await Transaction.create({
          wallet_id: wallet.id,
          type: 'entry_fee',
          amount: -entryFee,
          status: 'completed',
          reference_tournament_id: tournamentId,
          description: `Contest Entry Fee (₹${entryFee.toLocaleString('en-IN')}) for "${tournament.name}"`,
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

        return {
          status: 201,
          data: {
            message: 'Team created successfully',
            team: {
              id: team.id,
              tournamentId: team.tournament_id,
              captainId: team.captain_creator_id,
              viceCaptainId: team.vice_captain_creator_id,
              creditsUsed: validation.totalCredits,
              creatorCount: creatorIds.length,
            },
          }
        };
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }, true);

    if (teamResult.errorStatus) {
      return res.status(teamResult.errorStatus).json(teamResult.data);
    }
    return res.status(teamResult.status || 201).json(teamResult.data);
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
    const isLocked = (tournament.lock_time && now >= new Date(tournament.lock_time)) ||
                     tournament.status === 'locked' ||
                     tournament.status === 'live' ||
                     tournament.status === 'completed' ||
                     team.is_locked;
    if (isLocked) {
      return res.status(400).json({ error: 'This tournament contest is locked. Cannot edit team.' });
    }

    const { creatorIds, captainId, viceCaptainId } = req.body;

    // Validate new team
    const validation = await validateTeam(creatorIds, captainId, viceCaptainId, tournament.platform);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Team validation failed', details: validation.errors });
    }

    // Smart Parallel DB Dispatch: Update team in user_team priority lane
    const editResult = await smartEngine.execute('team', async () => {
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

        return {
          message: 'Team updated successfully',
          team: {
            id: team.id,
            captainId,
            viceCaptainId,
            creditsUsed: validation.totalCredits,
          },
        };
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }, true);

    return res.json(editResult);
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
