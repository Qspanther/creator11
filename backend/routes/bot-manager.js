const crypto = require('crypto');
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
const { distributePrizes } = require('../services/prize-distribution');
const sequelize = require('../db/index');
const { Op } = require('sequelize');

const router = express.Router();

// ─── Timing-Safe API Key Middleware ───
function requireBotApiKey(req, res, next) {
  const apiKey = req.headers['x-bot-api-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing x-bot-api-key header'
    });
  }

  const expectedHash = crypto.createHash('sha256').update(String(config.BOT_API_KEY || '')).digest();
  const providedHash = crypto.createHash('sha256').update(String(apiKey || '')).digest();

  if (!crypto.timingSafeEqual(expectedHash, providedHash)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid x-bot-api-key'
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

// ─── CORE ENGINE FUNCTION: Deploy Pre-Contest Teams for All 1100 Bots ───
async function deployPreContestBots(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  console.log(`🤖 [BotManager Pre-Contest] Building pre-contest teams for 1100 bots in "${tournament.name}"...`);

  if (tournament.current_participants >= 1000) {
    return { registered: 0, total: tournament.current_participants, remaining: 0 };
  }

  const allBots = await getCachedBotUsers();

  if (allBots.length === 0) {
    throw new Error('No registered bots found in database.');
  }

  const creators = await Creator.findAll({ where: { platform: tournament.platform } });
  if (creators.length < config.TOTAL_TEAM_SIZE) {
    throw new Error(`Not enough creators available for platform ${tournament.platform}`);
  }

  const catMap = {};
  for (const c of creators) {
    catMap[c.category] = catMap[c.category] || [];
    catMap[c.category].push({
      id: c.id,
      name: c.name,
      category: c.category,
      credit_cost: parseFloat(c.credit_cost)
    });
  }

  const categories = config.CATEGORIES;

  // Clear existing bot teams for this tournament
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

  const newTeamRecords = [];
  const newTeamCreatorRecords = [];

  for (let i = 0; i < allBots.length; i++) {
    const bot = allBots[i];
    const threeCat = categories[i % categories.length];

    let selectedCreators = [];
    let totalCredits = 0;

    for (const cat of categories) {
      const pool = [...(catMap[cat] || [])];
      pool.sort(() => Math.random() - 0.5);
      const count = cat === threeCat ? 3 : 2;
      selectedCreators.push(...pool.slice(0, count));
    }

    totalCredits = selectedCreators.reduce((sum, c) => sum + c.credit_cost, 0);

    // If budget exceeded, replace most expensive with cheaper
    if (totalCredits > config.TOTAL_CREDITS) {
      selectedCreators.sort((a, b) => b.credit_cost - a.credit_cost);
      for (let j = 0; j < selectedCreators.length; j++) {
        const cat = selectedCreators[j].category;
        const cheaper = (catMap[cat] || []).filter(c => c.credit_cost < selectedCreators[j].credit_cost);
        if (cheaper.length > 0) {
          selectedCreators[j] = cheaper[0];
          totalCredits = selectedCreators.reduce((sum, c) => sum + c.credit_cost, 0);
          if (totalCredits <= config.TOTAL_CREDITS) break;
        }
      }
    }

    selectedCreators.sort(() => Math.random() - 0.5);
    const captain = selectedCreators[0];
    const viceCaptain = selectedCreators[1];

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

    selectedCreators.forEach(c => {
      newTeamCreatorRecords.push({
        id: uuidv4(),
        team_id: teamId,
        creator_id: c.id
      });
    });
  }

  // Bulk insert in chunks
  const CHUNK = 300;
  for (let i = 0; i < newTeamRecords.length; i += CHUNK) {
    await Team.bulkCreate(newTeamRecords.slice(i, i + CHUNK));
  }
  for (let i = 0; i < newTeamCreatorRecords.length; i += CHUNK) {
    await TeamCreator.bulkCreate(newTeamCreatorRecords.slice(i, i + CHUNK));
  }

  await tournament.update({
    current_participants: newTeamRecords.length
  });

  console.log(`✅ [BotManager Pre-Contest] ${newTeamRecords.length} bots entered into "${tournament.name}" before contest start.`);
  return {
    success: true,
    totalTeams: newTeamRecords.length,
    tournamentName: tournament.name
  };
}


// Fast in-memory cache for bot user IDs to eliminate repeated heavy SQLite scans
let cachedBotUsers = null;
let cachedBotUsersTime = 0;

async function getCachedBotUsers() {
  const now = Date.now();
  if (cachedBotUsers && (now - cachedBotUsersTime < 300000)) {
    return cachedBotUsers;
  }
  const bots = await User.findAll({
    where: { is_bot: true },
    attributes: ['id', 'email', 'name'],
    order: [['created_at', 'ASC']],
    raw: true
  });
  cachedBotUsers = bots;
  cachedBotUsersTime = now;
  return cachedBotUsers;
}

// ─── CORE ENGINE FUNCTION: Staggered Random Bot Registration ───
// Gradually registers bots randomly over time as the tournament approaches lock_time.
// Ensures 100% of all 1100 bots have valid teams registered BEFORE the contest locks!
async function registerStaggeredBots(tournamentId, options = {}) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) return { registered: 0 };
  // Only skip if tournament is already completed
  if (tournament.status === 'completed') return { registered: 0 };

  // Fast exit if tournament is already full
  if (!options.all && tournament.current_participants >= 1000) {
    return { registered: 0, total: tournament.current_participants, remaining: 0 };
  }

  const allBots = await getCachedBotUsers();
  if (allBots.length === 0) return { registered: 0 };

  // Find bots already registered for this tournament
  const existingTeams = await Team.findAll({
    where: {
      tournament_id: tournamentId,
      user_id: allBots.map(b => b.id)
    },
    attributes: ['user_id']
  });

  const registeredUserIds = new Set(existingTeams.map(t => t.user_id));
  const unregisteredBots = allBots.filter(b => !registeredUserIds.has(b.id));

  if (unregisteredBots.length === 0) {
    const totalCount = await Team.count({ where: { tournament_id: tournamentId } });
    if (tournament.current_participants !== totalCount) {
      await tournament.update({ current_participants: totalCount });
    }
    return { registered: 0, total: totalCount, remaining: 0 };
  }

  // Calculate timing to lock_time (fallback start_time)
  const targetLock = new Date(tournament.lock_time || tournament.start_time || (Date.now() + 3600000)).getTime();
  const msUntilLock = Math.max(0, targetLock - Date.now());
  const minutesUntilLock = Math.floor(msUntilLock / 60000);

  let batchSize = 1;

  if (options.all || tournament.status === 'locked' || tournament.status === 'live' || minutesUntilLock <= 2 || msUntilLock <= 0) {
    // 2 minutes or less until lock, or already locked/live/requested all: register ALL remaining bots immediately
    batchSize = unregisteredBots.length;
  } else if (options.immediateBatch) {
    batchSize = Math.min(unregisteredBots.length, options.immediateBatch);
  } else if (existingTeams.length === 0) {
    // Initial organic entry for brand-new league: 20 to 35 bots immediately so it's never 0
    batchSize = Math.min(unregisteredBots.length, Math.floor(Math.random() * 16) + 20);
  } else {
    // Staggered pacing: steady random batches of 5 to 15 bots so bots join actively
    const idealPace = Math.ceil(unregisteredBots.length / Math.max(1, minutesUntilLock));
    const minBatch = Math.max(4, Math.min(15, idealPace));
    const maxBatch = Math.min(unregisteredBots.length, Math.max(12, Math.min(30, idealPace * 2)));
    batchSize = Math.floor(Math.random() * (maxBatch - minBatch + 1)) + minBatch;
  }

  const botsToRegister = unregisteredBots.slice(0, batchSize);

  const platform = String(tournament.platform || 'youtube').toLowerCase();
  let creators = await Creator.findAll({ where: { platform } });
  if (creators.length < config.TOTAL_TEAM_SIZE) {
    creators = await Creator.findAll();
  }
  if (creators.length < config.TOTAL_TEAM_SIZE) {
    throw new Error(`Not enough creators available for platform ${tournament.platform}`);
  }

  const catMap = {};
  for (const c of creators) {
    catMap[c.category] = catMap[c.category] || [];
    catMap[c.category].push({
      id: c.id,
      name: c.name,
      category: c.category,
      credit_cost: parseFloat(c.credit_cost)
    });
  }

  const categories = config.CATEGORIES;
  const newTeamRecords = [];
  const newTeamCreatorRecords = [];

  for (let i = 0; i < botsToRegister.length; i++) {
    const bot = botsToRegister[i];
    const threeCat = categories[Math.floor(Math.random() * categories.length)];

    let selectedCreators = [];
    for (const cat of categories) {
      const pool = [...(catMap[cat] || [])];
      pool.sort(() => Math.random() - 0.5);
      const count = cat === threeCat ? 3 : 2;
      selectedCreators.push(...pool.slice(0, count));
    }

    let totalCredits = selectedCreators.reduce((sum, c) => sum + c.credit_cost, 0);

    if (totalCredits > config.TOTAL_CREDITS) {
      selectedCreators.sort((a, b) => b.credit_cost - a.credit_cost);
      for (let j = 0; j < selectedCreators.length; j++) {
        const cat = selectedCreators[j].category;
        const cheaper = (catMap[cat] || []).filter(c => c.credit_cost < selectedCreators[j].credit_cost);
        if (cheaper.length > 0) {
          selectedCreators[j] = cheaper[0];
          totalCredits = selectedCreators.reduce((sum, c) => sum + c.credit_cost, 0);
          if (totalCredits <= config.TOTAL_CREDITS) break;
        }
      }
    }

    selectedCreators.sort(() => Math.random() - 0.5);
    const captain = selectedCreators[0];
    const viceCaptain = selectedCreators[1];

    const teamId = uuidv4();
    const isTeamLocked = (tournament.status === 'locked' || tournament.status === 'live') ? 1 : 0;
    newTeamRecords.push({
      id: teamId,
      user_id: bot.id,
      tournament_id: tournamentId,
      captain_creator_id: captain.id,
      vice_captain_creator_id: viceCaptain.id,
      is_locked: isTeamLocked,
      total_credits_used: totalCredits
    });

    selectedCreators.forEach(c => {
      newTeamCreatorRecords.push({
        id: uuidv4(),
        team_id: teamId,
        creator_id: c.id
      });
    });
  }

  const CHUNK = 300;
  for (let i = 0; i < newTeamRecords.length; i += CHUNK) {
    await Team.bulkCreate(newTeamRecords.slice(i, i + CHUNK));
  }
  for (let i = 0; i < newTeamCreatorRecords.length; i += CHUNK) {
    await TeamCreator.bulkCreate(newTeamCreatorRecords.slice(i, i + CHUNK));
  }

  const totalNow = await Team.count({ where: { tournament_id: tournamentId } });
  await tournament.update({ current_participants: totalNow });

  // If tournament is live or locked, compute leaderboard scores so all bot teams appear ranked
  if (tournament.status === 'live' || tournament.status === 'locked') {
    try {
      await calculateScores(tournamentId);
    } catch (scErr) {
      console.error(`⚠️ Error calculating scores after bot registration for ${tournament.name}:`, scErr.message);
    }
  }

  console.log(`🤖 [Staggered Bot Join] Registered ${newTeamRecords.length} bots for "${tournament.name}". Total teams: ${totalNow} (Remaining bots to enter: ${unregisteredBots.length - newTeamRecords.length}).`);

  return {
    registered: newTeamRecords.length,
    total: totalNow,
    remaining: unregisteredBots.length - newTeamRecords.length
  };
}

