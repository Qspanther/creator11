const express = require('express');
const cors = require('cors');
const config = require('./config');
const sequelize = require('./db/index');
require('./db/models'); // Load all models and associations
const { seed } = require('./db/seed');
const { startScheduler } = require('./services/scheduler');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/config', require('./routes/config'));
app.use('/tournaments', require('./routes/tournaments'));
app.use('/creators', require('./routes/creators'));
app.use('/teams', require('./routes/teams'));
app.use('/wallet', require('./routes/wallet'));
app.use('/leaderboard', require('./routes/leaderboard'));
app.use('/admin', require('./routes/admin'));
app.use('/notifications', require('./routes/notifications'));
app.use('/contests', require('./routes/contests'));
app.use('/bot-manager', require('./routes/bot-manager'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual scoring trigger (for testing)
app.post('/admin/trigger-scoring/:tournamentId', async (req, res) => {
  try {
    const { takeSnapshot, calculateScores } = require('./services/scoring-engine');
    const { Tournament } = require('./db/models');
    
    const tournament = await Tournament.findByPk(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    await takeSnapshot(tournament.id, 'start');
    await takeSnapshot(tournament.id, 'end');
    await calculateScores(tournament.id);

    res.json({ message: 'Scoring triggered successfully' });
  } catch (error) {
    console.error('Manual scoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual prize distribution trigger (for testing)
app.post('/admin/distribute-prizes/:tournamentId', async (req, res) => {
  try {
    const { distributePrizes } = require('./services/prize-distribution');
    await distributePrizes(req.params.tournamentId);
    res.json({ message: 'Prize distribution triggered successfully' });
  } catch (error) {
    console.error('Manual prize distribution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Sync database
    await sequelize.sync();
    console.log('📦 Database synced');

    // Check if we need to seed
    const { Creator } = require('./db/models');
    const creatorCount = await Creator.count();
    if (creatorCount === 0) {
      console.log('🌱 No creators found, running seed...');
      await seed();
    }

    // Start the scheduler
    startScheduler();

    // Start listening
    app.listen(config.PORT, () => {
      console.log(`🚀 Creator11 API running on http://localhost:${config.PORT}`);
      console.log(`📋 Config endpoint: http://localhost:${config.PORT}/api/config`);
      console.log(`🏥 Health check: http://localhost:${config.PORT}/health`);
      console.log(`🤖 Bot Manager endpoint: http://localhost:${config.PORT}/bot-manager`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
