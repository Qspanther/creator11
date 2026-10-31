const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize({
  dialect: config.DB_DIALECT,
  storage: config.DB_STORAGE,
  logging: false,
  dialectOptions: {
    busyTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 5,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Configure WAL mode, synchronous, memory cache, and high-performance indexes
sequelize.authenticate().then(async () => {
  try {
    await sequelize.query('PRAGMA journal_mode = WAL;');
    await sequelize.query('PRAGMA synchronous = NORMAL;');
    await sequelize.query('PRAGMA busy_timeout = 30000;');
    await sequelize.query('PRAGMA cache_size = -64000;'); // 64MB memory page cache
    await sequelize.query('PRAGMA temp_store = MEMORY;');
    await sequelize.query('PRAGMA mmap_size = 268435456;'); // 256MB memory-mapped I/O

    // Essential high-speed compound and foreign key indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_team_creators_team_id ON team_creators(team_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_team_creators_creator_id ON team_creators(creator_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_teams_user_tourn ON teams(user_id, tournament_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_scores_team_id ON scores(team_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_leaderboard_tournament_id ON leaderboard(tournament_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_users_is_bot ON users(is_bot);');
    console.log('⚡ Ultra high-performance SQLite engine & indexes active.');
  } catch (err) {
    console.warn('SQLite PRAGMA tuning notice:', err.message);
  }
}).catch(() => {});

module.exports = sequelize;
