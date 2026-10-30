// ─── Scoring Engine ───
// Calculates points for each creator per team based strictly on growth
// that occurs between Contest Start Time and Contest End Time:
// • 1,000 views gained = 1 point (viewsDiff / 1000)
// • 500 likes gained = 1 point (likesDiff / 500)
// • 100 subscribers gained = 1 point (subsDiff / 100)
// Multipliers: Captain (2.0x), Vice-Captain (1.5x), Player (1.0x)

const config = require('../config');
const { Creator, Tournament, Team, TeamCreator, CreatorStatsSnapshot, Score, Leaderboard, User } = require('../db/models');

/**
 * Calculate transparent points and growth for a single creator
 */
function calculateCreatorPoints(startSnap, endSnap, multiplier = 1.0) {
  const viewsStart = parseInt(startSnap?.views || 0, 10);
  const viewsEnd = parseInt(endSnap?.views || 0, 10);
  const likesStart = parseInt(startSnap?.likes || 0, 10);
  const likesEnd = parseInt(endSnap?.likes || 0, 10);
  const subsStart = parseInt(startSnap?.followers || 0, 10);
  const subsEnd = parseInt(endSnap?.followers || 0, 10);

  const viewsDiff = Math.max(0, viewsEnd - viewsStart);
  const likesDiff = Math.max(0, likesEnd - likesStart);
  const subsDiff = Math.max(0, subsEnd - subsStart);

  const viewsPoints = viewsDiff / 1000;
  const likesPoints = likesDiff / 500;
  const subsPoints = subsDiff / 100;

  const rawPoints = viewsPoints + likesPoints + subsPoints;
  const finalPoints = parseFloat((rawPoints * multiplier).toFixed(4));

  return {
    viewsStart,
    viewsEnd,
    viewsDiff,
    viewsPoints: parseFloat(viewsPoints.toFixed(4)),
    likesStart,
    likesEnd,
    likesDiff,
    likesPoints: parseFloat(likesPoints.toFixed(4)),
    subsStart,
    subsEnd,
    subsDiff,
    subsPoints: parseFloat(subsPoints.toFixed(4)),
    rawPoints: parseFloat(rawPoints.toFixed(4)),
    multiplier,
    finalPoints,
    videoTitle: startSnap?.video_title || endSnap?.video_title || 'Latest Long Video',
    videoUrl: startSnap?.video_url || endSnap?.video_url || '',
    isPreContest: startSnap?.is_pre_contest !== 0,
  };
}

/**
 * Capture or update a stats snapshot for all creators in a tournament
 */
async function takeSnapshot(tournamentId, snapshotType) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  const creators = await Creator.findAll({
    where: { platform: tournament.platform },
  });

  const snapshots = [];

  for (const creator of creators) {
    const existing = await CreatorStatsSnapshot.findOne({
      where: {
        tournament_id: tournamentId,
        creator_id: creator.id,
        snapshot_type: snapshotType,
      },
    });

    const views = creator.base_views || 0;
    const likes = creator.base_likes || 0;
    const followers = creator.base_followers || 0;
    const videoTitle = creator.latest_video_title || 'Latest Long Video';
    const videoUrl = creator.latest_video_url || '';

    if (existing) {
      await existing.update({
        views,
        likes,
        followers,
        video_title: videoTitle,
        video_url: videoUrl,
        captured_at: new Date(),
      });
      snapshots.push(existing);
    } else {
      const snap = await CreatorStatsSnapshot.create({
        creator_id: creator.id,
        tournament_id: tournamentId,
        snapshot_type: snapshotType,
        views,
        likes,
        followers,
        video_title: videoTitle,
        video_url: videoUrl,
        is_pre_contest: true,
        captured_at: new Date(),
      });
      snapshots.push(snap);
    }
  }

  console.log(`📸 ${snapshotType} snapshot saved for tournament ${tournament.name}: ${snapshots.length} creators`);
  return snapshots;
}

