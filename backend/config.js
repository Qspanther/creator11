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
    "6h": 6,
    "24h": 24,
    "2d": 48,
    "48h": 48,
    "3d": 72,
    "72h": 72,
  },

  // ─── Scoring Weights ───
  // 1000 views gained = 1 point (views * 0.001)
  // 500 likes gained = 1 point (likes * 0.002)
  // 100 subscribers gained = 1 point (subscribers * 0.01)
  SCORING_WEIGHTS: {
    youtube_views: 0.001,
    youtube_likes: 0.002,
    youtube_subscribers: 0.01,
    instagram_likes: 0.002,
    instagram_followers: 0.01,
  },

  // ─── Prize Distribution Slabs ───
  // Rank percentile ranges and their share of the total prize pool.
  PRIZE_DISTRIBUTION_SLABS: [
    { minRankPercent: 0,   maxRankPercent: 1,   payoutPercent: 0.30 },  // Top 1% gets 30%
    { minRankPercent: 1,   maxRankPercent: 5,   payoutPercent: 0.25 },  // Next 4% gets 25%
    { minRankPercent: 5,   maxRankPercent: 10,  payoutPercent: 0.15 },  // Next 5% gets 15%
    { minRankPercent: 10,  maxRankPercent: 25,  payoutPercent: 0.10 },  // Next 15% gets 10%
    { minRankPercent: 25,  maxRankPercent: 50,  payoutPercent: 0.05 },  // Next 25% gets 5%
    // Bottom 50% gets nothing — platform keeps remaining 15% as margin
  ],

  // ─── Mock Data Toggle ───
  USE_MOCK_CREATOR_DATA: false,

  // ─── API Keys (from environment) ───
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN || '',

  // ─── Bot Manager Network Secret Key ───
  BOT_API_KEY: process.env.BOT_API_KEY || 'c11_bot_mgr_sec_9938a7fbc21d49e',

  // ─── Database ───
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
  MOCK_GROWTH_RATES: {
    youtube_views_per_hour: { min: 500, max: 5000 },
    instagram_likes_per_hour: { min: 100, max: 2000 },
    instagram_followers_per_hour: { min: 10, max: 500 },
  },

  // ─── Leaderboard Polling ───
  LEADERBOARD_POLL_INTERVAL_MS: 5000,

  // ─── Tournament Entry Fees & Prize Pools (Fixed ₹99 with 100% Never-Lose Guarantee) ───
  FIXED_ENTRY_FEE: 99.00,
  DEFAULT_ENTRY_FEES: {
    "6h": 99,
    "24h": 99,
    "2d": 99,
    "48h": 99,
    "3d": 99,
    "72h": 99,
  },
  DEFAULT_PRIZE_POOLS: {
    "6h": 2500,
    "24h": 5000,
    "2d": 15000,
    "3d": 30000,
  },

  // ─── Initial Wallet Balance for New Users ───
  INITIAL_WALLET_BALANCE: 0,
};

if (config.CATEGORIES.length * config.CREATORS_PER_CATEGORY < config.TOTAL_TEAM_SIZE) {
  throw new Error(
    `Config error: Not enough possible creators to form a team of ${config.TOTAL_TEAM_SIZE}`
  );
}

module.exports = config;
