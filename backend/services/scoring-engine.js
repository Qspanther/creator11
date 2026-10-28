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
 * Calculate prize distribution amounts for leaderboard ranks
 */
function calculatePrizeForRank(rank, totalParticipants, prizePool) {
  if (!totalParticipants || !prizePool || totalParticipants <= 0) return 0;
  const rankPercent = ((rank - 1) / totalParticipants) * 100;
  const slab = config.PRIZE_DISTRIBUTION_SLABS.find(
    s => rankPercent >= s.minRankPercent && rankPercent < s.maxRankPercent
  );
  if (!slab) return 0;

  // Approximate winner count in this slab
  const winnersInSlab = Math.max(1, Math.round(totalParticipants * ((slab.maxRankPercent - slab.minRankPercent) / 100)));
  const slabTotal = prizePool * slab.payoutPercent;
  return parseFloat((slabTotal / winnersInSlab).toFixed(2));
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
    entry.prize_amount = calculatePrizeForRank(entry.rank, totalParticipants, totalPrizePool);
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
    tournament: {
      id: team.Tournament.id,
      name: team.Tournament.name,
      platform: team.Tournament.platform,
      status: team.Tournament.status,
      startTime: team.Tournament.start_time,
      endTime: team.Tournament.end_time,
      lockTime: team.Tournament.lock_time,
      prizePool: parseFloat(team.Tournament.prize_pool),
    },
    totalCreditsUsed: parseFloat(team.total_credits_used),
    totalTeamPoints: parseFloat(totalTeamPoints.toFixed(4)),
    rank: lbEntry ? lbEntry.rank : 1,
    prizeWon: lbEntry ? parseFloat(lbEntry.prize_amount) : 0,
    creatorsCount: creatorsBreakdown.length,
    creators: creatorsBreakdown,
  };
}

module.exports = {
  takeSnapshot,
  calculateScores,
  calculateCreatorPoints,
  getTeamScorecard,
};