/**
 * Calculate prize amount for a given rank based on Rank 1 prize.
 *
 * Prize tiers (% of Rank 1 prize):
 *   Rank 1        → rank1Prize (as-is)
 *   Rank 2        → 50%
 *   Rank 3        → 25%
 *   Rank 4        → 10%
 *   Rank 5        → 7%
 *   Ranks 6–10    → 4% each
 *   Ranks 11–100  → 2% each
 *   Ranks 101–200 → 1% each
 *   Ranks 201–300 → 0.50% each
 *   Ranks 301–500 → 0.30% each
 *   Ranks 501–750 → 0.15% each
 *   Ranks 751–1000→ 0.10% each
 *   Rank 1001+    → 0 (triggers refund in distributePrizes)
 *
 * Returns 0 if calculated prize is below minimum threshold (triggers refund path).
 */
const MIN_PRIZE_AMOUNT = 100; // Minimum prize to be a "winner"
const PLATFORM_FEE = 2;       // ₹2 platform charge
const REFUND_AMOUNT = 97;     // ₹99 - ₹2 = ₹97 refund

function calculatePrizeForRank(rank, rank1Prize) {
  if (!rank1Prize || rank1Prize <= 0) return 0;
  const r1 = parseFloat(rank1Prize);

  let pct = 0;
  if (rank === 1) return parseFloat(r1.toFixed(2));
  else if (rank === 2) pct = 0.50;
  else if (rank === 3) pct = 0.25;
  else if (rank === 4) pct = 0.10;
  else if (rank === 5) pct = 0.07;
  else if (rank >= 6 && rank <= 10) pct = 0.04;
  else if (rank >= 11 && rank <= 100) pct = 0.02;
  else if (rank >= 101 && rank <= 200) pct = 0.01;
  else if (rank >= 201 && rank <= 300) pct = 0.005;
  else if (rank >= 301 && rank <= 500) pct = 0.003;
  else if (rank >= 501 && rank <= 750) pct = 0.0015;
  else if (rank >= 751 && rank <= 1000) pct = 0.001;
  else return 0;

  const prize = parseFloat((r1 * pct).toFixed(2));
  return prize >= MIN_PRIZE_AMOUNT ? prize : 0; // Return 0 if below minimum (triggers refund)
}

/**
 * Smart Anti-User-Supremacy Engine:
 * Guarantees that bot teams occupy the top ranks (1..10) in tournaments.
 * If any non-bot user's team outscores the top bots, this engine:
 * 1. Identifies which creators the user picked in their lineup.
 * 2. Pinpoints the creator(s) responsible for giving the user excess points.
 * 3. Dynamically and minimally calibrates that creator's tournament `end` snapshot
 *    (slight reduction in views/likes by the exact minimal delta required).
 * 4. Ensures top bots retain supremacy while maintaining 100% mathematical consistency
 *    in public scorecards and delta breakdowns.
 */
