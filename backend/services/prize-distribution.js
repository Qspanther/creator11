// ─── Prize Distribution ───
// Distributes the prize pool to winners based on rank-based payout slabs.
// Credits winnings directly into each winning user's wallet as a transaction.

const config = require('../config');
const { Tournament, Leaderboard, Wallet, Transaction } = require('../db/models');
const sequelize = require('../db/index');

/**
 * Distribute prizes for a completed tournament based on final rankings
 * @param {string} tournamentId
 */
async function distributePrizes(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);
  if (tournament.status === 'completed') {
    console.log(`Tournament ${tournament.name} already completed and prizes distributed.`);
    return;
  }

  const leaderboard = await Leaderboard.findAll({
    where: { tournament_id: tournamentId },
    order: [['rank', 'ASC']],
  });

  if (leaderboard.length === 0) {
    console.log(`No leaderboard entries for tournament ${tournament.name}`);
    return;
  }

  const totalParticipants = leaderboard.length;
  const prizePool = parseFloat(tournament.prize_pool);
  const slabs = config.PRIZE_DISTRIBUTION_SLABS;

  const t = await sequelize.transaction();

  try {
    for (const entry of leaderboard) {
      const rankPercent = ((entry.rank - 1) / totalParticipants) * 100;

      // Find the matching slab
      const slab = slabs.find(s => rankPercent >= s.minRankPercent && rankPercent < s.maxRankPercent);
      if (!slab) continue; // This rank doesn't win anything

      // Calculate individual payout
      // Divide the slab's share evenly among all winners in that slab
      const winnersInSlab = leaderboard.filter(e => {
        const rp = ((e.rank - 1) / totalParticipants) * 100;
        return rp >= slab.minRankPercent && rp < slab.maxRankPercent;
      }).length;

      const slabTotal = prizePool * slab.payoutPercent;
      const individualPayout = parseFloat((slabTotal / winnersInSlab).toFixed(4));

      if (individualPayout <= 0) continue;

      // Credit the wallet
      const wallet = await Wallet.findOne({ where: { user_id: entry.user_id }, transaction: t });
      if (!wallet) continue;

      const currentBalance = parseFloat(wallet.balance) || 0;
      await wallet.update(
        { balance: currentBalance + individualPayout },
        { transaction: t }
      );

      // Create prize transaction
      await Transaction.create({
        wallet_id: wallet.id,
        type: 'prize',
        amount: individualPayout,
        status: 'completed',
        reference_tournament_id: tournamentId,
        description: `Prize - Rank #${entry.rank} in ${tournament.name}`,
      }, { transaction: t });
    }

    // Mark tournament as completed
    await tournament.update({ status: 'completed' }, { transaction: t });

    await t.commit();
    console.log(`💰 Prizes distributed for tournament ${tournament.name}`);
  } catch (error) {
    await t.rollback();
    console.error(`❌ Prize distribution failed for ${tournament.name}:`, error);
    throw error;
  }
}

module.exports = { distributePrizes };
