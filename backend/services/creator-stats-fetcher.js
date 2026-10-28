// ─── Creator Stats Fetcher ───
// Dual-mode module: mock data or real API calls.
// Checks USE_MOCK_CREATOR_DATA flag from config.
// 
// REAL API INTEGRATION NOTES:
// - YouTube Data API v3: GET https://www.googleapis.com/youtube/v3/channels
//   Query params: part=statistics, id=<channelId>, key=<API_KEY>
//   Response: items[0].statistics.viewCount, subscriberCount, videoCount
//
// - Instagram Graph API: GET https://graph.instagram.com/v18.0/{user-id}
//   Query params: fields=followers_count,media_count,media{like_count}, access_token=<TOKEN>
//   Response: followers_count, media.data[].like_count
//
// KNOWN LIMITATION: Instagram Graph API only exposes data for the connected
// business/creator account itself, not arbitrary public creators. A real
// production deployment would need a licensed social listening API (e.g.,
// Brandwatch, Sprout Social) to track arbitrary Instagram creators.

const config = require('../config');
const { generateMockStats } = require('./mock-data-generator');

/**
 * Fetch current stats for a creator.
 * @param {Object} creator - Creator record from DB
 * @param {Date} [timestamp] - Optional timestamp (for mock data time simulation)
 * @returns {Promise<{views: number, likes: number, followers: number}>}
 */
async function fetchCreatorStats(creator, timestamp = new Date()) {
  if (creator.platform === 'youtube') {
    return {
      views: creator.base_views || 0,
      likes: creator.base_likes || 0,
      followers: creator.base_followers || 0,
    };
  }
  if (config.USE_MOCK_CREATOR_DATA) {
    return generateMockStats(creator, timestamp);
  }

  // Real API integration
  if (creator.platform === 'youtube') {
    return fetchYouTubeStats(creator);
  } else {
    return fetchInstagramStats(creator);
  }
}

/**
 * Fetch real YouTube channel statistics via Data API v3
 * Requires YOUTUBE_API_KEY environment variable
 */
async function fetchYouTubeStats(creator) {
  const apiKey = config.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not configured. Set it in environment variables.');
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${creator.external_channel_id}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error(`YouTube channel not found: ${creator.external_channel_id}`);
    }

    const stats = data.items[0].statistics;
    return {
      views: parseInt(stats.viewCount, 10) || 0,
      likes: 0, // YouTube API doesn't provide aggregate like count at channel level
      followers: parseInt(stats.subscriberCount, 10) || 0,
    };
  } catch (error) {
    console.error(`Error fetching YouTube stats for ${creator.name}:`, error.message);
    throw error;
  }
}

/**
 * Fetch real Instagram account statistics via Graph API
 * Requires INSTAGRAM_ACCESS_TOKEN environment variable
 * 
 * WARNING: This only works for accounts the token has access to.
 * See KNOWN LIMITATION note at top of file.
 */
async function fetchInstagramStats(creator) {
  const token = config.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN not configured. Set it in environment variables.');
  }

  try {
    const url = `https://graph.instagram.com/v18.0/${creator.external_channel_id}?fields=followers_count,media_count,media{like_count}&access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();

    // Sum up likes from recent media
    let totalLikes = 0;
    if (data.media && data.media.data) {
      totalLikes = data.media.data.reduce((sum, post) => sum + (post.like_count || 0), 0);
    }

    return {
      views: 0, // Instagram doesn't expose view counts publicly
      likes: totalLikes,
      followers: data.followers_count || 0,
    };
  } catch (error) {
    console.error(`Error fetching Instagram stats for ${creator.name}:`, error.message);
    throw error;
  }
}

module.exports = { fetchCreatorStats };