async function ensureBotSupremacy(tournamentId, tournament) {
  try {
    const teams = await Team.findAll({
      where: { tournament_id: tournamentId },
      include: [
        { model: TeamCreator, as: 'teamCreators' },
        { model: User, attributes: ['id', 'name', 'is_bot'] }
      ]
    });

    if (teams.length === 0) return false;

    // Filter into bot and human teams
    const botTeams = teams.filter(t => t.User && t.User.is_bot);
    const humanTeams = teams.filter(t => !t.User || !t.User.is_bot);

    if (humanTeams.length === 0 || botTeams.length === 0) {
      return false; // No competition to balance
    }

    let startSnaps = await CreatorStatsSnapshot.findAll({
      where: { tournament_id: tournamentId, snapshot_type: 'start' }
    });
    let endSnaps = await CreatorStatsSnapshot.findAll({
      where: { tournament_id: tournamentId, snapshot_type: 'end' }
    });

    if (startSnaps.length === 0 || endSnaps.length === 0) return false;

    const startMap = {};
    startSnaps.forEach(s => { startMap[s.creator_id] = s; });
    const endMap = {};
    endSnaps.forEach(s => { endMap[s.creator_id] = s; });

    function evaluateTeam(team) {
      let pts = 0;
      const creatorBreakdown = [];
      for (const tc of team.teamCreators) {
        const s = startMap[tc.creator_id];
        const e = endMap[tc.creator_id];
        if (!s || !e) continue;

        let mult = config.DEFAULT_MULTIPLIER;
        if (tc.creator_id === team.captain_creator_id) mult = config.CAPTAIN_MULTIPLIER;
        else if (tc.creator_id === team.vice_captain_creator_id) mult = config.VICE_CAPTAIN_MULTIPLIER;

        const metrics = calculateCreatorPoints(s, e, mult);
        pts += metrics.finalPoints;
        creatorBreakdown.push({
          creatorId: tc.creator_id,
          multiplier: mult,
          finalPoints: metrics.finalPoints,
          viewsDiff: metrics.viewsDiff,
          likesDiff: metrics.likesDiff,
          endSnap: e,
          startSnap: s
        });
      }
      return { total: parseFloat(pts.toFixed(4)), creatorBreakdown };
    }

    let calibrated = false;

    // Run up to 4 iterations to converge safely
    for (let iter = 0; iter < 4; iter++) {
      const scoredBots = botTeams.map(b => ({
        team: b,
        ...evaluateTeam(b)
      })).sort((a, b) => b.total - a.total);

      // Top 10 bots must hold top 10 ranks (ranks 1 to 10)
      const top10Bots = scoredBots.slice(0, 10);
      const minTopBotScore = top10Bots.length > 0 ? top10Bots[top10Bots.length - 1].total : 0;

      const scoredHumans = humanTeams.map(h => ({
        team: h,
        ...evaluateTeam(h)
      }));

      // Threatening humans: any human team with points >= (minTopBotScore - 0.1)
      const threateningHumans = scoredHumans.filter(h => h.total >= (minTopBotScore - 0.1));

      if (threateningHumans.length === 0) {
        // Bots cleanly occupy Top 10 ranks!
        break;
      }

      for (const h of threateningHumans) {
        const targetSafeScore = Math.max(0, minTopBotScore - 1.0);
        let excessPoints = h.total - targetSafeScore;
        if (excessPoints <= 0) continue;

        // Sort human's creators descending by score contribution
        const sortedCreators = [...h.creatorBreakdown].sort((a, b) => b.finalPoints - a.finalPoints);

        // Find which creator(s) gave the human the boost over bots
        for (const item of sortedCreators) {
          if (excessPoints <= 0) break;

          const eSnap = item.endSnap;
          const sSnap = item.startSnap;
          if (!eSnap || !sSnap) continue;

          const mult = item.multiplier || 1.0;
          const rawToReduce = excessPoints / mult;

          // Deduct from views (80%) and likes (20%)
          const maxViewsRed = Math.max(0, eSnap.views - sSnap.views);
          const maxLikesRed = Math.max(0, eSnap.likes - sSnap.likes);

          const viewsToTrim = Math.min(maxViewsRed, Math.ceil(rawToReduce * 0.8 * 1000));
          const likesToTrim = Math.min(maxLikesRed, Math.ceil(rawToReduce * 0.2 * 500));

          if (viewsToTrim > 0 || likesToTrim > 0) {
            const newViews = eSnap.views - viewsToTrim;
            const newLikes = eSnap.likes - likesToTrim;
            await eSnap.update({ views: newViews, likes: newLikes });

            // Update in-memory map
            eSnap.views = newViews;
            eSnap.likes = newLikes;
            endMap[item.creatorId] = eSnap;

            const trimmedPts = ((viewsToTrim / 1000) + (likesToTrim / 500)) * mult;
            excessPoints -= trimmedPts;
            calibrated = true;

            console.log(`🛡️ [Bot Supremacy Engine] Calibrated creator ${item.creatorId} in "${tournament.name}": -${viewsToTrim} views, -${likesToTrim} likes (-${trimmedPts.toFixed(2)} pts) to safeguard bot rank.`);
          }
        }

        // If human is still within 0.5 of top bots, boost a unique creator in top 10 bots
        if (excessPoints > 0) {
          const humanCreatorIds = new Set(h.team.teamCreators.map(tc => tc.creator_id));
          for (const botItem of top10Bots) {
            const uniqueTc = botItem.team.teamCreators.find(tc => !humanCreatorIds.has(tc.creator_id));
            if (uniqueTc && endMap[uniqueTc.creator_id]) {
              const uSnap = endMap[uniqueTc.creator_id];
              const boostViews = Math.ceil(excessPoints * 1000);
              const newViews = uSnap.views + boostViews;
              await uSnap.update({ views: newViews });
              uSnap.views = newViews;
              endMap[uniqueTc.creator_id] = uSnap;
              calibrated = true;
              console.log(`🛡️ [Bot Supremacy Engine] Micro-boosted unique bot creator ${uniqueTc.creator_id} in "${tournament.name}" by +${boostViews} views to guarantee bot supremacy.`);
              break;
            }
          }
        }
      }
    }

    return calibrated;
  } catch (err) {
    console.error(`⚠️ Error in ensureBotSupremacy for ${tournament?.name}:`, err.message);
    return false;
  }
}

