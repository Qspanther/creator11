// ─── Prize Distribution Engine ───
// New rank-based prize algorithm:
// 1. Rank 1 prize = admin-set prize_pool value (passed through as-is).
// 2. All other ranks are calculated as a % of Rank 1's prize (see tier table).
// 3. Minimum prize threshold = ₹100. If calculated prize < ₹100 → refund path.
// 4. Winners (prize >= ₹100) → wallet credited, 'prize' transaction created.
// 5. Refund users (rank > 1000 or prize < ₹100) → ₹97 credited, ₹2 platform fee retained.
// 6. Updates leaderboard prize_amount for full transparency.
// 7. Creates transaction records and notifications for both paths.
// 8. Prevents duplicate payouts via existing transaction check.

const { Tournament, Leaderboard, Wallet, Transaction, Notification } = require('../db/models');
const sequelize = require('../db/index');

// ── Constants ──────────────────────────────────────────────────────────────
const MIN_PRIZE_AMOUNT = 100; // Minimum prize to qualify as a winner
const PLATFORM_FEE = 2;       // ₹2 platform charge retained on refund
const REFUND_AMOUNT = 97;     // ₹99 entry fee − ₹2 platform fee = ₹97 refund

/**
 * Calculate prize amount for a given rank based on Rank 1 prize.
 *
 * Prize tiers (% of Rank 1 prize):
 *   Rank 1        → prize_pool (as-is)
 *   Rank 2        → 50%
 *   Rank 3        → 25%
 *   Rank 4        → 10%
 *   Rank 5        → 7%
 *   Ranks 6–10    → 4% each
 *   Ranks 11–100  → 2% each
 *   Ranks 101–200 → 1% each
 *   Ranks 201–300 → 0.50% each
 *   Ranks 301–500 → 0.30% each
 *   Ranks 501–750 → 0.15% each
 *   Ranks 751–1000→ 0.10% each
 *   Rank 1001+    → 0 (refund path)
 *
 * @param {number} rank
 * @param {number} rank1Prize - Admin-set Rank 1 prize amount
 * @returns {number} Prize amount in ₹ (0 if refund path)
 */
function calculatePrizeForRank(rank, rank1Prize) {
  if (!rank1Prize || rank1Prize <= 0) return 0;
  const r1 = parseFloat(rank1Prize);

  let pct = 0;
  if (rank === 1) return parseFloat(r1.toFixed(2));
  else if (rank === 2) pct = 0.50;
  else if (rank === 3) pct = 0.25;
  else if (rank === 4) pct = 0.10;
  else if (rank === 5) pct = 0.07;
  else if (rank >= 6 && rank <= 10) pct = 0.04;
  else if (rank >= 11 && rank <= 100) pct = 0.02;
  else if (rank >= 101 && rank <= 200) pct = 0.01;
  else if (rank >= 201 && rank <= 300) pct = 0.005;
  else if (rank >= 301 && rank <= 500) pct = 0.003;
  else if (rank >= 501 && rank <= 750) pct = 0.0015;
  else if (rank >= 751 && rank <= 1000) pct = 0.001;
  else return 0; // rank > 1000 → refund

  return parseFloat((r1 * pct).toFixed(2));
}

/**
 * Distribute prizes and refunds for a tournament based on final rankings.
 * @param {string} tournamentId
 */
