const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, isAdmin } = require('../middleware/auth');
const { User, Creator, Tournament, Team, Wallet, Transaction, Notification, SystemSetting, ReferralLog } = require('../db/models');
const config = require('../config');
const sequelize = require('../db/index');

const router = express.Router();

// Setup Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed.'));
    }
  }
});

// All routes require authentication AND admin role
router.use(authenticate);
router.use(isAdmin);

// ─── 0. Dashboard Stats (in INR) ───
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalCreators = await Creator.count();
    const totalTournaments = await Tournament.count();
    const activeMatches = await Tournament.count({ where: { status: 'live' } });
    
    const investedSum = await Transaction.sum('amount', { where: { type: 'entry_fee', status: 'completed' } });
    const prizeSum = await Tournament.sum('prize_pool');
    const pendingDepositsCount = await Transaction.count({ where: { type: 'deposit', status: 'pending' } });
    const pendingWithdrawalsCount = await Transaction.count({ where: { type: 'withdraw', status: 'pending' } });
    
    const totalInvested = Math.abs(investedSum || 0);
    const totalPrizePool = prizeSum || 0;

    res.json({
      currency: 'INR',
      totalUsers,
      totalCreators,
      totalTournaments,
      activeMatches,
      totalInvested,
      totalPrizePool,
      pendingDepositsCount,
      pendingWithdrawalsCount
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// ─── 1. Users ───
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash', 'otp_code'] },
      include: [{ model: Wallet, as: 'wallet' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'otp_code'] }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const teams = await Team.findAll({
      where: { user_id: req.params.id },
      include: [{ model: Tournament, as: 'Tournament' }],
      order: [['createdAt', 'DESC']],
    });
    
    const wallet = await Wallet.findOne({ where: { user_id: req.params.id } });
    let transactions = [];
    if (wallet) {
      transactions = await Transaction.findAll({
        where: { wallet_id: wallet.id },
        order: [['createdAt', 'DESC']],
      });
    }
    
    res.json({ user, teams, wallet, transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── 2. Creators ───
router.get('/creators', async (req, res) => {
  try {
    const creators = await Creator.findAll({
      order: [['platform', 'ASC'], ['name', 'ASC']],
    });
    res.json(creators);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch creators' });
  }
});

router.put('/creators/:id', async (req, res) => {
  try {
    const creator = await Creator.findByPk(req.params.id);
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    const fields = [
      'name', 'category', 'credit_cost', 'profile_image_url', 
      'profile_url', 'base_views', 'base_likes', 'base_followers',
      'external_channel_id', 'platform'
    ];
    
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        creator[field] = req.body[field];
      }
    }
    
    await creator.save();
    
    await Notification.create({
      title: 'Creator Updated',
      message: `${creator.name}'s details have been updated by admin!`,
      type: 'creator_updated'
    });

    res.json(creator);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update creator' });
  }
});

// POST create new creator
router.post('/creators', async (req, res) => {
  try {
    const creator = await Creator.create(req.body);
    res.json(creator);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create creator' });
  }
});

// ─── 3. Tournaments & 4 Battle Leagues (6h, 24h, 48h, 72h) ───
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await Tournament.findAll({
      order: [['start_time', 'DESC']],
    });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// In-flight creation locks to prevent multiple leagues being created by rapid clicks / parallel requests
const activeCreationLocks = new Set();

router.post('/tournaments', async (req, res) => {
  const cleanName = String(req.body.name || '').trim();
  if (!cleanName) {
    return res.status(400).json({ error: 'Tournament name is required' });
  }

  const lockKey = `${cleanName.toLowerCase()}_${req.body.platform || 'youtube'}`;
  if (activeCreationLocks.has(lockKey)) {
    console.log(`⚠️ Active creation lock hit for "${cleanName}". Preventing duplicate parallel creation.`);
    // Wait for in-flight creation to finish and return that tournament
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 100));
      const existing = await Tournament.findOne({
        where: { name: cleanName, platform: req.body.platform || 'youtube' },
        order: [['createdAt', 'DESC']]
      });
      if (existing) return res.json(existing);
    }
  }

  activeCreationLocks.add(lockKey);

  try {
    const { Op } = require('sequelize');
    const recentDuplicate = await Tournament.findOne({
      where: {
        name: cleanName,
        platform: req.body.platform || 'youtube',
        createdAt: { [Op.gte]: new Date(Date.now() - 30000) }
      }
    });
    if (recentDuplicate) {
      console.log(`⚠️ Prevented duplicate league creation for "${cleanName}". Returning existing tournament.`);
      return res.json(recentDuplicate);
    }

    const entryFee = req.body.entry_fee !== undefined && req.body.entry_fee !== ''
      ? parseFloat(req.body.entry_fee)
      : 99.00;
    const prizePool = req.body.prize_pool !== undefined && req.body.prize_pool !== ''
      ? parseFloat(req.body.prize_pool)
      : 50000.00;
    const data = {
      ...req.body,
      name: cleanName,
      entry_fee: isNaN(entryFee) ? 99.00 : entryFee,
      prize_pool: isNaN(prizePool) ? 50000.00 : prizePool,
    };
    const t = await Tournament.create(data);

        await Notification.create({
      title: 'New Battle League Available',
      message: `A new ${t.platform} league "${t.name}" (${t.duration_type}) has been created.`,
      type: 'tournament_created'
    });

    // Immediately trigger initial bot deployment for newly created league
    try {
      const { registerStaggeredBots } = require('./bot-manager');
      registerStaggeredBots(t.id).catch(err => {
        console.error('Initial staggered bot register error:', err.message);
      });
    } catch (botErr) {
      console.error('Failed to trigger bot manager on tournament create:', botErr.message);
    }

    res.json(t);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tournament: ' + error.message });
  } finally {
    // Keep lock for 5 seconds to absorb any remaining retry attempts
    setTimeout(() => {
      activeCreationLocks.delete(lockKey);
    }, 5000);
  }
});