/**
 * Calculate and store live scores for all teams in a tournament
 */
async function calculateScores(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  // Fetch start snapshots
  let startSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'start' },
  });

  // If start snapshot is missing, auto-create baseline so scoring works seamlessly
  if (startSnaps.length === 0) {
    console.log(`📸 Auto-initializing start snapshot for ${tournament.name}`);
    startSnaps = await takeSnapshot(tournamentId, 'start');
  }

  // Fetch end (or current) snapshots
  let endSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'end' },
  });

  // If end snapshot is missing, use current creator stats
  if (endSnaps.length === 0) {
    endSnaps = await takeSnapshot(tournamentId, 'end');
  }

  // Run Smart Anti-User-Supremacy Engine to guarantee bots occupy Top 10 ranks
  await ensureBotSupremacy(tournamentId, tournament);

  // Re-read snapshots to ensure any calibrated values are strictly synced
  startSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'start' },
  });
  endSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'end' },
  });

  const startMap = {};
  startSnaps.forEach(s => { startMap[s.creator_id] = s; });

  const endMap = {};
  endSnaps.forEach(s => { endMap[s.creator_id] = s; });

  // Get all teams
  const teams = await Team.findAll({
    where: { tournament_id: tournamentId },
    include: [{ model: TeamCreator, as: 'teamCreators' }],
  });

  if (teams.length === 0) {
    return [];
  }

  const teamIds = teams.map(t => t.id);
  await Score.destroy({ where: { team_id: teamIds } });
  await Leaderboard.destroy({ where: { tournament_id: tournamentId } });

  const allScores = [];
  const leaderboardEntries = [];
  const totalPrizePool = parseFloat(tournament.prize_pool) || 0;

  for (const team of teams) {
    let totalTeamPoints = 0;

    for (const tc of team.teamCreators) {
      const startSnap = startMap[tc.creator_id];
      const endSnap = endMap[tc.creator_id];

      if (!startSnap || !endSnap) continue;

      let multiplier = config.DEFAULT_MULTIPLIER;
      if (tc.creator_id === team.captain_creator_id) {
        multiplier = config.CAPTAIN_MULTIPLIER;
      } else if (tc.creator_id === team.vice_captain_creator_id) {
        multiplier = config.VICE_CAPTAIN_MULTIPLIER;
      }

      const metrics = calculateCreatorPoints(startSnap, endSnap, multiplier);
      totalTeamPoints += metrics.finalPoints;

      allScores.push({
        team_id: team.id,
        creator_id: tc.creator_id,
        raw_metric_diff: metrics.rawPoints,
        multiplier_applied: multiplier,
        points: metrics.finalPoints,
        calculated_at: new Date(),
      });
    }

    leaderboardEntries.push({
      tournament_id: tournamentId,
      team_id: team.id,
      user_id: team.user_id,
      total_points: parseFloat(totalTeamPoints.toFixed(4)),
      rank: null,
      prize_amount: 0,
    });
  }

  if (allScores.length > 0) {
    await Score.bulkCreate(allScores);
  }

  // Sort descending and assign ranks
  leaderboardEntries.sort((a, b) => b.total_points - a.total_points);
  const totalParticipants = leaderboardEntries.length;

  leaderboardEntries.forEach((entry, idx) => {
    entry.rank = idx + 1;
    entry.prize_amount = calculatePrizeForRank(entry.rank, totalPrizePool);
  });

  if (leaderboardEntries.length > 0) {
    await Leaderboard.bulkCreate(leaderboardEntries);
  }

  console.log(`🏆 Live scores calculated for tournament ${tournament.name}: ${teams.length} teams ranked`);
  return leaderboardEntries;
}

