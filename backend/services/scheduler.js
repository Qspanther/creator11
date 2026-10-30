// ─── Scheduler ───
// node-cron jobs that manage tournament lifecycle:
// 1. Pre-Contest: All 1100 bots build fantasy teams before contest starts / locks
// 2. Lock tournaments 30 minutes before start
// 3. Take start snapshots at tournament start time
// 4. Periodically recalculate scores during live tournaments
// 5. Post-Contest: Take end snapshots, rearrange 1100 bot teams according to ranking tiers
//    with Fair Winner Rotation, calculate final scores, and distribute prizes/refunds!

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Tournament, Team } = require('../db/models');
const { takeSnapshot, calculateScores } = require('./scoring-engine');
const { distributePrizes } = require('./prize-distribution');
const { deployPreContestBots, deployAutonomousBots } = require('../routes/bot-manager');

function startScheduler() {
  console.log('⏰ Starting tournament scheduler with 1100-Bot Automation...');

  const preContestCompleted = new Set();

  // Run every minute to check tournament state transitions
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // 0. Pre-Contest: Ensure upcoming tournaments have their 1100 bot teams created before start
      const upcomingTournaments = await Tournament.findAll({
        where: {
          status: 'upcoming',
          platform: 'youtube', // Focus on YouTube league
          start_time: { [Op.gt]: now },
        },
      });

      for (const t of upcomingTournaments) {
        const msUntilStart = new Date(t.start_time) - now;
        const minutesUntilStart = Math.round(msUntilStart / 60000);

        // Deploy pre-contest teams within 60 minutes of start or if participants < 1000
        if (!preContestCompleted.has(t.id) && (minutesUntilStart <= 60 || t.current_participants < 1000)) {
          preContestCompleted.add(t.id);
          try {
            console.log(`🤖 [Scheduler Pre-Contest] Auto-generating pre-contest teams for 1100 bots in "${t.name}"...`);
            await deployPreContestBots(t.id);
          } catch (preErr) {
            console.error(`⚠️ Error deploying pre-contest bots for ${t.name}:`, preErr.message);
          }
        }
      }

      // 1. Lock tournaments that have passed their lock_time
      const toLock = await Tournament.findAll({
        where: {
          status: 'upcoming',
          lock_time: { [Op.lte]: now },
          start_time: { [Op.gt]: now },
        },
      });
      for (const t of toLock) {
        await t.update({ status: 'locked' });
        await Team.update({ is_locked: true }, { where: { tournament_id: t.id } });
        console.log(`🔒 Tournament locked: ${t.name}`);
      }

      // 2. Start tournaments and take start snapshots
      const toStart = await Tournament.findAll({
        where: {
          status: { [Op.in]: ['upcoming', 'locked'] },
          start_time: { [Op.lte]: now },
          end_time: { [Op.gt]: now },
        },
      });
      for (const t of toStart) {
        await t.update({ status: 'live' });
        await takeSnapshot(t.id, 'start');
        console.log(`🟢 Tournament started: ${t.name}`);
      }

      // 3. End tournaments: take end snapshots, rearrange 1100 bot teams by ranking tier, calculate final scores, distribute prizes
      const toEnd = await Tournament.findAll({
        where: {
          status: 'live',
          end_time: { [Op.lte]: now },
        },
      });
      for (const t of toEnd) {
        console.log(`🏁 Tournament completed: ${t.name}. Finalizing 1100 bot squads and scores...`);
        await takeSnapshot(t.id, 'end');

        try {
          // Rearrange 1100 bot teams (creators, captain, vice-captain) according to ranking tier with Fair Winner Rotation
          await deployAutonomousBots(t.id);
        } catch (botErr) {
          console.error(`⚠️ Error in autonomous bot rearrangement for ${t.name}:`, botErr.message);
          // Fallback if bot rearrangement encountered an error
          await calculateScores(t.id);
          await distributePrizes(t.id);
        }

        await t.update({ status: 'completed', rankings_finalized: true });
        console.log(`🏆 Tournament fully finalized and paid out: ${t.name}`);
      }

      // 4. Recalculate scores for live tournaments (every 5 minutes)
      if (now.getMinutes() % 5 === 0) {
        const liveTournaments = await Tournament.findAll({
          where: { status: 'live' },
        });
        for (const t of liveTournaments) {
          await takeSnapshot(t.id, 'end');
          await calculateScores(t.id);
        }
      }
    } catch (error) {
      console.error('⚠️ Scheduler error:', error);
    }
  });
}

module.exports = { startScheduler };
