const sequelize = require('./index');
const { Creator, Tournament, User } = require('./models');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── Realistic Creator Data ───
// 50 creators: 25 YouTube + 25 Instagram, 5 per category per platform

const youtubeCreators = [
  // Gaming (5)
  { name: "NovaBlade Gaming", category: "Gaming", credit_cost: 12.0, base_views: 2500000, base_likes: 180000, base_followers: 850000, external_channel_id: "UC_mock_nova" },
  { name: "PixelStorm", category: "Gaming", credit_cost: 10.5, base_views: 1800000, base_likes: 120000, base_followers: 620000, external_channel_id: "UC_mock_pixel" },
  { name: "CodeWarrior YT", category: "Gaming", credit_cost: 9.0, base_views: 1200000, base_likes: 95000, base_followers: 480000, external_channel_id: "UC_mock_code" },
  { name: "ElectraPlay", category: "Gaming", credit_cost: 11.0, base_views: 2100000, base_likes: 150000, base_followers: 720000, external_channel_id: "UC_mock_electra" },
  { name: "ShadowRealm TV", category: "Gaming", credit_cost: 8.5, base_views: 950000, base_likes: 78000, base_followers: 380000, external_channel_id: "UC_mock_shadow" },

  // Vlogging (5)
  { name: "DailyDrift", category: "Vlogging", credit_cost: 11.5, base_views: 2200000, base_likes: 160000, base_followers: 780000, external_channel_id: "UC_mock_drift" },
  { name: "WanderLux", category: "Vlogging", credit_cost: 10.0, base_views: 1600000, base_likes: 110000, base_followers: 550000, external_channel_id: "UC_mock_wander" },
  { name: "CityVibes", category: "Vlogging", credit_cost: 8.0, base_views: 900000, base_likes: 70000, base_followers: 340000, external_channel_id: "UC_mock_city" },
  { name: "SunsetChronicles", category: "Vlogging", credit_cost: 9.5, base_views: 1400000, base_likes: 100000, base_followers: 500000, external_channel_id: "UC_mock_sunset" },
  { name: "NomadNest", category: "Vlogging", credit_cost: 7.5, base_views: 750000, base_likes: 55000, base_followers: 280000, external_channel_id: "UC_mock_nomad" },

  // Comedy (5)
  { name: "LaughCraft Studio", category: "Comedy", credit_cost: 12.5, base_views: 3000000, base_likes: 220000, base_followers: 950000, external_channel_id: "UC_mock_laugh" },
  { name: "PunchlinePro", category: "Comedy", credit_cost: 10.0, base_views: 1700000, base_likes: 130000, base_followers: 600000, external_channel_id: "UC_mock_punch" },
  { name: "ComedyCircuit", category: "Comedy", credit_cost: 9.0, base_views: 1300000, base_likes: 98000, base_followers: 470000, external_channel_id: "UC_mock_circuit" },
  { name: "JokeForge", category: "Comedy", credit_cost: 8.5, base_views: 1000000, base_likes: 80000, base_followers: 400000, external_channel_id: "UC_mock_forge" },
  { name: "SatireKing", category: "Comedy", credit_cost: 11.0, base_views: 2000000, base_likes: 155000, base_followers: 700000, external_channel_id: "UC_mock_satire" },

  // Tech (5)
  { name: "ByteReview", category: "Tech", credit_cost: 11.5, base_views: 2300000, base_likes: 170000, base_followers: 820000, external_channel_id: "UC_mock_byte" },
  { name: "ChipTalk", category: "Tech", credit_cost: 10.0, base_views: 1500000, base_likes: 115000, base_followers: 560000, external_channel_id: "UC_mock_chip" },
  { name: "FutureLab", category: "Tech", credit_cost: 9.5, base_views: 1400000, base_likes: 105000, base_followers: 510000, external_channel_id: "UC_mock_future" },
  { name: "GadgetVerse", category: "Tech", credit_cost: 8.0, base_views: 850000, base_likes: 65000, base_followers: 320000, external_channel_id: "UC_mock_gadget" },
  { name: "CodeCanvas", category: "Tech", credit_cost: 7.5, base_views: 700000, base_likes: 52000, base_followers: 270000, external_channel_id: "UC_mock_canvas" },

  // Lifestyle (5)
  { name: "ZenLiving", category: "Lifestyle", credit_cost: 10.5, base_views: 1900000, base_likes: 140000, base_followers: 650000, external_channel_id: "UC_mock_zen" },
  { name: "FitPulse", category: "Lifestyle", credit_cost: 9.0, base_views: 1300000, base_likes: 95000, base_followers: 480000, external_channel_id: "UC_mock_fit" },
  { name: "GreenPlate", category: "Lifestyle", credit_cost: 8.5, base_views: 1100000, base_likes: 82000, base_followers: 410000, external_channel_id: "UC_mock_green" },
  { name: "StyleAura", category: "Lifestyle", credit_cost: 11.0, base_views: 2000000, base_likes: 148000, base_followers: 690000, external_channel_id: "UC_mock_style" },
  { name: "MindfulMoment", category: "Lifestyle", credit_cost: 7.0, base_views: 600000, base_likes: 45000, base_followers: 230000, external_channel_id: "UC_mock_mindful" },
];

