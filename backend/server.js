const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const config = require('./config');
const sequelize = require('./db/index');
require('./db/models'); // Load all models and associations
const { seed } = require('./db/seed');
const { startScheduler } = require('./services/scheduler');
const { authenticate, isAdmin } = require('./middleware/auth');

const app = express();


// â”€â”€â”€ Security Headers (Helmet) â”€â”€â”€
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Managed by client frontend
}));

// â”€â”€â”€ Rate Limiting (DDoS & Brute-Force Protection) â”€â”€â”€
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
});
app.use('/api/', globalLimiter);
app.use('/tournaments', globalLimiter);
app.use('/creators', globalLimiter);
app.use('/teams', globalLimiter);
app.use('/wallet', globalLimiter);
app.use('/leaderboard', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Max 30 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again in 15 minutes.' },
});
app.use('/auth/login', authLimiter);
app.use('/auth/signup', authLimiter);
app.use('/auth/verify-otp', authLimiter);
app.use('/auth/forgot-password', authLimiter);
app.use('/auth/reset-password', authLimiter);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  // Safe request logging: method and path only
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path}`);
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
app.use('/subscription', require('./routes/subscription'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// YouTube Live Tracker status & manual sync endpoints
const { startYouTubeTracker, syncNow, getStatus } = require('./services/youtubeSyncService');

app.get('/admin/youtube-tracker/status', (req, res) => {
  res.json({ success: true, tracker: getStatus() });
});

app.post('/admin/youtube-tracker/sync', async (req, res) => {
  try {
    const result = await syncNow();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual scoring trigger (for testing)
app.post('/admin/trigger-scoring/:tournamentId', authenticate, isAdmin, async (req, res) => {
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
app.post('/admin/distribute-prizes/:tournamentId', authenticate, isAdmin, async (req, res) => {
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
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProduction ? 'Internal server error' : (err.message || 'Internal server error')
  });
});

// Start server
async function start() {
  try {
    // Sync database
    await sequelize.sync();
    console.log('ðŸ“¦ Database synced');

    // Check if we need to seed
    const { Creator } = require('./db/models');
    const creatorCount = await Creator.count();
    if (creatorCount === 0) {
      console.log('ðŸŒ± No creators found, running seed...');
      await seed();
    }

    // Start the scheduler
    startScheduler();

    // Start YouTube Live Stats Tracker daemon (24/7 background sync)
    startYouTubeTracker();

    // Start listening
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(config.PORT, HOST, () => {
      console.log(`ðŸš€ Creator11 API running on http://localhost:${config.PORT}`);
      console.log(`ðŸ“‹ Config endpoint: http://localhost:${config.PORT}/api/config`);
      console.log(`ðŸ¥ Health check: http://localhost:${config.PORT}/health`);
      console.log(`ðŸ¤– Bot Manager endpoint: http://localhost:${config.PORT}/bot-manager`);
    });
  } catch (error) {
    console.error('âŒ Failed to start server:', error);
    process.exit(1);
  }
}

start();

