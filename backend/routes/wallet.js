const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Wallet, Transaction, User } = require('../db/models');
const sequelize = require('../db/index');

const router = express.Router();

// GET /wallet/balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ where: { user_id: req.userId } });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.json({ balance: parseFloat(wallet.balance) });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /wallet/add-funds — Mock deposit (instant credit)
router.post('/add-funds', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const t = await sequelize.transaction();
    try {
      const wallet = await Wallet.findOne({ where: { user_id: req.userId }, transaction: t });
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + parseFloat(amount);

      await wallet.update({ balance: newBalance }, { transaction: t });

      await Transaction.create({
        wallet_id: wallet.id,
        type: 'deposit',
        amount: parseFloat(amount),
        status: 'completed',
        description: 'Funds added (mock payment)',
      }, { transaction: t });

      await t.commit();

      res.json({
        message: 'Funds added successfully',
        balance: newBalance,
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /wallet/withdraw — Withdraw with KYC requirement
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Check KYC status
    const user = await User.findByPk(req.userId);
    if (user.kyc_status !== 'verified') {
      return res.status(403).json({ error: 'KYC verification required before withdrawal', kycStatus: user.kyc_status });
    }

    const t = await sequelize.transaction();
    try {
      const wallet = await Wallet.findOne({ where: { user_id: req.userId }, transaction: t });
      const currentBalance = parseFloat(wallet.balance);

      if (currentBalance < amount) {
        await t.rollback();
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      const newBalance = currentBalance - parseFloat(amount);
      await wallet.update({ balance: newBalance }, { transaction: t });

      await Transaction.create({
        wallet_id: wallet.id,
        type: 'withdraw',
        amount: -parseFloat(amount),
        status: 'completed',
        description: 'Withdrawal to bank account',
      }, { transaction: t });

      await t.commit();

      res.json({
        message: 'Withdrawal successful',
        balance: newBalance,
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /wallet/kyc — Submit KYC documents
router.post('/kyc', authenticate, async (req, res) => {
  try {
    const { fullName, panNumber } = req.body;
    if (!fullName || !panNumber) {
      return res.status(400).json({ error: 'Full name and PAN number are required' });
    }

    // ASSUMPTION: KYC is auto-verified (mock). In production, this would
    // trigger a manual review process.
    await User.update(
      { kyc_status: 'verified', kyc_name: fullName, kyc_pan: panNumber },
      { where: { id: req.userId } }
    );

    res.json({ message: 'KYC verified successfully', kycStatus: 'verified' });
  } catch (error) {
    console.error('KYC error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /wallet/transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ where: { user_id: req.userId } });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const transactions = await Transaction.findAll({
      where: { wallet_id: wallet.id },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
