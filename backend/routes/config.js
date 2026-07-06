const express = require('express');
const appConfig = require('../config');

const router = express.Router();

// GET /api/config — Public config values for frontend
router.get('/', (req, res) => {
  res.json({
    categories: appConfig.CATEGORIES,
    creatorsPerCategory: appConfig.CREATORS_PER_CATEGORY,
    totalTeamSize: appConfig.TOTAL_TEAM_SIZE,
    totalCredits: appConfig.TOTAL_CREDITS,
    captainMultiplier: appConfig.CAPTAIN_MULTIPLIER,
    viceCaptainMultiplier: appConfig.VICE_CAPTAIN_MULTIPLIER,
    defaultMultiplier: appConfig.DEFAULT_MULTIPLIER,
    lockBeforeStartMinutes: appConfig.LOCK_BEFORE_START_MINUTES,
    tournamentDurationsHours: appConfig.TOURNAMENT_DURATIONS_HOURS,
    defaultEntryFees: appConfig.DEFAULT_ENTRY_FEES,
    defaultPrizePools: appConfig.DEFAULT_PRIZE_POOLS,
    leaderboardPollIntervalMs: appConfig.LEADERBOARD_POLL_INTERVAL_MS,
    prizeDistributionSlabs: appConfig.PRIZE_DISTRIBUTION_SLABS,
  });
});

module.exports = router;
