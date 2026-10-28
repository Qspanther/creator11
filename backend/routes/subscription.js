const express = require('express');
const { authenticate } = require('../middleware/auth');
const { User, Wallet, Transaction, SystemSetting, Notification, ReferralLog } = require('../db/models');
const sequelize = require('../db/index');
const config = require('../config');

const router = express.Router();

// Helper to fetch system setting or fallback
async function getSetting(key, fallback) {
  try {
    const s = await SystemSetting.findOne({ where: { key } });
    return s ? s.value : fallback;
  } catch {
    return fallback;
  }
}

// 1. GET /subscription/status — Current user subscription & 4-round referral roadmap
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const wallet = await Wallet.findOne({ where: { user_id: req.userId } });

    // Read Admin Configured Settings
    const monthlyPrice = parseFloat(await getSetting('subscription_monthly_price', '199'));
    const durationDays = parseInt(await getSetting('subscription_duration_days', '30'));
    const subscriptionEnabled = (await getSetting('subscription_enabled', 'true')) === 'true';

    // 4 Rounds Config
    const round1Target = parseInt(await getSetting('referral_round_1_target', '2'));
    const round1Days = parseInt(await getSetting('referral_round_1_days', '15'));

    const round2Target = parseInt(await getSetting('referral_round_2_target', '3'));
    const round2Days = parseInt(await getSetting('referral_round_2_days', '15'));

    const round3Target = parseInt(await getSetting('referral_round_3_target', '4'));
    const round3Days = parseInt(await getSetting('referral_round_3_days', '15'));

    const round4Target = parseInt(await getSetting('referral_round_4_target', '5'));
    const round4Days = parseInt(await getSetting('referral_round_4_days', '30'));

    const roundsConfig = [
      { round: 1, target: round1Target, rewardDays: round1Days },
      { round: 2, target: round2Target, rewardDays: round2Days },
      { round: 3, target: round3Target, rewardDays: round3Days },
      { round: 4, target: round4Target, rewardDays: round4Days },
    ];

    const now = new Date();
    const isBotOrAdmin = user.is_bot || user.role === 'admin';
    const isActive = isBotOrAdmin
      ? true
      : Boolean(user.subscription_active_until && new Date(user.subscription_active_until) > now);

    const expiresAt = user.subscription_active_until;
    let daysRemaining = 0;
    if (expiresAt && new Date(expiresAt) > now) {
      daysRemaining = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const currentRound = Math.min(user.referral_round || 1, 5);
    const activeRoundInfo = roundsConfig.find(r => r.round === currentRound) || roundsConfig[3];

    // Build Roadmap Status
    const roadmap = roundsConfig.map(r => {
      let status = 'locked';
      if (r.round < currentRound) status = 'completed';
      else if (r.round === currentRound) status = 'active';

      return {
        round: r.round,
        target: r.target,
        rewardDays: r.rewardDays,
        status,
        progress: r.round === currentRound ? (user.referrals_in_current_round || 0) : (r.round < currentRound ? r.target : 0),
      };
    });

    // Recent friends invited
    const referralLogs = await ReferralLog.findAll({
      where: { referrer_user_id: user.id },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    const referredUserIds = referralLogs.map(l => l.referred_user_id);
    const referredUsers = await User.findAll({
      where: { id: referredUserIds },
      attributes: ['id', 'name', 'createdAt'],
    });

    const referralsList = referralLogs.map(l => {
      const u = referredUsers.find(ru => ru.id === l.referred_user_id);
      return {
        id: l.id,
        name: u ? u.name : 'Creator Player',
        round: l.round,
        joinedAt: l.created_at,
      };
    });

    res.json({
      success: true,
      subscription: {
        isEnabled: subscriptionEnabled,
        isActive,
        expiresAt,
        daysRemaining,
        type: user.subscription_type || 'none',
        monthlyPrice,
        durationDays,
      },
      wallet: {
        balance: wallet ? parseFloat(wallet.balance) : 0,
        currencySymbol: '₹',
      },
      referral: {
        code: user.referral_code,
        shareUrl: `${config.FRONTEND_URL}/signup?ref=${user.referral_code}`,
        currentRound,
        referralsInCurrentRound: user.referrals_in_current_round || 0,
        targetForCurrentRound: activeRoundInfo.target,
        rewardDaysForCurrentRound: activeRoundInfo.rewardDays,
        totalReferralsCount: user.total_referrals_count || 0,
        hasCompletedAllRounds: currentRound > 4,
        roadmap,
        recentReferrals: referralsList,
      },
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// 2. POST /subscription/purchase — Purchase 30-Day Monthly Pass using Wallet Balance
router.post('/purchase', authenticate, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const wallet = await Wallet.findOne({ where: { user_id: req.userId }, transaction: t });
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const monthlyPrice = parseFloat(await getSetting('subscription_monthly_price', '199'));
    const durationDays = parseInt(await getSetting('subscription_duration_days', '30'));
    const balance = parseFloat(wallet.balance) || 0;

    if (balance < monthlyPrice) {
      await t.rollback();
      return res.status(400).json({
        error: `Insufficient wallet balance. Monthly pass is ₹${monthlyPrice.toFixed(2)}, but you have ₹${balance.toFixed(2)}.`,
        requiresDeposit: true,
        requiredAmount: monthlyPrice,
        currentBalance: balance,
        redirectTo: `/wallet?required=${monthlyPrice}`,
      });
    }

    // Deduct subscription fee
    const newBalance = balance - monthlyPrice;
    await wallet.update({ balance: newBalance }, { transaction: t });

    // Create transaction log
    await Transaction.create({
      wallet_id: wallet.id,
      type: 'subscription',
      amount: -monthlyPrice,
      status: 'completed',
      description: `Monthly Tournament Pass (${durationDays} Days) - Creator Entertainment League`,
    }, { transaction: t });

    // Compute new expiry date
    const now = new Date();
    let newExpiry;
    if (user.subscription_active_until && new Date(user.subscription_active_until) > now) {
      // Extend existing subscription
      newExpiry = new Date(new Date(user.subscription_active_until).getTime() + durationDays * 24 * 60 * 60 * 1000);
    } else {
      newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    await user.update({
      subscription_active_until: newExpiry,
      subscription_type: 'paid_monthly',
    }, { transaction: t });

    await Notification.create({
      user_id: user.id,
      title: '👑 Monthly Pass Activated!',
      message: `Your monthly subscription is now active until ${newExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. You can now compete in all live & upcoming tournaments!`,
      type: 'subscription_success',
    }, { transaction: t });

    await t.commit();

    console.log(`👑 User "${user.name}" purchased Monthly Pass for ₹${monthlyPrice}. Valid until: ${newExpiry.toISOString()}`);

    res.json({
      success: true,
      message: 'Monthly subscription activated successfully!',
      subscriptionActiveUntil: newExpiry,
      subscriptionType: 'paid_monthly',
      remainingBalance: newBalance,
    });
  } catch (error) {
    await t.rollback();
    console.error('Subscription purchase error:', error);
    res.status(500).json({ error: error.message || 'Failed to purchase subscription' });
  }
});

module.exports = router;
