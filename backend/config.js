// ★★★ CREATOR11 — CENTRAL CONFIGURATION FILE ★★★
// All tunable constants for the entire application live here.
// Every backend module imports values from this file.
// Non-sensitive values are exposed via GET /api/config for the frontend.

require('dotenv').config();

const config = {
  // ─── Team & Category Rules ───
  CATEGORIES: ["Gaming", "Vlogging", "Comedy", "Tech", "Lifestyle"],
  CREATORS_PER_CATEGORY: 3,
  TOTAL_TEAM_SIZE: 11,  // Hard requirement for a valid fantasy team
  TOTAL_CREDITS: 125,

  // ─── Multipliers ───
  CAPTAIN_MULTIPLIER: 2.0,
  VICE_CAPTAIN_MULTIPLIER: 1.5,
  DEFAULT_MULTIPLIER: 1.0,

  // ─── Tournament Timing ───
  LOCK_BEFORE_START_MINUTES: 30,
  TOURNAMENT_DURATIONS_HOURS: {
    "24h": 24,
    "2d": 48,
    "3d": 72,
  },

  // ─── Scoring Weights ───
  // These convert raw metric diffs into meaningful decimal point scores.
  // e.g., 25,487 views gained × 0.0001 = 2.5487 points
  SCORING_WEIGHTS: {
    youtube_views: 0.0001,
    instagram_likes: 0.0001,
    instagram_followers: 0.0002,
  },

  // ─── Prize Distribution Slabs ───
  // Rank percentile ranges and their share of the total prize pool.
  // Must sum to <= 1.0 (remainder is platform margin).
  PRIZE_DISTRIBUTION_SLABS: [
    { minRankPercent: 0,   maxRankPercent: 1,   payoutPercent: 0.30 },  // Top 1% gets 30%
    { minRankPercent: 1,   maxRankPercent: 5,   payoutPercent: 0.25 },  // Next 4% gets 25%
    { minRankPercent: 5,   maxRankPercent: 10,  payoutPercent: 0.15 },  // Next 5% gets 15%
    { minRankPercent: 10,  maxRankPercent: 25,  payoutPercent: 0.10 },  // Next 15% gets 10%
    { minRankPercent: 25,  maxRankPercent: 50,  payoutPercent: 0.05 },  // Next 25% gets 5%
    // Bottom 50% gets nothing — platform keeps remaining 15% as margin
  ],

  // ─── Mock Data Toggle ───
  // Set to false and provide real API keys in env vars to use live data
  USE_MOCK_CREATOR_DATA: true,

  // ─── API Keys (from environment) ───
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN || '',

  // ─── Database ───
  // ASSUMPTION: Using SQLite for zero-setup local dev. Switch dialect to 'postgres'
  // and update storage to a connection string for production PostgreSQL.
  DB_DIALECT: 'sqlite',
  DB_STORAGE: process.env.DB_STORAGE || './creator11.sqlite',

  // ─── Auth ───
  JWT_SECRET: process.env.JWT_SECRET || 'creator11-dev-secret-change-in-production',
  JWT_EXPIRY: '7d',
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,

  // ─── Server ───
  PORT: process.env.PORT || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // ─── Mock Data Generation ───
  // Controls how fast mock stats grow per hour for simulation
  MOCK_GROWTH_RATES: {
    youtube_views_per_hour: { min: 500, max: 5000 },
    instagram_likes_per_hour: { min: 100, max: 2000 },
    instagram_followers_per_hour: { min: 10, max: 500 },
  },

  // ─── Leaderboard Polling ───
  LEADERBOARD_POLL_INTERVAL_MS: 5000,

  // ─── Tournament Entry Fees & Prize Pools ───
  DEFAULT_ENTRY_FEES: {
    "24h": 50,
    "2d": 100,
    "3d": 200,
  },
  DEFAULT_PRIZE_POOLS: {
    "24h": 5000,
    "2d": 15000,
    "3d": 30000,
  },

  // ─── Initial Wallet Balance for New Users ───
  INITIAL_WALLET_BALANCE: 500,
};

// Computed validation (Relaxed to allow fewer total players than max possible)
if (config.CATEGORIES.length * config.CREATORS_PER_CATEGORY < config.TOTAL_TEAM_SIZE) {
  throw new Error(
    `Config error: Not enough possible creators to form a team of ${config.TOTAL_TEAM_SIZE}`
  );
}

module.exports = config;
