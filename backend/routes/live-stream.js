const express = require('express');
const router = express.Router();
const { Creator, Tournament } = require('../db/models');

// GET /live-stream/ticker — Server-Sent Events (SSE) Stream for real-time live match ticker
router.get('/ticker', async (req, res) => {
  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

  // Function to gather live burst
  const sendBurst = async () => {
    try {
      const activeTournaments = await Tournament.findAll({
        where: { status: 'live' },
        attributes: ['id', 'name', 'platform', 'prize_pool', 'current_participants'],
        limit: 3,
      });

      const topCreators = await Creator.findAll({
        where: { platform: 'youtube' },
        attributes: ['id', 'name', 'category', 'base_views', 'credit_cost'],
        order: [['base_views', 'DESC']],
        limit: 4,
      });

      const payload = {
        timestamp: Date.now(),
        activeLeagues: activeTournaments.length,
        tournaments: activeTournaments,
        topCreators,
      };

      res.write(`event: ticker_update\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      // quiet fail on closed socket
    }
  };

  // Immediate first burst
  await sendBurst();

  // Interval for continuous live updates every 15s
  const intervalId = setInterval(sendBurst, 15000);

  // Heartbeat ping every 25s
  const pingId = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    clearInterval(pingId);
    res.end();
  });
});

module.exports = router;