// ─── CORE ENGINE FUNCTION: Deploy Post-Contest Autonomous Rearrangement for 1100 Bots ───
async function deployAutonomousBots(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  console.log(`🤖 [BotManager Post-Contest] Rearranging 1100 bot teams by ranking for tournament: "${tournament.name}"...`);

  // Lock tournament rankings while processing so frontend shows finalizing banner
  await tournament.update({ rankings_finalized: false });

  // 1. Fetch all registered bots (1100)
  const allBots = await User.findAll({
    where: { is_bot: true },
    order: [['created_at', 'ASC']]
  });

  if (allBots.length === 0) {
    throw new Error('No registered bots found in database.');
  }

  // 2. Anti-Monopoly & Fair Winner Rotation
  const pastTop10 = await BotWinHistory.findAll({
    where: { rank: { [Op.lte]: 10 } },
    order: [['created_at', 'DESC']],
    limit: 50
  });
  const recentWinnerBotIds = new Set(pastTop10.map(h => h.bot_user_id));

  let eligibleForTop = allBots.filter(b => !recentWinnerBotIds.has(b.id));
  if (eligibleForTop.length < 10) {
    eligibleForTop = [...allBots];
  }

  eligibleForTop.sort(() => Math.random() - 0.5);
  const top10Bots = eligibleForTop.slice(0, 10);
  const top10Ids = new Set(top10Bots.map(b => b.id));

  // Remaining bots distributed across ranking tiers (total 1100)
  const remainingBots = allBots.filter(b => !top10Ids.has(b.id));
  remainingBots.sort(() => Math.random() - 0.5);

  // 1100 bots distributed across 6 tiers matching prize structure:
  // Tier 1: Rank 1-10 (10 bots) - Rotated Top 10 winners
  // Tier 2: Rank 11-100 (90 bots) - High Performers
  // Tier 3: Rank 101-300 (200 bots) - Strong Performers
  // Tier 4: Rank 301-600 (300 bots) - Mid Performers
  // Tier 5: Rank 601-1000 (400 bots) - Lower Performers (within 1000 prize rank cutoff)
  // Tier 6: Rank 1001-1100 (100 bots) - Underdogs / Refund Tier (rank 1001+)
  const tier2Bots = remainingBots.slice(0, 90);
  const tier3Bots = remainingBots.slice(90, 290);
  const tier4Bots = remainingBots.slice(290, 590);
  const tier5Bots = remainingBots.slice(590, 990);
  const tier6Bots = remainingBots.slice(990);

  // 3. Analyze creator delta growth for this tournament
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
    } else {
      deltaScore = (c.base_views * 0.00001) + (c.base_likes * 0.0001);
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

  // Clear previous bot teams for this tournament
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

  // Helper: Rearrange players, captain, and vice-captain for specific ranking tier
  function buildRearrangedLineup(tierIndex, subIndex) {
    const threeCat = categories[(tierIndex + subIndex) % categories.length];
    const selected = [];

    for (const cat of categories) {
      const pool = [...(catCreators[cat] || [])];
      const count = cat === threeCat ? 3 : 2;

      if (tierIndex === 1) {
        selected.push(...pool.slice(0, count));
      } else if (tierIndex === 2) {
        const topSlice = pool.slice(0, 3).sort(() => Math.random() - 0.5);
        selected.push(...topSlice.slice(0, count));
      } else if (tierIndex === 3) {
        pool.sort(() => Math.random() - 0.5);
        selected.push(...pool.slice(0, count));
      } else if (tierIndex === 4) {
        pool.sort(() => Math.random() - 0.5);
        selected.push(...pool.slice(1, 1 + count));
      } else if (tierIndex === 5) {
        pool.reverse();
        selected.push(...pool.slice(0, count));
      } else {
        pool.reverse();
        selected.push(...pool.slice(0, count));
      }
    }

    selected.sort((a, b) => b.deltaScore - a.deltaScore);

    let captain, viceCaptain;
    if (tierIndex === 1) {
      if (subIndex === 0) {
        captain = selected[0];
        viceCaptain = selected[1];
      } else {
        captain = selected[subIndex % 2];
        viceCaptain = selected[(subIndex % 2) + 1] || selected[2];
      }
    } else if (tierIndex === 2) {
      const topPool = selected.slice(0, 3).sort(() => Math.random() - 0.5);
      captain = topPool[0];
      viceCaptain = topPool[1] || selected[1];
    } else if (tierIndex === 3 || tierIndex === 4) {
      const pool = selected.slice(0, 4).sort(() => Math.random() - 0.5);
      captain = pool[0];
      viceCaptain = pool[1] || selected[1];
    } else {
      captain = selected[selected.length - 1];
      viceCaptain = selected[selected.length - 2] || selected[0];
    }

    const totalCredits = selected.reduce((sum, c) => sum + c.credit_cost, 0);
    return { creators: selected, captain, viceCaptain, totalCredits };
  }

  // Build Tier 1 (Rank 1-10)
  top10Bots.forEach((bot, idx) => {
    const { creators: lineup, captain, viceCaptain, totalCredits } = buildRearrangedLineup(1, idx);
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

  // Build Tier 2 (Rank 11-100)
  tier2Bots.forEach((bot, idx) => {
    const { creators: lineup, captain, viceCaptain, totalCredits } = buildRearrangedLineup(2, idx);
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

  // Build Tier 3 (Rank 101-300)
  tier3Bots.forEach((bot, idx) => {
    const { creators: lineup, captain, viceCaptain, totalCredits } = buildRearrangedLineup(3, idx);
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

  // Build Tier 4 (Rank 301-600)
  tier4Bots.forEach((bot, idx) => {
    const { creators: lineup, captain, viceCaptain, totalCredits } = buildRearrangedLineup(4, idx);
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

  // Build Tier 5 (Rank 601-1000)
  tier5Bots.forEach((bot, idx) => {
    const { creators: lineup, captain, viceCaptain, totalCredits } = buildRearrangedLineup(5, idx);
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

  // Build Tier 6 (Rank 1001-1100 - Refund tier)
  tier6Bots.forEach((bot, idx) => {
    const { creators: lineup, captain, viceCaptain, totalCredits } = buildRearrangedLineup(6, idx);
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

  // Bulk save in chunks
  const CHUNK = 300;
  for (let i = 0; i < newTeamRecords.length; i += CHUNK) {
    await Team.bulkCreate(newTeamRecords.slice(i, i + CHUNK));
  }
  for (let i = 0; i < newTeamCreatorRecords.length; i += CHUNK) {
    await TeamCreator.bulkCreate(newTeamCreatorRecords.slice(i, i + CHUNK));
  }

  await tournament.update({
    current_participants: newTeamRecords.length
  });

  // Recalculate official scores for all teams
  console.log(`🧮 Calculating official leaderboard scores for ${tournament.name}...`);
  await calculateScores(tournament.id);

  // Record Top 10 in bot_win_history
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

  // Finalize rankings
  await tournament.update({ rankings_finalized: true });

  // Distribute prizes and ₹97 refunds (₹2 fee)
  try {
    await distributePrizes(tournamentId);
  } catch (distErr) {
    console.error('Error distributing prizes in bot manager:', distErr);
  }

  const topWinner = newLeaderboard[0];
  const winnerUser = topWinner ? await User.findByPk(topWinner.user_id) : null;

  console.log(`🏆 [BotManager] Contest finalized! Winner: "${winnerUser ? winnerUser.name : 'Bot'}" (Rank #1 with ${topWinner ? topWinner.total_points : 0} pts)`);

  return {
    success: true,
    message: `Successfully executed 1100-Bot Autonomous Deployment with Fair Winner Rotation!`,
    tournamentName: tournament.name,
    totalTeams: newTeamRecords.length,
    rankingsFinalized: true,
    winner: {
      botName: winnerUser ? winnerUser.name : 'Bot Winner',
      rank: 1,
      points: topWinner ? topWinner.total_points : 0,
      prize: topWinner ? topWinner.prize_amount : 0
    },
    top10Lineup: newLeaderboard.map(e => ({
      rank: e.rank,
      userId: e.user_id,
      points: e.total_points
    }))
  };
}

// ─── ROUTE ENDPOINTS ───

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
        preContestAutoTeamCreation: 'ENABLED'
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
      limit: 5
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

// 3. GET /bot-manager/bots — List registered bots
router.get('/bots', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1100;
    const bots = await User.findAll({
      where: { is_bot: true },
      attributes: ['id', 'name', 'email', 'role', 'created_at'],
      include: [
        { model: Wallet, as: 'wallet', attributes: ['balance'] }
      ],
      order: [['created_at', 'ASC']],
      limit
    });

    const total = await User.count({ where: { is_bot: true } });

    res.json({
      success: true,
      total,
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

// 4. GET /bot-manager/winners-history — List past bot winners
router.get('/winners-history', async (req, res) => {
  try {
    const history = await BotWinHistory.findAll({
      order: [['created_at', 'DESC']],
      limit: 50
    });

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

// 5. POST /bot-manager/deploy-pre-contest — All 1100 bots build pre-contest teams
router.post('/deploy-pre-contest', async (req, res) => {
  try {
    const { tournamentId } = req.body;
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'tournamentId is required' });
    }

    const result = await deployPreContestBots(tournamentId);
    res.json(result);
  } catch (error) {
    console.error('Error in deploy-pre-contest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /bot-manager/deploy-1100-autonomous — Master 1100-bot Post-Contest Rearrangement
router.post('/deploy-1100-autonomous', async (req, res) => {
  try {
    const { tournamentId } = req.body;
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'tournamentId is required' });
    }

    const result = await deployAutonomousBots(tournamentId);
    res.json(result);
  } catch (error) {
    console.error('Error in deploy-1100-autonomous:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward compatibility alias for deploy-300-autonomous
router.post('/deploy-300-autonomous', async (req, res) => {
  try {
    const { tournamentId } = req.body;
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'tournamentId is required' });
    }

    const result = await deployAutonomousBots(tournamentId);
    res.json(result);
  } catch (error) {
    console.error('Error in deploy-300-autonomous alias:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. POST /bot-manager/batch-join — Command a specific number of bots to join
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

// 8. POST /bot-manager/recalculate/:tournamentId — Recalculate scores
router.post('/recalculate/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await calculateScores(tournamentId);
    res.json({ success: true, message: `Scores recalculated for tournament ${tournamentId}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. GET /bot-manager/leaderboard/:tournamentId — Query leaderboard with bot tags
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
      limit: 1200
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
module.exports.deployPreContestBots = deployPreContestBots;
module.exports.registerStaggeredBots = registerStaggeredBots;
module.exports.deployAutonomousBots = deployAutonomousBots;