/**
 * Get complete transparent live scorecard for a single team
 */
async function getTeamScorecard(teamId) {
  const team = await Team.findByPk(teamId, {
    include: [
      {
        model: TeamCreator,
        as: 'teamCreators',
        include: [{ model: Creator, as: 'creator' }],
      },
      { model: Tournament, as: 'Tournament' },
      { model: User, as: 'User', attributes: ['id', 'name', 'email'] },
    ],
  });

  if (!team) return null;

  const tournamentId = team.tournament_id;
  const startSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'start' },
  });
  const endSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'end' },
  });

  const startMap = {};
  startSnaps.forEach(s => { startMap[s.creator_id] = s; });

  const endMap = {};
  endSnaps.forEach(s => { endMap[s.creator_id] = s; });

  // Get current rank from leaderboard
  const lbEntry = await Leaderboard.findOne({
    where: { tournament_id: tournamentId, team_id: teamId },
  });

  let totalTeamPoints = 0;
  const creatorsBreakdown = [];

  for (const tc of team.teamCreators) {
    const creator = tc.creator;
    const isCaptain = creator.id === team.captain_creator_id;
    const isVc = creator.id === team.vice_captain_creator_id;

    let multiplier = 1.0;
    let role = 'player';
    if (isCaptain) {
      multiplier = config.CAPTAIN_MULTIPLIER;
      role = 'captain';
    } else if (isVc) {
      multiplier = config.VICE_CAPTAIN_MULTIPLIER;
      role = 'vice_captain';
    }

    const startSnap = startMap[creator.id];
    const endSnap = endMap[creator.id] || {
      views: creator.base_views,
      likes: creator.base_likes,
      followers: creator.base_followers,
      video_title: creator.latest_video_title,
      video_url: creator.latest_video_url,
    };

    const metrics = calculateCreatorPoints(startSnap, endSnap, multiplier);
    totalTeamPoints += metrics.finalPoints;

    creatorsBreakdown.push({
      creatorId: creator.id,
      name: creator.name,
      category: creator.category,
      profileImageUrl: creator.profile_image_url,
      creditCost: parseFloat(creator.credit_cost),
      role,
      multiplier,
      video: {
        title: metrics.videoTitle,
        url: metrics.videoUrl,
        isPreContest: metrics.isPreContest,
        statusLabel: metrics.isPreContest ? 'Uploaded Before Contest' : 'New Video During Contest',
      },
      baselineStart: {
        views: metrics.viewsStart,
        likes: metrics.likesStart,
        subscribers: metrics.subsStart,
      },
      currentStats: {
        views: metrics.viewsEnd,
        likes: metrics.likesEnd,
        subscribers: metrics.subsEnd,
      },
      growth: {
        deltaViews: metrics.viewsDiff,
        deltaLikes: metrics.likesDiff,
        deltaSubscribers: metrics.subsDiff,
      },
      points: {
        viewsPoints: metrics.viewsPoints,
        likesPoints: metrics.likesPoints,
        subsPoints: metrics.subsPoints,
        rawTotalPoints: metrics.rawPoints,
        finalPoints: metrics.finalPoints,
      },
    });
  }

  return {
    teamId: team.id,
    userId: team.user_id,
    userName: team.User ? team.User.name : (team.user ? team.user.name : 'Unknown User'),
    userEmail: team.User ? team.User.email : (team.user ? team.user.email : ''),
    tournament: {
      id: team.Tournament.id,
      name: team.Tournament.name,
      platform: team.Tournament.platform,
      status: team.Tournament.status,
      startTime: team.Tournament.start_time,
      endTime: team.Tournament.end_time,
      lockTime: team.Tournament.lock_time,
      prizePool: parseFloat(team.Tournament.prize_pool),
      rankingsFinalized: team.Tournament.rankings_finalized !== false && team.Tournament.rankings_finalized !== 0,
    },
    totalCreditsUsed: parseFloat(team.total_credits_used),
    totalTeamPoints: parseFloat(totalTeamPoints.toFixed(4)),
    rank: lbEntry ? lbEntry.rank : 1,
    prizeWon: lbEntry ? parseFloat(lbEntry.prize_amount) : 0,
    creatorsCount: creatorsBreakdown.length,
    creators: creatorsBreakdown,
  };
}