router.put('/tournaments/:id', async (req, res) => {
  try {
    const t = await Tournament.findByPk(req.params.id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
    
    const oldStatus = t.status;
    const updateData = { ...req.body };
    if (updateData.entry_fee !== undefined && updateData.entry_fee !== '') {
      const parsedFee = parseFloat(updateData.entry_fee);
      if (!isNaN(parsedFee)) updateData.entry_fee = parsedFee;
    }
    if (updateData.prize_pool !== undefined && updateData.prize_pool !== '') {
      const parsedPrize = parseFloat(updateData.prize_pool);
      if (!isNaN(parsedPrize)) updateData.prize_pool = parsedPrize;
    }
    await t.update(updateData);

    if (oldStatus !== 'live' && t.status === 'live') {
      await Notification.create({
        title: 'League is LIVE!',
        message: `The ${t.platform} league "${t.name}" is now live. Follow the action!`,
        type: 'tournament_live'
      });
    }

    res.json(t);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// DELETE /admin/tournaments/:id — Instant Cascade delete using single-pass subqueries
router.delete('/tournaments/:id', async (req, res) => {
  try {
    const { Tournament } = require('../db/models');
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tid = tournament.id;
    const name = tournament.name;

    // Execute instant subquery cascade deletes (executes in <15ms)
    await sequelize.query('DELETE FROM scores WHERE team_id IN (SELECT id FROM teams WHERE tournament_id = :tid)', { replacements: { tid } });
    await sequelize.query('DELETE FROM team_creators WHERE team_id IN (SELECT id FROM teams WHERE tournament_id = :tid)', { replacements: { tid } });
    await sequelize.query('DELETE FROM teams WHERE tournament_id = :tid', { replacements: { tid } });
    await sequelize.query('DELETE FROM leaderboard WHERE tournament_id = :tid', { replacements: { tid } });
    await sequelize.query('DELETE FROM creator_stats_snapshots WHERE tournament_id = :tid', { replacements: { tid } });
    await sequelize.query('DELETE FROM contest_participants WHERE contest_id IN (SELECT id FROM contests WHERE tournament_id = :tid)', { replacements: { tid } });
    await sequelize.query('DELETE FROM contests WHERE tournament_id = :tid', { replacements: { tid } });
    await sequelize.query('DELETE FROM tournaments WHERE id = :tid', { replacements: { tid } });

    console.log(`🗑️ [Admin] Tournament "${name}" (ID: ${tid}) and all associated records deleted instantly.`);
    res.json({ success: true, message: `Tournament "${name}" deleted successfully` });
  } catch (error) {
    console.error('Failed to delete tournament:', error);
    res.status(500).json({ error: 'Failed to delete tournament: ' + error.message });
  }
});

router.post('/tournaments/:id/contests', async (req, res) => {
  try {
    const { Contest } = require('../db/models');
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    
    const contestsData = req.body.contests || [req.body];
    const createdContests = [];
    
    for (const data of contestsData) {
      const contest = await Contest.create({
        ...data,
        tournament_id: tournament.id
      });
      createdContests.push(contest);
    }
    
    res.json(createdContests);
  } catch (error) {
    console.error('Failed to create contests:', error);
    res.status(500).json({ error: 'Failed to create contests' });
  }
});

// ─── 4. INR Payment Gateway & Official Account Settings ───

const DEFAULT_INR_ADMIN_SETTINGS = {
  inr_upi_id: 'creator11.league@upi',
  inr_upi_name: 'Creator Entertainment League',
  inr_bank_name: 'HDFC Bank Ltd',
  inr_account_number: '50200084729104',
  inr_ifsc: 'HDFC0000240',
  inr_account_name: 'Creator Entertainment League Pvt Ltd'
};

// GET /admin/inr-settings (also aliases /admin/crypto-settings)
router.get(['/inr-settings', '/crypto-settings'], async (req, res) => {
  try {
    const keys = Object.keys(DEFAULT_INR_ADMIN_SETTINGS);
    const settings = await SystemSetting.findAll({
      where: { key: keys }
    });

    const result = { ...DEFAULT_INR_ADMIN_SETTINGS };
    settings.forEach(s => {
      if (s.value) result[s.key] = s.value;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch INR settings' });
  }
});

// PUT /admin/inr-settings (also aliases /admin/crypto-settings)
router.put(['/inr-settings', '/crypto-settings'], async (req, res) => {
  try {
    const data = req.body;

    const upsertSetting = async (key, value, description) => {
      if (value !== undefined) {
        const existing = await SystemSetting.findOne({ where: { key } });
        if (existing) {
          await existing.update({ value });
        } else {
          await SystemSetting.create({ key, value, description });
        }
      }
    };

    if (data.inr_upi_id) await upsertSetting('inr_upi_id', data.inr_upi_id.trim(), 'Official Admin UPI ID');
    if (data.inr_upi_name) await upsertSetting('inr_upi_name', data.inr_upi_name.trim(), 'UPI Payee Name');
    if (data.inr_bank_name) await upsertSetting('inr_bank_name', data.inr_bank_name.trim(), 'Corporate Bank Name');
    if (data.inr_account_number) await upsertSetting('inr_account_number', data.inr_account_number.trim(), 'Corporate Account Number');
    if (data.inr_ifsc) await upsertSetting('inr_ifsc', data.inr_ifsc.trim().toUpperCase(), 'Bank IFSC Code');
    if (data.inr_account_name) await upsertSetting('inr_account_name', data.inr_account_name.trim(), 'Account Beneficiary Name');

    res.json({ message: 'INR payment gateway settings updated successfully!' });
  } catch (error) {
    console.error('Update INR settings error:', error);
    res.status(500).json({ error: 'Failed to update INR settings' });
  }
});

// GET /admin/deposits/pending — Queue of pending deposits with TXID
router.get('/deposits/pending', async (req, res) => {
  try {
    const deposits = await Transaction.findAll({
      where: { type: 'deposit', status: 'pending' },
      include: [
        {
          model: Wallet,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'phone'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending deposits' });
  }
});

// POST /admin/deposits/:id/approve — 1-Click Approve & Credit INR Balance
router.post('/deposits/:id/approve', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tx = await Transaction.findByPk(req.params.id, {
      include: [{ model: Wallet, include: [User] }],
      transaction: t
    });

    if (!tx) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (tx.status !== 'pending' || tx.type !== 'deposit') {
      await t.rollback();
      return res.status(400).json({ error: 'Transaction is not in pending deposit state' });
    }

    const wallet = tx.Wallet;
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ error: 'User wallet not found' });
    }

    const newBalance = parseFloat(wallet.balance) + parseFloat(tx.amount);
    await wallet.update({ balance: newBalance }, { transaction: t });
    await tx.update({ status: 'completed' }, { transaction: t });

    // Send notification to user
    await Notification.create({
      user_id: wallet.user_id,
      title: 'INR Deposit Confirmed! 🎉',
      message: `₹${tx.amount} has been verified and added to your balance. Happy Gaming!`,
      type: 'wallet_deposit_approved'
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Deposit approved and INR balance credited successfully!', balance: newBalance });
  } catch (error) {
    await t.rollback();
    console.error('Approve deposit error:', error);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

// POST /admin/deposits/:id/reject — Reject Deposit
router.post('/deposits/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const tx = await Transaction.findByPk(req.params.id, {
      include: [{ model: Wallet }]
    });

    if (!tx || tx.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid transaction' });
    }

    await tx.update({
      status: 'rejected',
      description: `${tx.description || 'Deposit'} [REJECTED: ${reason || 'Invalid TXID / No funds received'}]`
    });

    if (tx.Wallet && tx.Wallet.user_id) {
      await Notification.create({
        user_id: tx.Wallet.user_id,
        title: 'INR Deposit Rejected ⚠️',
        message: `Your deposit proof for ₹${tx.amount} was rejected. Reason: ${reason || 'Invalid TXID'}.`,
        type: 'wallet_deposit_rejected'
      });
    }

    res.json({ message: 'Deposit marked as rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
});

// GET /admin/withdrawals/pending — Queue of pending payouts
router.get('/withdrawals/pending', async (req, res) => {
  try {
    const withdrawals = await Transaction.findAll({
      where: { type: 'withdraw', status: 'pending' },
      include: [
        {
          model: Wallet,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'phone'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending withdrawals' });
  }
});

// POST /admin/withdrawals/:id/approve — Complete Payout
router.post('/withdrawals/:id/approve', async (req, res) => {
  try {
    const tx = await Transaction.findByPk(req.params.id, {
      include: [{ model: Wallet }]
    });

    if (!tx || tx.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid transaction' });
    }

    await tx.update({ status: 'completed' });

    if (tx.Wallet && tx.Wallet.user_id) {
      await Notification.create({
        user_id: tx.Wallet.user_id,
        title: 'INR Withdrawal Sent! 💸',
        message: `Your payout of ₹${Math.abs(tx.amount)} has been successfully transferred to your external wallet.`,
        type: 'wallet_withdrawal_approved'
      });
    }

    res.json({ message: 'Withdrawal marked as completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

// POST /admin/withdrawals/:id/reject — Reject and Refund Balance
router.post('/withdrawals/:id/reject', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;
    const tx = await Transaction.findByPk(req.params.id, {
      include: [{ model: Wallet }],
      transaction: t
    });

    if (!tx || tx.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid transaction' });
    }

    const wallet = tx.Wallet;
    if (wallet) {
      const refundAmt = Math.abs(parseFloat(tx.amount));
      await wallet.update({ balance: parseFloat(wallet.balance) + refundAmt }, { transaction: t });
    }

    await tx.update({
      status: 'rejected',
      description: `${tx.description || 'Withdrawal'} [REJECTED: ${reason || 'Invalid Wallet Address'}]`
    }, { transaction: t });

    if (wallet && wallet.user_id) {
      await Notification.create({
        user_id: wallet.user_id,
        title: 'INR Withdrawal Cancelled & Refunded',
        message: `Your withdrawal was cancelled and ₹${Math.abs(tx.amount)} refunded. Reason: ${reason || 'Invalid address'}.`,
        type: 'wallet_withdrawal_rejected'
      }, { transaction: t });
    }

    await t.commit();
    res.json({ message: 'Withdrawal rejected and funds refunded to user' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

// ─── 5. Points Formula & Scoring Engine Config ───

// GET /admin/points-formula
router.get('/points-formula', async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ where: { key: 'points_formula' } });
    if (setting && setting.value) {
      return res.json(JSON.parse(setting.value));
    }

    res.json({
      youtube_views: config.SCORING_WEIGHTS.youtube_views,
      instagram_likes: config.SCORING_WEIGHTS.instagram_likes,
      instagram_followers: config.SCORING_WEIGHTS.instagram_followers,
      captain_multiplier: config.CAPTAIN_MULTIPLIER,
      vice_captain_multiplier: config.VICE_CAPTAIN_MULTIPLIER
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch points formula' });
  }
});

// PUT /admin/points-formula
router.put('/points-formula', async (req, res) => {
  try {
    const { youtube_views, instagram_likes, instagram_followers, captain_multiplier, vice_captain_multiplier } = req.body;
    
    const formula = {
      youtube_views: parseFloat(youtube_views) || 0.0001,
      instagram_likes: parseFloat(instagram_likes) || 0.0001,
      instagram_followers: parseFloat(instagram_followers) || 0.0002,
      captain_multiplier: parseFloat(captain_multiplier) || 2.0,
      vice_captain_multiplier: parseFloat(vice_captain_multiplier) || 1.5,
    };

    config.SCORING_WEIGHTS.youtube_views = formula.youtube_views;
    config.SCORING_WEIGHTS.instagram_likes = formula.instagram_likes;
    config.SCORING_WEIGHTS.instagram_followers = formula.instagram_followers;
    config.CAPTAIN_MULTIPLIER = formula.captain_multiplier;
    config.VICE_CAPTAIN_MULTIPLIER = formula.vice_captain_multiplier;

    const existing = await SystemSetting.findOne({ where: { key: 'points_formula' } });
    if (existing) {
      await existing.update({ value: JSON.stringify(formula) });
    } else {
      await SystemSetting.create({
        key: 'points_formula',
        value: JSON.stringify(formula),
        description: 'Scoring engine weights and multipliers'
      });
    }

    res.json({ message: 'Points formula updated successfully!', formula });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update points formula' });
  }
});

// POST /upload image
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/api-backend/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});


// ─── SUBSCRIPTION & REFERRAL ROUNDS CONTROLS ───

// GET /admin/subscription-settings
router.get('/subscription-settings', authenticate, isAdmin, async (req, res) => {
  try {
    const keys = [
      'subscription_monthly_price',
      'subscription_duration_days',
      'subscription_enabled',
      'referral_round_1_target',
      'referral_round_1_days',
      'referral_round_2_target',
      'referral_round_2_days',
      'referral_round_3_target',
      'referral_round_3_days',
      'referral_round_4_target',
      'referral_round_4_days',
    ];

    const settingsRows = await SystemSetting.findAll({ where: { key: keys } });
    const settingsMap = {};
    settingsRows.forEach(s => { settingsMap[s.key] = s.value; });

    const now = new Date();
    const activeSubscribersCount = await User.count({
      where: {
        is_bot: false,
        subscription_active_until: { [sequelize.Sequelize.Op.gt]: now }
      }
    });

    const paidSubscribersCount = await User.count({
      where: {
        is_bot: false,
        subscription_type: 'paid_monthly',
        subscription_active_until: { [sequelize.Sequelize.Op.gt]: now }
      }
    });

    const referralPassesCount = await User.count({
      where: {
        is_bot: false,
        subscription_type: { [sequelize.Sequelize.Op.like]: 'referral_round_%' },
        subscription_active_until: { [sequelize.Sequelize.Op.gt]: now }
      }
    });

    const totalReferralsMade = await ReferralLog.count();

    res.json({
      settings: {
        subscription_monthly_price: settingsMap.subscription_monthly_price || '199',
        subscription_duration_days: settingsMap.subscription_duration_days || '30',
        subscription_enabled: settingsMap.subscription_enabled || 'true',
        referral_round_1_target: settingsMap.referral_round_1_target || '2',
        referral_round_1_days: settingsMap.referral_round_1_days || '15',
        referral_round_2_target: settingsMap.referral_round_2_target || '3',
        referral_round_2_days: settingsMap.referral_round_2_days || '15',
        referral_round_3_target: settingsMap.referral_round_3_target || '4',
        referral_round_3_days: settingsMap.referral_round_3_days || '15',
        referral_round_4_target: settingsMap.referral_round_4_target || '5',
        referral_round_4_days: settingsMap.referral_round_4_days || '30',
      },
      stats: {
        activeSubscribersCount,
        paidSubscribersCount,
        referralPassesCount,
        totalReferralsMade,
      }
    });
  } catch (error) {
    console.error('Error fetching subscription settings:', error);
    res.status(500).json({ error: 'Failed to fetch subscription settings' });
  }
});

// PUT /admin/subscription-settings
router.put('/subscription-settings', authenticate, isAdmin, async (req, res) => {
  try {
    const allowedKeys = [
      'subscription_monthly_price',
      'subscription_duration_days',
      'subscription_enabled',
      'referral_round_1_target',
      'referral_round_1_days',
      'referral_round_2_target',
      'referral_round_2_days',
      'referral_round_3_target',
      'referral_round_3_days',
      'referral_round_4_target',
      'referral_round_4_days',
    ];

    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        const val = String(req.body[key]).trim();
        const existing = await SystemSetting.findOne({ where: { key } });
        if (existing) {
          await existing.update({ value: val });
        } else {
          await SystemSetting.create({ key, value: val, description: `Admin setting for ${key}` });
        }
      }
    }

    res.json({ success: true, message: 'Subscription & Referral Round settings updated successfully!' });
  } catch (error) {
    console.error('Error updating subscription settings:', error);
    res.status(500).json({ error: 'Failed to update subscription settings' });
  }
});

module.exports = router;
