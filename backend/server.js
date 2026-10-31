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

// Global crash guards
process.on('uncaughtException', (err) => {
  console.error('🛡️ [Server Guard] Uncaught Exception intercepted:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [Server Guard] Unhandled Rejection intercepted:', reason);
});


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

// Health & Root status checks
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Creator11 API Engine</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #06060b; color: #fff; text-align: center; padding: 60px 20px; }
          .card { max-width: 540px; margin: 0 auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { color: #00f0ff; margin-bottom: 8px; font-size: 26px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; font-weight: bold; font-size: 13px; margin: 12px 0 20px; }
          .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #a855f7, #06b6d4); color: #fff; text-decoration: none; font-weight: bold; border-radius: 12px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚡ Creator11 Backend API</h1>
          <div class="badge">● Server Active &amp; Live</div>
          <p>Creator11 Express Backend &amp; Scoring Engine is running successfully on Port 5000.</p>
          <p>To use the full platform interface, open the frontend app below:</p>
          <a class="btn" href="http://localhost:3000">Open Creator11 Web App (Port 3000) &rarr;</a>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// YouTube Live Tracker status & manual sync endpoints
const { startYouTubeTracker, syncNow, getStatus } = require('./services/youtubeSyncService');

app.get('/admin/youtube-tracker/status', authenticate, isAdmin, (req, res) => {
  res.json({ success: true, tracker: getStatus() });
});

app.post('/admin/youtube-tracker/sync', authenticate, isAdmin, async (req, res) => {
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
      console.log('🌱 No creators found, running seed...');
      await seed();
    } else {
      const { Tournament } = require('./db/models');
      const tCount = await Tournament.count();
      if (tCount === 0) {
        console.log('🏆 No tournaments found, seeding default battle cups...');
        const { seedTournaments } = require('./db/seed');
        if (typeof seedTournaments === 'function') await seedTournaments();
      }
    }

    // Start the scheduler
    startScheduler();

    // Start YouTube Live Stats Tracker daemon (24/7 background sync)
    startYouTubeTracker();

    // Start listening
    const serverCallback = () => {
      console.log(`🚀 Creator11 API running on http://localhost:${config.PORT}`);
      console.log(`📋 Config endpoint: http://localhost:${config.PORT}/api/config`);
      console.log(`🩺 Health check: http://localhost:${config.PORT}/health`);
      console.log(`🤖 Bot Manager endpoint: http://localhost:${config.PORT}/bot-manager`);
    };

    if (process.env.HOST) {
      app.listen(config.PORT, process.env.HOST, serverCallback);
    } else {
      app.listen(config.PORT, serverCallback);
    }
  } catch (error) {
    console.error('âŒ Failed to start server:', error);
    process.exit(1);
  }
}

start();