async function distributePrizes(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);

  // ── Prevent duplicate payouts ──────────────────────────────────────────
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

  // ── Load leaderboard ───────────────────────────────────────────────────
  const leaderboard = await Leaderboard.findAll({
    where: { tournament_id: tournamentId },
    order: [['rank', 'ASC']],
  });

  if (leaderboard.length === 0) {
    console.log(`No leaderboard entries found for tournament: ${tournament.name}`);
    await tournament.update({ status: 'completed', rankings_finalized: true });
    return;
  }

  // Rank 1 prize is the admin-set prize_pool — passed through as-is
  const rank1Prize = parseFloat(tournament.prize_pool) || 0;

  const t = await sequelize.transaction();

  try {
    let totalPrizesPaid = 0;
    let totalRefundsPaid = 0;
    let winnerCount = 0;
    let refundCount = 0;

    for (const entry of leaderboard) {
      const calculatedPrize = calculatePrizeForRank(entry.rank, rank1Prize);

      // Determine if this participant is a winner or gets a refund
      const isWinner = calculatedPrize >= MIN_PRIZE_AMOUNT;

      const wallet = await Wallet.findOne({ where: { user_id: entry.user_id }, transaction: t });
      if (!wallet) continue;

      const currentBalance = parseFloat(wallet.balance) || 0;

      if (isWinner) {
        // ── WINNER PATH ─────────────────────────────────────────────────
        const newBalance = currentBalance + calculatedPrize;
        await wallet.update({ balance: newBalance }, { transaction: t });

        await Transaction.create({
          wallet_id: wallet.id,
          type: 'prize',
          amount: calculatedPrize,
          status: 'completed',
          reference_tournament_id: tournamentId,
          description: `Prize Winner - Rank #${entry.rank} in ${tournament.name}`,
        }, { transaction: t });

        // Update leaderboard prize amount for transparency
        await entry.update({ prize_amount: calculatedPrize }, { transaction: t });

        await Notification.create({
          user_id: entry.user_id,
          title: '🏆 Contest Prize Credited!',
          message: `Congratulations! You secured Rank #${entry.rank} in "${tournament.name}" and won ₹${calculatedPrize.toLocaleString('en-IN')}! Your prize has been credited to your wallet.`,
          type: 'prize_payout',
        }, { transaction: t }).catch(() => null);

        totalPrizesPaid += calculatedPrize;
        winnerCount++;
      } else {
        // ── REFUND PATH ─────────────────────────────────────────────────
        // Calculated prize < ₹100 (or rank > 1000) → ₹97 refund, ₹2 platform fee retained
        const newBalance = currentBalance + REFUND_AMOUNT;
        await wallet.update({ balance: newBalance }, { transaction: t });

        // Credit ₹97 refund transaction
        await Transaction.create({
          wallet_id: wallet.id,
          type: 'refund',
          amount: REFUND_AMOUNT,
          status: 'completed',
          reference_tournament_id: tournamentId,
          description: `Entry Refund - Rank #${entry.rank} in ${tournament.name} (₹2 platform fee deducted)`,
        }, { transaction: t });

        // Record ₹2 platform fee as a separate debit transaction for accounting
        await Transaction.create({
          wallet_id: wallet.id,
          type: 'platform_fee',
          amount: -PLATFORM_FEE, // negative = debit / fee charged
          status: 'completed',
          reference_tournament_id: tournamentId,
          description: `Platform Fee - Rank #${entry.rank} in ${tournament.name}`,
        }, { transaction: t });

        // Record refund amount on leaderboard entry for transparency
        await entry.update({ prize_amount: REFUND_AMOUNT }, { transaction: t });

        await Notification.create({
          user_id: entry.user_id,
          title: '🛡️ ₹97 Refunded • ₹2 Platform Fee',
          message: `Rank #${entry.rank} in "${tournament.name}". Your ₹99 entry fee has been processed: ₹97 refunded to your wallet (₹2 platform fee deducted).`,
          type: 'contest_refund',
        }, { transaction: t }).catch(() => null);

        totalRefundsPaid += REFUND_AMOUNT;
        refundCount++;
      }
    }

    // ── Mark tournament completed ──────────────────────────────────────
    await tournament.update({
      status: 'completed',
      rankings_finalized: true,
    }, { transaction: t });

    await t.commit();
    console.log(`[PrizeDistribution] Tournament "${tournament.name}" finalized!`);
    console.log(`   Winners: ${winnerCount} (Total Paid: ₹${totalPrizesPaid.toFixed(2)})`);
    console.log(`   Refunds: ${refundCount} (Total Refunded: ₹${totalRefundsPaid.toFixed(2)}, Platform Fees Retained: ₹${(refundCount * PLATFORM_FEE).toFixed(2)})`);
  } catch (error) {
    await t.rollback();
    console.error(`Prize distribution failed for "${tournament.name}":`, error);
    throw error;
  }
}

module.exports = { distributePrizes, calculatePrizeForRank };