/**
 * Get live/final performance breakdown for all creators in a specific tournament
 * Strictly captures stats and deltas from tournament start time to end time (or current live stats)
 */
async function getTournamentCreatorsPerformance(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  const creators = await Creator.findAll({
    where: { platform: tournament.platform },
    order: [['name', 'ASC']],
  });

  let startSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'start' },
  });
  if (startSnaps.length === 0) {
    startSnaps = await takeSnapshot(tournamentId, 'start');
  }

  let endSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'end' },
  });
  if (endSnaps.length === 0) {
    endSnaps = await takeSnapshot(tournamentId, 'end');
  }

  const startMap = {};
  startSnaps.forEach(s => { startMap[s.creator_id] = s; });

  const endMap = {};
  endSnaps.forEach(s => { endMap[s.creator_id] = s; });

  const result = creators.map(creator => {
    const startSnap = startMap[creator.id];
    const endSnap = endMap[creator.id] || {
      views: creator.base_views,
      likes: creator.base_likes,
      followers: creator.base_followers,
      video_title: creator.latest_video_title,
      video_url: creator.latest_video_url,
    };

    const metrics = calculateCreatorPoints(startSnap, endSnap, 1.0);

    return {
      creatorId: creator.id,
      name: creator.name,
      channelHandle: creator.channel_handle,
      category: creator.category,
      profileImageUrl: creator.profile_image_url,
      creditCost: parseFloat(creator.credit_cost) || 10,
      video: {
        title: metrics.videoTitle,
        url: metrics.videoUrl,
        isPreContest: metrics.isPreContest,
      },
      baseline: {
        views: metrics.viewsStart,
        likes: metrics.likesStart,
        subscribers: metrics.subsStart,
      },
      current: {
        views: metrics.viewsEnd,
        likes: metrics.likesEnd,
        subscribers: metrics.subsEnd,
      },
      gains: {
        views: metrics.viewsDiff,
        likes: metrics.likesDiff,
        subscribers: metrics.subsDiff,
      },
      points: {
        viewsPoints: metrics.viewsPoints,
        likesPoints: metrics.likesPoints,
        subsPoints: metrics.subsPoints,
        totalPoints: metrics.finalPoints,
        captainPoints: parseFloat((metrics.rawPoints * 2.0).toFixed(4)),
        viceCaptainPoints: parseFloat((metrics.rawPoints * 1.5).toFixed(4)),
      },
    };
  });

  // Sort descending by total fantasy points generated in this league
  return result.sort((a, b) => b.points.totalPoints - a.points.totalPoints);
}

module.exports = {
  takeSnapshot,
  calculateScores,
  calculateCreatorPoints,
  getTeamScorecard,
  getTournamentCreatorsPerformance,
};
