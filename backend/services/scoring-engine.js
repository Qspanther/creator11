// ─── Scoring Engine ───
// Calculates points for each creator per team based on snapshot diffs.
// Points = (metric_diff × scoring_weight) × multiplier (captain/vc/default)

const config = require('../config');
const { Creator, Tournament, Team, TeamCreator, CreatorStatsSnapshot, Score, Leaderboard } = require('../db/models');
const { fetchCreatorStats } = require('./creator-stats-fetcher');

/**
 * Take a stats snapshot for all creators in a tournament
 * @param {string} tournamentId
 * @param {'start'|'end'} snapshotType
 */
async function takeSnapshot(tournamentId, snapshotType) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  const creators = await Creator.findAll({
    where: { platform: tournament.platform },
  });

  const timestamp = snapshotType === 'start' ? tournament.start_time : tournament.end_time;
  const snapshots = [];

  for (const creator of creators) {
    const stats = await fetchCreatorStats(creator, new Date(timestamp));
    snapshots.push({
      creator_id: creator.id,
      tournament_id: tournamentId,
      snapshot_type: snapshotType,
      views: stats.views,
      likes: stats.likes,
      followers: stats.followers,
      captured_at: new Date(),
    });
  }

  await CreatorStatsSnapshot.bulkCreate(snapshots);
  console.log(`📸 ${snapshotType} snapshot taken for tournament ${tournament.name}: ${snapshots.length} creators`);
  return snapshots;
}

/**
 * Calculate raw points for a creator based on snapshot diffs
 * @param {Object} startSnap - Start snapshot
 * @param {Object} endSnap - End snapshot  
 * @param {string} platform - 'youtube' | 'instagram'
 * @returns {number} Raw weighted points (decimal)
 */
function calculateRawPoints(startSnap, endSnap, platform) {
  const weights = config.SCORING_WEIGHTS;
  let points = 0;

  if (platform === 'youtube') {
    const viewsDiff = Math.max(0, (endSnap.views || 0) - (startSnap.views || 0));
    points += viewsDiff * weights.youtube_views;
  } else {
    const likesDiff = Math.max(0, (endSnap.likes || 0) - (startSnap.likes || 0));
    const followersDiff = Math.max(0, (endSnap.followers || 0) - (startSnap.followers || 0));
    points += likesDiff * weights.instagram_likes;
    points += followersDiff * weights.instagram_followers;
  }

  // Add micro-variance to prevent exact ties (using snapshot data as seed)
  // This ensures scores resolve as decimals, never as ties
  const tieBreaker = ((startSnap.views || 0) + (startSnap.likes || 0)) * 0.0000001;
  points += tieBreaker;

  return parseFloat(points.toFixed(6));
}

/**
 * Calculate and store scores for all teams in a tournament
 * @param {string} tournamentId
 */
async function calculateScores(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  // Get start and end snapshots
  const startSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'start' },
  });
  const endSnaps = await CreatorStatsSnapshot.findAll({
    where: { tournament_id: tournamentId, snapshot_type: 'end' },
  });

  if (startSnaps.length === 0 || endSnaps.length === 0) {
    console.log(`⚠️ Missing snapshots for tournament ${tournament.name}`);
    return;
  }

  // Index snapshots by creator_id
  const startMap = {};
  startSnaps.forEach(s => { startMap[s.creator_id] = s; });
  const endMap = {};
  endSnaps.forEach(s => { endMap[s.creator_id] = s; });

  // Get all teams for this tournament
  const teams = await Team.findAll({
    where: { tournament_id: tournamentId },
    include: [{ model: TeamCreator, as: 'teamCreators' }],
  });

  // Delete old scores for recalculation
  const teamIds = teams.map(t => t.id);
  await Score.destroy({ where: { team_id: teamIds } });
  await Leaderboard.destroy({ where: { tournament_id: tournamentId } });

  const allScores = [];
  const leaderboardEntries = [];

  for (const team of teams) {
    let totalTeamPoints = 0;

    for (const tc of team.teamCreators) {
      const startSnap = startMap[tc.creator_id];
      const endSnap = endMap[tc.creator_id];

      if (!startSnap || !endSnap) continue;

      const rawPoints = calculateRawPoints(startSnap, endSnap, tournament.platform);

      // Determine multiplier
      let multiplier = config.DEFAULT_MULTIPLIER;
      if (tc.creator_id === team.captain_creator_id) {
        multiplier = config.CAPTAIN_MULTIPLIER;
      } else if (tc.creator_id === team.vice_captain_creator_id) {
        multiplier = config.VICE_CAPTAIN_MULTIPLIER;
      }

      const finalPoints = parseFloat((rawPoints * multiplier).toFixed(6));
      totalTeamPoints += finalPoints;

      allScores.push({
        team_id: team.id,
        creator_id: tc.creator_id,
        raw_metric_diff: rawPoints,
        multiplier_applied: multiplier,
        points: finalPoints,
        calculated_at: new Date(),
      });
    }

    leaderboardEntries.push({
      tournament_id: tournamentId,
      team_id: team.id,
      user_id: team.user_id,
      total_points: parseFloat(totalTeamPoints.toFixed(6)),
      rank: null, // Will be set after sorting
    });
  }

  // Save scores
  if (allScores.length > 0) {
    await Score.bulkCreate(allScores);
  }

  // Sort leaderboard by points (descending) and assign ranks
  leaderboardEntries.sort((a, b) => b.total_points - a.total_points);
  leaderboardEntries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  if (leaderboardEntries.length > 0) {
    await Leaderboard.bulkCreate(leaderboardEntries);
  }

  console.log(`🏆 Scores calculated for tournament ${tournament.name}: ${teams.length} teams scored`);
  return leaderboardEntries;
}

module.exports = { takeSnapshot, calculateScores, calculateRawPoints };
