// ─── Mock Data Generator ───
// Simulates realistic, gradually-increasing view/like/follower counts
// for each creator over time. Structured so it can be swapped for real API calls.

const config = require('../config');

/**
 * Generate simulated stats for a creator at a given point in time.
 * Uses the creator's base stats + a time-based growth factor with randomness.
 * 
 * @param {Object} creator - Creator record from DB
 * @param {Date} timestamp - The time to simulate stats for
 * @returns {Object} { views, likes, followers }
 */
function generateMockStats(creator, timestamp) {
  const baseTime = new Date(creator.created_at || '2024-01-01').getTime();
  const currentTime = timestamp.getTime();
  const hoursElapsed = (currentTime - baseTime) / (1000 * 60 * 60);

  // Add deterministic but varied growth based on creator ID hash
  const idHash = hashCode(creator.id);
  const growthVariance = 0.5 + (Math.abs(idHash % 100) / 100); // 0.5 to 1.5 multiplier

  const rates = config.MOCK_GROWTH_RATES;

  // Calculate stats with some randomness seeded by the creator ID + timestamp
  const hourSeed = Math.floor(hoursElapsed);
  const pseudoRandom = seededRandom(idHash + hourSeed);

  let views = creator.base_views || 0;
  let likes = creator.base_likes || 0;
  let followers = creator.base_followers || 0;

  if (creator.platform === 'youtube') {
    const viewGrowthPerHour = rates.youtube_views_per_hour.min + 
      (rates.youtube_views_per_hour.max - rates.youtube_views_per_hour.min) * pseudoRandom;
    views += Math.floor(hoursElapsed * viewGrowthPerHour * growthVariance);
    // YouTube creators also get some likes
    likes += Math.floor(hoursElapsed * viewGrowthPerHour * 0.05 * growthVariance);
    followers += Math.floor(hoursElapsed * (rates.instagram_followers_per_hour.min + 50) * growthVariance * 0.3);
  } else {
    // Instagram
    const likeGrowthPerHour = rates.instagram_likes_per_hour.min +
      (rates.instagram_likes_per_hour.max - rates.instagram_likes_per_hour.min) * pseudoRandom;
    const followerGrowthPerHour = rates.instagram_followers_per_hour.min +
      (rates.instagram_followers_per_hour.max - rates.instagram_followers_per_hour.min) * pseudoRandom;
    likes += Math.floor(hoursElapsed * likeGrowthPerHour * growthVariance);
    followers += Math.floor(hoursElapsed * followerGrowthPerHour * growthVariance);
    // Instagram views are not primary for scoring
    views = 0;
  }

  return { views, likes, followers };
}

/**
 * Simple string hash for deterministic randomness
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return hash;
}

/**
 * Seeded pseudo-random number generator (0 to 1)
 */
function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

module.exports = { generateMockStats };
