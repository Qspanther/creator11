const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, isAdmin } = require('../middleware/auth');
const { User, Creator, Tournament, Team, Wallet, Transaction, Notification, SystemSetting } = require('../db/models');
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
const upload = multer({ storage: storage });

// All routes require authentication AND admin role
router.use(authenticate);
router.use(isAdmin);

// ─── 0. Dashboard Stats (in USDT) ───
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
      currency: 'USDT',
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
      attributes: { exclude: ['password_hash'] },
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
      attributes: { exclude: ['password_hash'] }
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

router.post('/tournaments', async (req, res) => {
  try {
    const t = await Tournament.create(req.body);

    await Notification.create({
      title: 'New Battle League Available',
      message: `A new ${t.platform} league "${t.name}" (${t.duration_type}) has been created.`,
      type: 'tournament_created'
    });

    res.json(t);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

router.put('/tournaments/:id', async (req, res) => {
  try {
    const t = await Tournament.findByPk(req.params.id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
    
    const oldStatus = t.status;
    await t.update(req.body);

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

// ─── 4. Crypto Gateway Admin Control (USDT TRC20, BEP20, ERC20) ───

// GET /admin/crypto-settings
router.get('/crypto-settings', async (req, res) => {
  try {
    const defaultAddresses = {
      TRC20: 'TYDzsYUEpvnYmQK4WKnMBukZxDHzU4mTRC',
      BEP20: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
      ERC20: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852'
    };

    const settings = await SystemSetting.findAll({
      where: {
        key: ['crypto_trc20_address', 'crypto_bep20_address', 'crypto_erc20_address']
      }
    });

    settings.forEach(s => {
      if (s.key === 'crypto_trc20_address' && s.value) defaultAddresses.TRC20 = s.value;
      if (s.key === 'crypto_bep20_address' && s.value) defaultAddresses.BEP20 = s.value;
      if (s.key === 'crypto_erc20_address' && s.value) defaultAddresses.ERC20 = s.value;
    });

    res.json(defaultAddresses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crypto settings' });
  }
});

// PUT /admin/crypto-settings
router.put('/crypto-settings', async (req, res) => {
  try {
    const { TRC20, BEP20, ERC20 } = req.body;

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

    if (TRC20) await upsertSetting('crypto_trc20_address', TRC20, 'USDT TRC20 Admin Receiving Wallet');
    if (BEP20) await upsertSetting('crypto_bep20_address', BEP20, 'USDT BEP20 Admin Receiving Wallet');
    if (ERC20) await upsertSetting('crypto_erc20_address', ERC20, 'USDT ERC20 Admin Receiving Wallet');

    res.json({ message: 'Crypto receiving wallet addresses updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update crypto settings' });
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

// POST /admin/deposits/:id/approve — 1-Click Approve & Credit USDT Balance
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
      title: 'USDT Deposit Confirmed! 🎉',
      message: `${tx.amount} USDT has been verified and added to your balance. Happy Gaming!`,
      type: 'wallet_deposit_approved'
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Deposit approved and USDT balance credited successfully!', balance: newBalance });
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
        title: 'USDT Deposit Rejected ⚠️',
        message: `Your deposit proof for ${tx.amount} USDT was rejected. Reason: ${reason || 'Invalid TXID'}.`,
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
        title: 'USDT Withdrawal Sent! 💸',
        message: `Your payout of ${Math.abs(tx.amount)} USDT has been successfully transferred to your external wallet.`,
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
        title: 'USDT Withdrawal Cancelled & Refunded',
        message: `Your withdrawal was cancelled and ${Math.abs(tx.amount)} USDT refunded. Reason: ${reason || 'Invalid address'}.`,
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

module.exports = router;
