const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Contest, ContestParticipant, Team, Wallet, Transaction } = require('../db/models');
const sequelize = require('../db/index');
const smartEngine = require('../services/smart-engine');

const router = express.Router();

// POST /contests/:id/join — Prioritized user_contest lane
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const contestId = req.params.id;
    const { teamId } = req.body;
    const userId = req.userId || (req.user ? req.user.id : null);

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!teamId) return res.status(400).json({ error: "Team ID is required" });

    const result = await smartEngine.execute('contest', async () => {
      const transaction = await sequelize.transaction();
      try {
        const contest = await Contest.findByPk(contestId, { transaction });
        if (!contest) {
          await transaction.rollback();
          return { errorStatus: 404, data: { error: "Contest not found" } };
        }

        if (contest.status !== 'upcoming') {
          await transaction.rollback();
          return { errorStatus: 400, data: { error: "Contest is not upcoming" } };
        }
        if (contest.joined_participants >= contest.max_participants) {
          await transaction.rollback();
          return { errorStatus: 400, data: { error: "Contest is full" } };
        }

        const team = await Team.findOne({ where: { id: teamId, user_id: userId }, transaction });
        if (!team) {
          await transaction.rollback();
          return { errorStatus: 400, data: { error: "Team not found or you don't own it" } };
        }

        const wallet = await Wallet.findOne({ where: { user_id: userId }, transaction });
        if (!wallet) {
          await transaction.rollback();
          return { errorStatus: 400, data: { error: "Wallet not found" } };
        }

        const fee = parseFloat(contest.entry_fee) || 99.00;
        if (parseFloat(wallet.balance) < fee) {
          await transaction.rollback();
          return {
            errorStatus: 400,
            data: {
              error: `Insufficient balance. ₹${fee.toFixed(2)} required to join.`,
              requiresDeposit: true,
              requiredAmount: fee,
              redirectTo: '/wallet?required=99'
            }
          };
        }

        const existing = await ContestParticipant.findOne({ where: { contest_id: contestId, team_id: teamId }, transaction });
        if (existing) {
          await transaction.rollback();
          return { errorStatus: 400, data: { error: "This team has already joined this contest" } };
        }

        if (parseFloat(contest.entry_fee) > 0) {
          wallet.balance = parseFloat(wallet.balance) - parseFloat(contest.entry_fee);
          await wallet.save({ transaction });

          await Transaction.create({
            wallet_id: wallet.id,
            amount: contest.entry_fee,
            type: 'contest_entry',
            description: `Entry fee for ${contest.name}`
          }, { transaction });
        }

        const participant = await ContestParticipant.create({
          contest_id: contest.id,
          team_id: team.id,
          user_id: userId,
        }, { transaction });

        contest.joined_participants += 1;
        await contest.save({ transaction });

        await transaction.commit();
        return { status: 200, data: participant };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, true);

    if (result.errorStatus) {
      return res.status(result.errorStatus).json(result.data);
    }
    return res.status(result.status || 200).json(result.data);
  } catch (error) {
    console.error('Join contest error:', error);
    res.status(400).json({ error: error.message || 'Failed to join contest' });
  }
});

module.exports = router;
