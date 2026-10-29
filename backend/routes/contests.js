const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Contest, ContestParticipant, Team, Wallet, Transaction } = require('../db/models');
const sequelize = require('../db/index');

const router = express.Router();

// POST /contests/:id/join
router.post('/:id/join', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contestId = req.params.id;
    const { teamId } = req.body;
    const userId = req.userId || (req.user ? req.user.id : null);

    if (!userId) throw new Error("Unauthorized");
    if (!teamId) throw new Error("Team ID is required");

    // Fetch dependencies
    const contest = await Contest.findByPk(contestId, { transaction });
    if (!contest) throw new Error("Contest not found");

    if (contest.status !== 'upcoming') throw new Error("Contest is not upcoming");
    if (contest.joined_participants >= contest.max_participants) throw new Error("Contest is full");

    const team = await Team.findOne({ where: { id: teamId, user_id: userId }, transaction });
    if (!team) throw new Error("Team not found or you don't own it");

    const wallet = await Wallet.findOne({ where: { user_id: userId }, transaction });
    if (!wallet) throw new Error("Wallet not found");

    const fee = parseFloat(contest.entry_fee) || 99.00;
    if (parseFloat(wallet.balance) < fee) {
      return res.status(400).json({ error: `Insufficient balance. ₹${fee.toFixed(2)} required to join.`, requiresDeposit: true, requiredAmount: fee, redirectTo: '/wallet?required=99' });
    }

    // Check if already joined
    const existing = await ContestParticipant.findOne({ where: { contest_id: contestId, team_id: teamId }, transaction });
    if (existing) throw new Error("This team has already joined this contest");

    // Deduct balance if fee > 0
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

    // Join the contest
    const participant = await ContestParticipant.create({
      contest_id: contest.id,
      team_id: team.id,
      user_id: userId,
    }, { transaction });

    // Update joined count
    contest.joined_participants += 1;
    await contest.save({ transaction });

    await transaction.commit();
    res.json(participant);
  } catch (error) {
    await transaction.rollback();
    console.error('Join contest error:', error);
    res.status(400).json({ error: error.message || 'Failed to join contest' });
  }
});

module.exports = router;
