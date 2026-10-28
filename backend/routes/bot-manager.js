const express = require('express');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const {
  User,
  Wallet,
  Tournament,
  Creator,
  Team,
  TeamCreator,
  CreatorStatsSnapshot,
  Leaderboard,
  Score,
  BotWinHistory
} = require('../db/models');
const { calculateScores } = require('../services/scoring-engine');
const sequelize = require('../db/index');
const { Op } = require('sequelize');

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
      attributes: ['id', 'name', 'status', 'start_time', 'end_time', 'current_participants', 'rankings_finalized']
    });

    res.json({
      success: true,
      botNetwork: {
        totalBots,
        botManagerApiKeyConfigured: true,
        specialPostContestAccess: 'ENABLED',
        fairRotationEngine: 'ACTIVE',
      },
      tournaments,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /bot-manager/schedule — Real-time schedule analysis for the Bot Manager Daemon
router.get('/schedule', async (req, res) => {
  try {
    const now = new Date();

    const upcoming = await Tournament.findAll({
      where: {
        status: 'upcoming',
        start_time: { [Op.gt]: now }
      },
      order: [['start_time', 'ASC']],
      limit: 3
    });

    const live = await Tournament.findAll({
      where: { status: 'live' },
      order: [['end_time', 'ASC']]
    });

    const completed = await Tournament.findAll({
      where: { status: 'completed' },
      order: [['end_time', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      currentTime: now.toISOString(),
      liveContests: live.map(t => ({
        id: t.id,
        name: t.name,
        endTime: t.end_time,
        minutesRemaining: Math.max(0, Math.round((new Date(t.end_time) - now) / 60000)),
        participants: t.current_participants,
        rankingsFinalized: t.rankings_finalized
      })),
      upcomingContests: upcoming.map(t => ({
        id: t.id,
        name: t.name,
        startTime: t.start_time,
        minutesUntilStart: Math.max(0, Math.round((new Date(t.start_time) - now) / 60000)),
        participants: t.current_participants
      })),
      completedContests: completed.map(t => ({
        id: t.id,
        name: t.name,
        endTime: t.end_time,
        participants: t.current_participants,
        rankingsFinalized: t.rankings_finalized
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. GET /bot-manager/bots — List all 300 registered bots
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

// 4. GET /bot-manager/winners-history — List past bot winners to inspect rotation
router.get('/winners-history', async (req, res) => {
  try {
    const history = await BotWinHistory.findAll({
      order: [['created_at', 'DESC']],
      limit: 50
    });

    // Count wins per bot
    const winCounts = {};
    for (const h of history) {
      if (h.rank === 1) {
        winCounts[h.bot_user_id] = (winCounts[h.bot_user_id] || 0) + 1;
      }
    }

    res.json({
      success: true,
      totalRecorded: history.length,
      history,
      winCounts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. POST /bot-manager/create-team — SPECIAL ACCESS: Create team for individual bot
router.post('/create-team', async (req, res) => {
  try {
    const { botUserId, tournamentId, creatorIds, captainId, viceCaptainId } = req.body;

    if (!botUserId || !tournamentId || !creatorIds || !captainId || !viceCaptainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: botUserId, tournamentId, creatorIds, captainId, viceCaptainId'
      });
    }

    const botUser = await User.findByPk(botUserId);
    if (!botUser || !botUser.is_bot) {
      return res.status(403).json({ success: false, error: 'Target user is not a registered bot' });
    }

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    const validation = await validateTeamComposition(creatorIds, captainId, viceCaptainId, tournament.platform);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors });
    }

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

    const teamCreatorRecords = creatorIds.map(cid => ({
      id: uuidv4(),
      team_id: team.id,
      creator_id: cid
    }));
    await TeamCreator.bulkCreate(teamCreatorRecords);

    if (!isUpdate) {
      await tournament.increment('current_participants');
    }

    if (tournament.status === 'live' || tournament.status === 'completed') {
      await calculateScores(tournament.id);
    }

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

// 6. POST /bot-manager/batch-join — Command multiple bots to join
router.post('/batch-join', async (req, res) => {
  try {
    const { tournamentId, botCount = 10 } = req.body;

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    const creators = await Creator.findAll({ where: { platform: tournament.platform } });
    if (creators.length < config.TOTAL_TEAM_SIZE) {
      return res.status(400).json({ success: false, error: `Not enough creators for platform ${tournament.platform}` });
    }

    const catMap = {};
    for (const c of creators) {
      catMap[c.category] = catMap[c.category] || [];
      catMap[c.category].push(c);
    }

    const allBots = await User.findAll({ where: { is_bot: true }, order: [['created_at', 'ASC']] });
    
    const existingTeams = await Team.findAll({
      where: { tournament_id: tournamentId },
      attributes: ['user_id']
    });
    const joinedBotUserIds = new Set(existingTeams.map(t => t.user_id));

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
      const threeCat = categories[i % categories.length];

      let selectedCreators = [];
      let totalCredits = 0;

      for (const cat of categories) {
        const pool = [...(catMap[cat] || [])];
        pool.sort(() => Math.random() - 0.5);
        const count = cat === threeCat ? 3 : 2;
        const picked = pool.slice(0, count);
        selectedCreators.push(...picked);
      }

      totalCredits = selectedCreators.reduce((sum, c) => sum + parseFloat(c.credit_cost), 0);

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

    await tournament.increment('current_participants', { by: createdTeams.length });

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

// 7. POST /bot-manager/deploy-300-autonomous — ★★★ MASTER FAIR-ROTATION ENGINE ★★★
// Commands all 300 bots to build teams with anti-monopoly fair rotation so that
// every bot gets a chance to reach the top, and rankings look 100% natural & random!
router.post('/deploy-300-autonomous', async (req, res) => {
  try {
    const { tournamentId } = req.body;

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    console.log(`🤖 [BotManager] Initiating Autonomous 300-Bot Deployment for tournament: "${tournament.name}"...`);

    // Lock tournament rankings while processing so frontend shows finalizing banner
    await tournament.update({ rankings_finalized: false });

    // 1. Fetch all 300 registered bots
    const allBots = await User.findAll({
      where: { is_bot: true },
      order: [['created_at', 'ASC']]
    });

    if (allBots.length < 300) {
      console.warn(`⚠️ Expected 300 bots, found ${allBots.length}. Using all available.`);
    }

    // 2. Fetch recent winners from bot_win_history to enforce rotation & anti-monopoly
    const pastTop10 = await BotWinHistory.findAll({
      where: { rank: { [Op.lte]: 10 } },
      order: [['created_at', 'DESC']],
      limit: 30
    });
    const recentWinnerBotIds = new Set(pastTop10.map(h => h.bot_user_id));

    // Candidates for Tier 1 (Rank 1-10): bots that haven't won recently
    let eligibleForTop = allBots.filter(b => !recentWinnerBotIds.has(b.id));
    if (eligibleForTop.length < 10) {
      eligibleForTop = [...allBots]; // fallback if all have won
    }

    // Shuffle eligible bots to pick this tournament's Top 10
    eligibleForTop.sort(() => Math.random() - 0.5);
    const top10Bots = eligibleForTop.slice(0, 10);
    const top10Ids = new Set(top10Bots.map(b => b.id));

    // Remaining bots for other tiers
    const remainingBots = allBots.filter(b => !top10Ids.has(b.id));
    remainingBots.sort(() => Math.random() - 0.5);

    const tier2Bots = remainingBots.slice(0, 40);   // Rank 11-50
    const tier3Bots = remainingBots.slice(40, 90);  // Rank 51-100
    const tier4Bots = remainingBots.slice(90, 190); // Rank 101-200
    const tier5Bots = remainingBots.slice(190);     // Rank 201-300

    // 3. Analyze creator delta performance for this tournament
    const startSnaps = await CreatorStatsSnapshot.findAll({
      where: { tournament_id: tournamentId, snapshot_type: 'start' }
    });
    const endSnaps = await CreatorStatsSnapshot.findAll({
      where: { tournament_id: tournamentId, snapshot_type: 'end' }
    });

    const startMap = {};
    startSnaps.forEach(s => { startMap[s.creator_id] = s; });

    const endMap = {};
    endSnaps.forEach(s => { endMap[s.creator_id] = s; });

    const creators = await Creator.findAll({ where: { platform: tournament.platform } });

    // Score and rank creators in each category
    const catCreators = {};
    for (const c of creators) {
      catCreators[c.category] = catCreators[c.category] || [];
      const s = startMap[c.id];
      const e = endMap[c.id];
      let deltaScore = 0;
      if (s && e) {
        const dv = Math.max(0, e.views - s.views);
        const dl = Math.max(0, e.likes - s.likes);
        const ds = Math.max(0, e.followers - s.followers);
        deltaScore = (dv * 0.001) + (dl * 0.002) + (ds * 0.01);
      }
      catCreators[c.category].push({
        id: c.id,
        name: c.name,
        category: c.category,
        credit_cost: parseFloat(c.credit_cost),
        deltaScore
      });
    }

    // Sort creators by delta score descending in each category
    for (const cat of Object.keys(catCreators)) {
      catCreators[cat].sort((a, b) => b.deltaScore - a.deltaScore);
    }

    // Clear previous bot teams for this tournament if any
    const botUserIds = allBots.map(b => b.id);
    const oldTeams = await Team.findAll({
      where: { tournament_id: tournamentId, user_id: botUserIds },
      attributes: ['id']
    });
    if (oldTeams.length > 0) {
      const otids = oldTeams.map(t => t.id);
      await TeamCreator.destroy({ where: { team_id: otids } });
      await Team.destroy({ where: { id: otids } });
    }

    const categories = config.CATEGORIES;
    const newTeamRecords = [];
    const newTeamCreatorRecords = [];

    // Helper: generate lineup based on tier
    function buildLineupForTier(tierIndex, subIndex) {
      const threeCat = categories[(tierIndex + subIndex) % categories.length];
      const selected = [];

      for (const cat of categories) {
        const pool = [...catCreators[cat]];
        const count = cat === threeCat ? 3 : 2;

        if (tierIndex === 1) {
          // Tier 1: Pick top performers
          selected.push(...pool.slice(0, count));
        } else if (tierIndex === 2) {
          // Tier 2: Mostly top performers with 1 mid
          const shuffledTop = pool.slice(0, 3).sort(() => Math.random() - 0.5);
          selected.push(...shuffledTop.slice(0, count));
        } else if (tierIndex === 3) {
          // Tier 3: Balanced mix
          pool.sort(() => Math.random() - 0.5);
          selected.push(...pool.slice(0, count));
        } else if (tierIndex === 4) {
          // Tier 4: Average performers
          pool.reverse();
          pool.sort(() => Math.random() - 0.3);
          selected.push(...pool.slice(0, count));
        } else {
          // Tier 5: Underdog performers
          pool.reverse();
          selected.push(...pool.slice(0, count));
        }
      }

      // Sort selected by delta score to assign Captain and Vice-Captain
      selected.sort((a, b) => b.deltaScore - a.deltaScore);

      let captain, viceCaptain;
      if (tierIndex === 1) {
        // Rank 1 gets the absolute highest delta scorer as Captain
        if (subIndex === 0) {
          captain = selected[0];
          viceCaptain = selected[1];
        } else {
          // Slight permutations for Rank 2-10
          captain = selected[subIndex % 2];
          viceCaptain = selected[(subIndex % 2) + 1] || selected[2];
        }
      } else {
        // Random captain/VC from top 4 in their lineup
        const topPool = selected.slice(0, 4).sort(() => Math.random() - 0.5);
        captain = topPool[0];
        viceCaptain = topPool[1] || selected[1];
      }

      const totalCredits = selected.reduce((sum, c) => sum + c.credit_cost, 0);
      return { creators: selected, captain, viceCaptain, totalCredits };
    }

    // Build teams for Tier 1 (Rotated Top 10 Winners!)
    top10Bots.forEach((bot, idx) => {
      const { creators: lineup, captain, viceCaptain, totalCredits } = buildLineupForTier(1, idx);
      const teamId = uuidv4();
      newTeamRecords.push({
        id: teamId,
        user_id: bot.id,
        tournament_id: tournamentId,
        captain_creator_id: captain.id,
        vice_captain_creator_id: viceCaptain.id,
        is_locked: 1,
        total_credits_used: totalCredits
      });
      lineup.forEach(c => {
        newTeamCreatorRecords.push({
          id: uuidv4(),
          team_id: teamId,
          creator_id: c.id
        });
      });
    });

    // Build teams for Tier 2 (Ranks 11-50)
    tier2Bots.forEach((bot, idx) => {
      const { creators: lineup, captain, viceCaptain, totalCredits } = buildLineupForTier(2, idx);
      const teamId = uuidv4();
      newTeamRecords.push({
        id: teamId,
        user_id: bot.id,
        tournament_id: tournamentId,
        captain_creator_id: captain.id,
        vice_captain_creator_id: viceCaptain.id,
        is_locked: 1,
        total_credits_used: totalCredits
      });
      lineup.forEach(c => {
        newTeamCreatorRecords.push({ id: uuidv4(), team_id: teamId, creator_id: c.id });
      });
    });

    // Build teams for Tier 3 (Ranks 51-100)
    tier3Bots.forEach((bot, idx) => {
      const { creators: lineup, captain, viceCaptain, totalCredits } = buildLineupForTier(3, idx);
      const teamId = uuidv4();
      newTeamRecords.push({
        id: teamId,
        user_id: bot.id,
        tournament_id: tournamentId,
        captain_creator_id: captain.id,
        vice_captain_creator_id: viceCaptain.id,
        is_locked: 1,
        total_credits_used: totalCredits
      });
      lineup.forEach(c => {
        newTeamCreatorRecords.push({ id: uuidv4(), team_id: teamId, creator_id: c.id });
      });
    });

    // Build teams for Tier 4 (Ranks 101-200)
    tier4Bots.forEach((bot, idx) => {
      const { creators: lineup, captain, viceCaptain, totalCredits } = buildLineupForTier(4, idx);
      const teamId = uuidv4();
      newTeamRecords.push({
        id: teamId,
        user_id: bot.id,
        tournament_id: tournamentId,
        captain_creator_id: captain.id,
        vice_captain_creator_id: viceCaptain.id,
        is_locked: 1,
        total_credits_used: totalCredits
      });
      lineup.forEach(c => {
        newTeamCreatorRecords.push({ id: uuidv4(), team_id: teamId, creator_id: c.id });
      });
    });

    // Build teams for Tier 5 (Ranks 201-300)
    tier5Bots.forEach((bot, idx) => {
      const { creators: lineup, captain, viceCaptain, totalCredits } = buildLineupForTier(5, idx);
      const teamId = uuidv4();
      newTeamRecords.push({
        id: teamId,
        user_id: bot.id,
        tournament_id: tournamentId,
        captain_creator_id: captain.id,
        vice_captain_creator_id: viceCaptain.id,
        is_locked: 1,
        total_credits_used: totalCredits
      });
      lineup.forEach(c => {
        newTeamCreatorRecords.push({ id: uuidv4(), team_id: teamId, creator_id: c.id });
      });
    });

    // Bulk insert all 300 teams and relationships
    console.log(`⚡ Bulk saving ${newTeamRecords.length} bot teams...`);
    await Team.bulkCreate(newTeamRecords);
    await TeamCreator.bulkCreate(newTeamCreatorRecords);

    // Update participants count
    await tournament.update({
      current_participants: newTeamRecords.length
    });

    // Calculate official scores for the tournament
    console.log(`🧮 Calculating official leaderboard scores for ${tournament.name}...`);
    await calculateScores(tournament.id);

    // Record new Top 10 into bot_win_history
    const newLeaderboard = await Leaderboard.findAll({
      where: { tournament_id: tournamentId },
      order: [['rank', 'ASC']],
      limit: 10
    });

    const winHistoryRecords = newLeaderboard.map(entry => ({
      id: uuidv4(),
      bot_user_id: entry.user_id,
      tournament_id: tournamentId,
      rank: entry.rank,
      points: entry.total_points
    }));
    await BotWinHistory.bulkCreate(winHistoryRecords);

    // ★★★ UNLOCK RANKINGS: Set rankings_finalized = true! ★★★
    await tournament.update({ rankings_finalized: true });

    const topWinner = newLeaderboard[0];
    const winnerUser = await User.findByPk(topWinner.user_id);

    console.log(`🏆 [BotManager] Contest finalized! Winner: "${winnerUser ? winnerUser.name : 'Bot'}" (Rank #1 with ${topWinner.total_points} pts)`);

    res.json({
      success: true,
      message: `Successfully executed 300-Bot Autonomous Deployment with Fair Winner Rotation!`,
      tournamentName: tournament.name,
      totalTeams: newTeamRecords.length,
      rankingsFinalized: true,
      winner: {
        botName: winnerUser ? winnerUser.name : 'Bot Winner',
        rank: 1,
        points: topWinner.total_points,
        prize: topWinner.prize_amount
      },
      top10Lineup: newLeaderboard.map(e => ({
        rank: e.rank,
        userId: e.user_id,
        points: e.total_points
      }))
    });
  } catch (error) {
    console.error('Error in deploy-300-autonomous:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. POST /bot-manager/recalculate/:tournamentId — Trigger score recalculation
router.post('/recalculate/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await calculateScores(tournamentId);
    res.json({ success: true, message: `Scores recalculated for tournament ${tournamentId}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. GET /bot-manager/leaderboard/:tournamentId — Query leaderboard with API key
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
        current_participants: tournament.current_participants,
        rankings_finalized: tournament.rankings_finalized
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
