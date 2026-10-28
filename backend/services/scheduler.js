// ─── Scheduler ───
// node-cron jobs that manage tournament lifecycle:
// 1. Lock tournaments 30 minutes before start
// 2. Take start snapshots at tournament start time
// 3. Periodically recalculate scores during live tournaments
// 4. Take end snapshots and distribute prizes when tournaments end

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Tournament, Team } = require('../db/models');
const { takeSnapshot, calculateScores } = require('./scoring-engine');
const { distributePrizes } = require('./prize-distribution');

function startScheduler() {
  console.log('⏰ Starting tournament scheduler...');

  // Run every minute to check tournament state transitions
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

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

      // 3. End tournaments, take end snapshots, calculate final scores, distribute prizes
      const toEnd = await Tournament.findAll({
        where: {
          status: 'live',
          end_time: { [Op.lte]: now },
        },
      });
      for (const t of toEnd) {
        await takeSnapshot(t.id, 'end');
        await calculateScores(t.id);
        await distributePrizes(t.id);
        console.log(`🏁 Tournament completed: ${t.name}`);
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