const instagramCreators = [
  // Gaming (5)
  { name: "ArcadeQueen", category: "Gaming", credit_cost: 11.0, base_views: 0, base_likes: 200000, base_followers: 920000, external_channel_id: "ig_mock_arcade" },
  { name: "RetroGamerX", category: "Gaming", credit_cost: 9.5, base_views: 0, base_likes: 140000, base_followers: 580000, external_channel_id: "ig_mock_retro" },
  { name: "ProClutch", category: "Gaming", credit_cost: 10.5, base_views: 0, base_likes: 175000, base_followers: 750000, external_channel_id: "ig_mock_clutch" },
  { name: "eSportsDaily", category: "Gaming", credit_cost: 8.0, base_views: 0, base_likes: 95000, base_followers: 400000, external_channel_id: "ig_mock_esports" },
  { name: "GlitchMode", category: "Gaming", credit_cost: 12.0, base_views: 0, base_likes: 230000, base_followers: 1050000, external_channel_id: "ig_mock_glitch" },

  // Vlogging (5)
  { name: "UrbanExplorer", category: "Vlogging", credit_cost: 10.0, base_views: 0, base_likes: 160000, base_followers: 680000, external_channel_id: "ig_mock_urban" },
  { name: "PassportStories", category: "Vlogging", credit_cost: 11.5, base_views: 0, base_likes: 195000, base_followers: 880000, external_channel_id: "ig_mock_passport" },
  { name: "DayInMyLife", category: "Vlogging", credit_cost: 8.5, base_views: 0, base_likes: 105000, base_followers: 440000, external_channel_id: "ig_mock_dayinmy" },
  { name: "CoastalVibes", category: "Vlogging", credit_cost: 9.0, base_views: 0, base_likes: 120000, base_followers: 510000, external_channel_id: "ig_mock_coastal" },
  { name: "AdventurePulse", category: "Vlogging", credit_cost: 7.5, base_views: 0, base_likes: 80000, base_followers: 330000, external_channel_id: "ig_mock_adventure" },

  // Comedy (5)
  { name: "MemeLordOfficial", category: "Comedy", credit_cost: 12.5, base_views: 0, base_likes: 280000, base_followers: 1200000, external_channel_id: "ig_mock_memelord" },
  { name: "SkitVibes", category: "Comedy", credit_cost: 10.0, base_views: 0, base_likes: 155000, base_followers: 650000, external_channel_id: "ig_mock_skit" },
  { name: "DarkHumorClub", category: "Comedy", credit_cost: 9.0, base_views: 0, base_likes: 125000, base_followers: 530000, external_channel_id: "ig_mock_darkhumor" },
  { name: "ReelComedy", category: "Comedy", credit_cost: 11.0, base_views: 0, base_likes: 185000, base_followers: 790000, external_channel_id: "ig_mock_reel" },
  { name: "JustForLaughs", category: "Comedy", credit_cost: 8.0, base_views: 0, base_likes: 90000, base_followers: 380000, external_channel_id: "ig_mock_justfor" },

  // Tech (5)
  { name: "TechMinimal", category: "Tech", credit_cost: 10.5, base_views: 0, base_likes: 170000, base_followers: 730000, external_channel_id: "ig_mock_minimal" },
  { name: "AIInsider", category: "Tech", credit_cost: 11.0, base_views: 0, base_likes: 190000, base_followers: 810000, external_channel_id: "ig_mock_ai" },
  { name: "StartupGrind", category: "Tech", credit_cost: 9.0, base_views: 0, base_likes: 118000, base_followers: 500000, external_channel_id: "ig_mock_startup" },
  { name: "DevDesign", category: "Tech", credit_cost: 8.5, base_views: 0, base_likes: 100000, base_followers: 420000, external_channel_id: "ig_mock_devdesign" },
  { name: "CryptoVault", category: "Tech", credit_cost: 7.5, base_views: 0, base_likes: 75000, base_followers: 310000, external_channel_id: "ig_mock_crypto" },

  // Lifestyle (5)
  { name: "GlowUpDaily", category: "Lifestyle", credit_cost: 11.5, base_views: 0, base_likes: 210000, base_followers: 950000, external_channel_id: "ig_mock_glow" },
  { name: "PlantMama", category: "Lifestyle", credit_cost: 9.5, base_views: 0, base_likes: 135000, base_followers: 570000, external_channel_id: "ig_mock_plant" },
  { name: "MinimalistHome", category: "Lifestyle", credit_cost: 8.0, base_views: 0, base_likes: 88000, base_followers: 370000, external_channel_id: "ig_mock_minimalist" },
  { name: "FoodieFinds", category: "Lifestyle", credit_cost: 10.0, base_views: 0, base_likes: 155000, base_followers: 660000, external_channel_id: "ig_mock_foodie" },
  { name: "YogaFlow", category: "Lifestyle", credit_cost: 7.0, base_views: 0, base_likes: 65000, base_followers: 270000, external_channel_id: "ig_mock_yoga" },
];

