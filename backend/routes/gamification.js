const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Wallet, Transaction } = require('../db/models');
const sequelize = require('../db/index');

// Ensure user_streaks table exists in SQLite
let streaksTableReady = false;
async function initStreaksTable() {
  if (streaksTableReady) return;
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        user_id TEXT PRIMARY KEY,
        streak_count INTEGER DEFAULT 1,
        last_claim_date TEXT,
        total_claims INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    streaksTableReady = true;
  } catch (err) {
    console.error('Error creating user_streaks table:', err.message);
  }
}
initStreaksTable();

const STREAK_REWARDS = [
  { day: 1, reward: 5, label: '₹5 Bonus' },
  { day: 2, reward: 10, label: '₹10 Bonus' },
  { day: 3, reward: 15, label: '₹15 Bonus' },
  { day: 4, reward: 20, label: '₹20 Bonus' },
  { day: 5, reward: 25, label: '₹25 Bonus' },
  { day: 6, reward: 30, label: '₹30 Bonus' },
  { day: 7, reward: 50, label: '👑 ₹50 Mega Pass' },
];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr() {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /gamification/streak — Fetch user's current streak status
router.get('/streak', authenticate, async (req, res) => {
  try {
    await initStreaksTable();
    const userId = req.user.id;
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    const [rows] = await sequelize.query(
      'SELECT * FROM user_streaks WHERE user_id = :userId LIMIT 1',
      { replacements: { userId } }
    );

    let streakRecord = rows && rows[0] ? rows[0] : null;

    if (!streakRecord) {
      return res.json({
        streakCount: 0,
        canClaimToday: true,
        lastClaimDate: null,
        rewards: STREAK_REWARDS,
        nextReward: STREAK_REWARDS[0],
      });
    }

    const lastClaim = streakRecord.last_claim_date;
    const canClaimToday = lastClaim !== today;

    // Check if streak is broken (missed yesterday)
    let currentStreak = streakRecord.streak_count || 1;
    if (canClaimToday && lastClaim !== yesterday && lastClaim !== today) {
      // Streak broken, will reset to 1 on next claim
      currentStreak = 0;
    }

    const nextDayIdx = Math.min(currentStreak, 6);

    res.json({
      streakCount: currentStreak,
      canClaimToday,
      lastClaimDate: lastClaim,
      rewards: STREAK_REWARDS,
      nextReward: STREAK_REWARDS[nextDayIdx],
    });
  } catch (err) {
    console.error('Streak fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// POST /gamification/streak/claim — Claim today's daily streak reward
router.post('/streak/claim', authenticate, async (req, res) => {
  try {
    await initStreaksTable();
    const userId = req.user.id;
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    const [rows] = await sequelize.query(
      'SELECT * FROM user_streaks WHERE user_id = :userId LIMIT 1',
      { replacements: { userId } }
    );

    const streakRecord = rows && rows[0] ? rows[0] : null;

    if (streakRecord && streakRecord.last_claim_date === today) {
      return res.status(400).json({
        error: 'Already claimed today! Come back tomorrow for the next streak bonus.',
        streakCount: streakRecord.streak_count,
        canClaimToday: false,
      });
    }

    let newStreak = 1;
    if (streakRecord) {
      if (streakRecord.last_claim_date === yesterday) {
        newStreak = (streakRecord.streak_count % 7) + 1;
      } else {
        newStreak = 1; // Reset to 1 if broken
      }
    }

    const rewardConfig = STREAK_REWARDS[newStreak - 1] || STREAK_REWARDS[0];
    const rewardAmount = rewardConfig.reward;

    // Credit user's wallet
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }

    const newBalance = (parseFloat(wallet.balance) || 0) + rewardAmount;
    await wallet.update({ balance: newBalance });

    // Record transaction
    await Transaction.create({
      wallet_id: wallet.id,
      amount: rewardAmount,
      type: 'bonus',
      description: `Daily Login Streak Day ${newStreak} Bonus (${rewardConfig.label})`,
      status: 'completed',
    });

    // Update streak record
    await sequelize.query(
      `INSERT INTO user_streaks (user_id, streak_count, last_claim_date, total_claims, updated_at)
       VALUES (:userId, :newStreak, :today, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         streak_count = :newStreak,
         last_claim_date = :today,
         total_claims = total_claims + 1,
         updated_at = CURRENT_TIMESTAMP`,
      { replacements: { userId, newStreak, today } }
    );

    res.json({
      success: true,
      newStreak,
      rewardAmount,
      rewardLabel: rewardConfig.label,
      newBalance,
      message: `🎉 Day ${newStreak} Streak Claimed! Added ₹${rewardAmount} to your wallet!`,
    });
  } catch (err) {
    console.error('Streak claim error:', err);
    res.status(500).json({ error: 'Failed to claim daily streak' });
  }
});

module.exports = router;

