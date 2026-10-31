const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize({
  dialect: config.DB_DIALECT,
  storage: config.DB_STORAGE,
  logging: false,
  dialectOptions: {
    busyTimeout: 20000,
  },
  retry: {
    max: 5,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Configure WAL mode, busy timeout, and high-performance indexes
sequelize.authenticate().then(async () => {
  try {
    await sequelize.query('PRAGMA journal_mode = WAL;');
    await sequelize.query('PRAGMA busy_timeout = 20000;');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_team_creators_team_id ON team_creators(team_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_scores_team_id ON scores(team_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_leaderboard_tournament_id ON leaderboard(tournament_id);');
    console.log('⚡ High-performance SQLite database indexes verified.');
  } catch (err) {
    // Ignore error if unsupported
  }
}).catch(() => {});

module.exports = sequelize;
