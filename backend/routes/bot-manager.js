const express = require('express');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { User, Wallet, Tournament, Creator, Team, TeamCreator, Leaderboard, Score } = require('../db/models');
const { calculateScores } = require('../services/scoring-engine');
const sequelize = require('../db/index');

const router = express.Router();

// ─── API Key Middleware ───
function requireBotApiKey(req, res, next) {
  const apiKey = req.headers['x-bot-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== config.BOT_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing x-bot-api-key header'
    });
  }
  next();
}

router.use(requireBotApiKey);

/**
 * Validate team composition
 */
async function validateTeamComposition(creatorIds, captainId, viceCaptainId, tournamentPlatform) {
  const errors = [];

  if (creatorIds.length !== config.TOTAL_TEAM_SIZE) {
    errors.push(`Team must have exactly ${config.TOTAL_TEAM_SIZE} creators, got ${creatorIds.length}`);
  }

  const uniqueIds = new Set(creatorIds);
  if (uniqueIds.size !== creatorIds.length) {
    errors.push('Duplicate creators in team');
  }

  const creators = await Creator.findAll({ where: { id: creatorIds } });
  if (creators.length !== creatorIds.length) {
    errors.push(`Some creators not found. Expected ${creatorIds.length}, found ${creators.length}`);
  }

  const wrongPlatform = creators.filter(c => c.platform !== tournamentPlatform);
  if (wrongPlatform.length > 0) {
    errors.push(`All creators must be from ${tournamentPlatform}`);
  }

  const categoryCounts = {};
  for (const c of creators) {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  }

  let categoriesWithThree = 0;
  for (const cat of config.CATEGORIES) {
    const count = categoryCounts[cat] || 0;
    if (count > 3) {
      errors.push(`Category "${cat}" can have at most 3 creators, got ${count}`);
    } else if (count === 3) {
      categoriesWithThree++;
    }
    if (count < 2) {
      errors.push(`Category "${cat}" must have at least 2 creators, got ${count}`);
    }
  }

  if (categoriesWithThree > 1) {
    errors.push(`Only 1 category can have 3 creators. Found ${categoriesWithThree}`);
  } else if (categoriesWithThree < 1 && creatorIds.length === config.TOTAL_TEAM_SIZE) {
    errors.push('Exactly one category must have 3 creators (3+2+2+2+2)');
  }

  const totalCredits = creators.reduce((sum, c) => sum + parseFloat(c.credit_cost), 0);
  if (totalCredits > config.TOTAL_CREDITS) {
    errors.push(`Total credits ${totalCredits} exceeds limit of ${config.TOTAL_CREDITS}`);
  }

  if (captainId && !creatorIds.includes(captainId)) {
    errors.push('Captain must be a member of the team');
  }
  if (viceCaptainId && !creatorIds.includes(viceCaptainId)) {
    errors.push('Vice-captain must be a member of the team');
  }
  if (captainId && viceCaptainId && captainId === viceCaptainId) {
    errors.push('Captain and vice-captain must be different');
  }

  return { valid: errors.length === 0, errors, totalCredits };
}