function generateTournaments() {
  const now = new Date();
  const tournaments = [];

  for (const platform of ['youtube', 'instagram']) {
    for (const [durationType, hours] of Object.entries(config.TOURNAMENT_DURATIONS_HOURS)) {
      const lockMinutes = config.LOCK_BEFORE_START_MINUTES;
      // ASSUMPTION: Tournaments start 2 hours from now so users have time to join
      const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const lockTime = new Date(startTime.getTime() - lockMinutes * 60 * 1000);
      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

      const platformLabel = platform === 'youtube' ? 'YouTube' : 'Instagram';
      const durationLabel = durationType === '24h' ? '24-Hour' : durationType === '2d' ? '2-Day' : '3-Day';

      tournaments.push({
        id: uuidv4(),
        name: `${platformLabel} ${durationLabel} Creator Cup`,
        platform,
        duration_type: durationType,
        entry_fee: config.DEFAULT_ENTRY_FEES[durationType],
        prize_pool: config.DEFAULT_PRIZE_POOLS[durationType],
        lock_time: lockTime,
        start_time: startTime,
        end_time: endTime,
        status: 'upcoming',
        max_participants: 1000,
        current_participants: Math.floor(Math.random() * 200) + 50,
      });
    }
  }

  return tournaments;
}

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    await sequelize.sync({ force: true });

    // ─── 4. Mock Users & Teams ───
    console.log('Seeding users and teams...');

    // Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@creator11.com',
      password_hash: adminPassword,
      role: 'admin',
      kyc_status: 'verified',
    });

    // Seed YouTube creators
    const ytCreators = youtubeCreators.map(c => ({
      id: uuidv4(),
      ...c,
      platform: 'youtube',
      profile_image_url: null, // Frontend will use generated avatars
    }));

    // Seed Instagram creators
    const igCreators = instagramCreators.map(c => ({
      id: uuidv4(),
      ...c,
      platform: 'instagram',
      profile_image_url: null,
    }));

    await Creator.bulkCreate([...ytCreators, ...igCreators]);
    console.log(`✅ Seeded ${ytCreators.length + igCreators.length} creators`);

    // Seed tournaments
    const tournaments = generateTournaments();
    await Tournament.bulkCreate(tournaments);
    console.log(`✅ Seeded ${tournaments.length} tournaments`);

    console.log('🎉 Database seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = { seed };
