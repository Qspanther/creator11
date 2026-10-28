// ─── Prize Distribution & Never-Lose Guarantee Engine ───
// 1. Top winners with payout >= ₹99 get their full prize pool winnings credited into their wallet.
// 2. All participants who did not win a prize or won < ₹99 get their full ₹99 entry fee 100% refunded to their wallet!
// 3. Updates leaderboard prize_amount for full transparency.
// 4. Creates transaction records and notifications.

const config = require('../config');
const { Tournament, Leaderboard, Wallet, Transaction, Notification } = require('../db/models');
const sequelize = require('../db/index');

/**
 * Distribute prizes and 100% Never-Lose refunds for a tournament based on final rankings.
 * @param {string} tournamentId
 */
async function distributePrizes(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  // Prevent duplicate payouts/refunds
  const existingPayouts = await Transaction.count({
    where: {
      reference_tournament_id: tournamentId,
      type: ['prize', 'refund'],
    },
  });

  if (existingPayouts > 0) {
    console.log(`Tournament "${tournament.name}" prizes & refunds have already been distributed (${existingPayouts} transactions).`);
    if (tournament.status !== 'completed' || !tournament.rankings_finalized) {
      await tournament.update({ status: 'completed', rankings_finalized: true });
    }
    return;
  }

  const leaderboard = await Leaderboard.findAll({
    where: { tournament_id: tournamentId },
    order: [['rank', 'ASC']],
  });

  if (leaderboard.length === 0) {
    console.log(`No leaderboard entries found for tournament: ${tournament.name}`);
    await tournament.update({ status: 'completed', rankings_finalized: true });
    return;
  }

  const totalParticipants = leaderboard.length;
  const prizePool = parseFloat(tournament.prize_pool) || 0;
  const slabs = config.PRIZE_DISTRIBUTION_SLABS || [];
  const entryFee = 99.00; // Fixed ₹99 INR entry fee

  const t = await sequelize.transaction();

  try {
    let totalPrizesPaid = 0;
    let totalRefundsPaid = 0;
    let winnerCount = 0;
    let refundCount = 0;

    for (const entry of leaderboard) {
      const rankPercent = ((entry.rank - 1) / totalParticipants) * 100;
      const slab = slabs.find(s => rankPercent >= s.minRankPercent && rankPercent < s.maxRankPercent);

      let calculatedPayout = 0;
      if (slab) {
        const winnersInSlab = leaderboard.filter(e => {
          const rp = ((e.rank - 1) / totalParticipants) * 100;
          return rp >= slab.minRankPercent && rp < slab.maxRankPercent;
        }).length;

        if (winnersInSlab > 0) {
          const slabTotal = prizePool * slab.payoutPercent;
          calculatedPayout = parseFloat((slabTotal / winnersInSlab).toFixed(2));
        }
      }

      const wallet = await Wallet.findOne({ where: { user_id: entry.user_id }, transaction: t });
      if (!wallet) continue;

      const currentBalance = parseFloat(wallet.balance) || 0;

      // ★★★ NEVER-LOSE GUARANTEE LOGIC ★★★
      // If calculatedPayout >= 99 INR -> Winner gets full prize!
      // If calculatedPayout < 99 INR (or no slab) -> Participant gets their 99 INR entry fee 100% refunded!
      if (calculatedPayout >= entryFee) {
        // WINNER
        const newBalance = currentBalance + calculatedPayout;
        await wallet.update({ balance: newBalance }, { transaction: t });

        await Transaction.create({
          wallet_id: wallet.id,
          type: 'prize',
          amount: calculatedPayout,
          status: 'completed',
          reference_tournament_id: tournamentId,
          description: `Prize Pool Winner - Rank #${entry.rank} in ${tournament.name}`,
        }, { transaction: t });

        await entry.update({ prize_amount: calculatedPayout }, { transaction: t });

        await Notification.create({
          user_id: entry.user_id,
          title: '🏆 Contest Prize Pool Credited!',
          message: `Congratulations! You secured Rank #${entry.rank} in "${tournament.name}" and won ₹${calculatedPayout.toLocaleString('en-IN')}! Winnings have been credited to your INR wallet.`,
          type: 'prize_payout',
        }, { transaction: t }).catch(() => null);

        totalPrizesPaid += calculatedPayout;
        winnerCount++;
      } else {
        // NON-WINNER / LOWER RANK -> 100% NEVER LOSE MONEY-BACK REFUND (₹99.00)
        const refundAmount = entryFee;
        const newBalance = currentBalance + refundAmount;
        await wallet.update({ balance: newBalance }, { transaction: t });

        await Transaction.create({
          wallet_id: wallet.id,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          reference_tournament_id: tournamentId,
          description: `Never Lose 100% Entry Refund - Rank #${entry.rank} in ${tournament.name}`,
        }, { transaction: t });

        // Record refund amount on leaderboard entry for transparency
        await entry.update({ prize_amount: refundAmount }, { transaction: t });

        await Notification.create({
          user_id: entry.user_id,
          title: '🛡️ ₹99 Never-Lose 100% Refund Credited',
          message: `Rank #${entry.rank} in "${tournament.name}". Under our 100% Never-Lose Guarantee, your complete ₹99.00 contest entry fee has been refunded back to your wallet!`,
          type: 'contest_refund',
        }, { transaction: t }).catch(() => null);

        totalRefundsPaid += refundAmount;
        refundCount++;
      }
    }

    // Mark tournament as completed and rankings finalized
    await tournament.update({
      status: 'completed',
      rankings_finalized: true,
    }, { transaction: t });

    await t.commit();
    console.log(`[PrizeDistribution] Tournament "${tournament.name}" finalized!`);
    console.log(`   Winners: ${winnerCount} (Total Paid: ₹${totalPrizesPaid.toFixed(2)})`);
    console.log(`   Never-Lose Refunds: ${refundCount} (Total Refunded: ₹${totalRefundsPaid.toFixed(2)})`);
  } catch (error) {
    await t.rollback();
    console.error(`Prize distribution failed for "${tournament.name}":`, error);
    throw error;
  }
}

module.exports = { distributePrizes };