// 1. GET /bot-manager/status — Overview of bot network & contests
router.get('/status', async (req, res) => {
  try {
    const totalBots = await User.count({ where: { is_bot: true } });
    const tournaments = await Tournament.findAll({
      attributes: ['id', 'name', 'status', 'start_time', 'end_time', 'current_participants']
    });

    res.json({
      success: true,
      botNetwork: {
        totalBots,
        botManagerApiKeyConfigured: true,
        specialPostContestAccess: 'ENABLED',
      },
      tournaments,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /bot-manager/bots — List all 300 registered bots
router.get('/bots', async (req, res) => {
  try {
    const bots = await User.findAll({
      where: { is_bot: true },
      attributes: ['id', 'name', 'email', 'role', 'created_at'],
      include: [
        { model: Wallet, as: 'wallet', attributes: ['balance'] }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      total: bots.length,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        email: b.email,
        walletBalance: b.wallet ? parseFloat(b.wallet.balance) : 0,
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. GET /bot-manager/tournaments — List all tournaments
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await Tournament.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, tournaments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST /bot-manager/create-team — SPECIAL ACCESS: Create team for a bot even if contest has ended!
router.post('/create-team', async (req, res) => {
  try {
    const { botUserId, tournamentId, creatorIds, captainId, viceCaptainId } = req.body;

    if (!botUserId || !tournamentId || !creatorIds || !captainId || !viceCaptainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: botUserId, tournamentId, creatorIds, captainId, viceCaptainId'
      });
    }

    // Verify user is a bot
    const botUser = await User.findByPk(botUserId);
    if (!botUser || !botUser.is_bot) {
      return res.status(403).json({ success: false, error: 'Target user is not a registered bot' });
    }

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    // ★★★ SPECIAL ACCESS: Lock-time and completed status check is intentionally BYPASSED for bots! ★★★
    console.log(`🤖 Bot Manager: Creating team for bot "${botUser.name}" in tournament "${tournament.name}" (Status: ${tournament.status})`);

    // Validate 11-creator lineup
    const validation = await validateTeamComposition(creatorIds, captainId, viceCaptainId, tournament.platform);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors });
    }

    // Check existing team
    let team = await Team.findOne({
      where: { user_id: botUserId, tournament_id: tournamentId }
    });

    const isUpdate = !!team;
    if (!team) {
      team = await Team.create({
        id: uuidv4(),
        user_id: botUserId,
        tournament_id: tournamentId,
        captain_creator_id: captainId,
        vice_captain_creator_id: viceCaptainId,
        is_locked: 1,
        total_credits_used: validation.totalCredits
      });
    } else {
      await team.update({
        captain_creator_id: captainId,
        vice_captain_creator_id: viceCaptainId,
        total_credits_used: validation.totalCredits,
        is_locked: 1
      });
      await TeamCreator.destroy({ where: { team_id: team.id } });
    }

    // Insert creators
    const teamCreatorRecords = creatorIds.map(cid => ({
      id: uuidv4(),
      team_id: team.id,
      creator_id: cid
    }));
    await TeamCreator.bulkCreate(teamCreatorRecords);

    // Update participants count if new
    if (!isUpdate) {
      await tournament.increment('current_participants');
    }

    // If tournament is live or completed, immediately compute scores
    if (tournament.status === 'live' || tournament.status === 'completed') {
      await calculateScores(tournament.id);
    }

    // Fetch bot's updated rank and score
    const entry = await Leaderboard.findOne({
      where: { tournament_id: tournamentId, user_id: botUserId }
    });

    res.json({
      success: true,
      message: `Team successfully ${isUpdate ? 'updated' : 'created'} for bot ${botUser.name}`,
      teamId: team.id,
      botName: botUser.name,
      tournamentStatus: tournament.status,
      rank: entry ? entry.rank : null,
      score: entry ? entry.total_points : null,
      prizeAmount: entry ? entry.prize_amount : null
    });
  } catch (error) {
    console.error('Bot team creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. POST /bot-manager/batch-join — Command multiple bots to generate teams and join (even completed contests!)
router.post('/batch-join', async (req, res) => {
  try {
    const { tournamentId, botCount = 10 } = req.body;

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    // Get YouTube or Instagram creators
    const creators = await Creator.findAll({ where: { platform: tournament.platform } });
    if (creators.length < config.TOTAL_TEAM_SIZE) {
      return res.status(400).json({ success: false, error: `Not enough creators for platform ${tournament.platform}` });
    }

    // Group creators by category
    const catMap = {};
    for (const c of creators) {
      catMap[c.category] = catMap[c.category] || [];
      catMap[c.category].push(c);
    }

    // Find all bots
    const allBots = await User.findAll({ where: { is_bot: true }, order: [['created_at', 'ASC']] });
    
    // Check which bots already have a team in this tournament
    const existingTeams = await Team.findAll({
      where: { tournament_id: tournamentId },
      attributes: ['user_id']
    });
    const joinedBotUserIds = new Set(existingTeams.map(t => t.user_id));

    // Filter bots available to join
    const eligibleBots = allBots.filter(b => !joinedBotUserIds.has(b.id));
    const targetBots = eligibleBots.slice(0, Math.min(botCount, eligibleBots.length));

    if (targetBots.length === 0) {
      return res.json({
        success: true,
        message: 'All available bots have already joined this tournament.',
        joinedCount: 0
      });
    }

    const categories = config.CATEGORIES;
    const createdTeams = [];

    for (let i = 0; i < targetBots.length; i++) {
      const bot = targetBots[i];
      // Pick category that gets 3 creators
      const threeCat = categories[i % categories.length];

      let selectedCreators = [];
      let totalCredits = 0;

      // Select creators adhering to category limits
      for (const cat of categories) {
        const pool = [...(catMap[cat] || [])];
        // Shuffle pool
        pool.sort(() => Math.random() - 0.5);
        const count = cat === threeCat ? 3 : 2;
        const picked = pool.slice(0, count);
        selectedCreators.push(...picked);
      }

      totalCredits = selectedCreators.reduce((sum, c) => sum + parseFloat(c.credit_cost), 0);

      // Pick Captain and Vice Captain
      selectedCreators.sort(() => Math.random() - 0.5);
      const captain = selectedCreators[0];
      const viceCaptain = selectedCreators[1];

      const teamId = uuidv4();
      await Team.create({
        id: teamId,
        user_id: bot.id,
        tournament_id: tournamentId,
        captain_creator_id: captain.id,
        vice_captain_creator_id: viceCaptain.id,
        is_locked: 1,
        total_credits_used: totalCredits
      });

      const teamCreators = selectedCreators.map(c => ({
        id: uuidv4(),
        team_id: teamId,
        creator_id: c.id
      }));
      await TeamCreator.bulkCreate(teamCreators);

      createdTeams.push({ botId: bot.id, botName: bot.name, teamId });
    }

    // Update current_participants count
    await tournament.increment('current_participants', { by: createdTeams.length });

    // Recalculate scores for entire tournament
    if (tournament.status === 'live' || tournament.status === 'completed') {
      await calculateScores(tournament.id);
    }

    res.json({
      success: true,
      message: `Successfully deployed ${createdTeams.length} bots into tournament "${tournament.name}" (Status: ${tournament.status})`,
      tournamentName: tournament.name,
      tournamentStatus: tournament.status,
      joinedCount: createdTeams.length,
      sampleTeams: createdTeams.slice(0, 5)
    });
  } catch (error) {
    console.error('Batch join error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /bot-manager/recalculate/:tournamentId — Trigger score recalculation
router.post('/recalculate/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await calculateScores(tournamentId);
    res.json({ success: true, message: `Scores recalculated for tournament ${tournamentId}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. GET /bot-manager/leaderboard/:tournamentId — Query leaderboard with API key
router.get('/leaderboard/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) return res.status(404).json({ success: false, error: 'Tournament not found' });

    const entries = await Leaderboard.findAll({
      where: { tournament_id: tournamentId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'is_bot'] },
        { model: Team, attributes: ['id', 'captain_creator_id', 'vice_captain_creator_id', 'total_credits_used'] }
      ],
      order: [['rank', 'ASC']],
      limit: 100
    });

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        prize_pool: tournament.prize_pool,
        current_participants: tournament.current_participants
      },
      totalRanked: entries.length,
      leaderboard: entries.map(e => ({
        rank: e.rank,
        teamId: e.team_id,
        userId: e.user_id,
        userName: e.user ? e.user.name : 'Unknown Player',
        isBot: e.user ? !!e.user.is_bot : false,
        totalPoints: parseFloat(e.total_points),
        prizeAmount: parseFloat(e.prize_amount || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
