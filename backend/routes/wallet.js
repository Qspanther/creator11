const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Wallet, Transaction, User, Notification, SystemSetting } = require('../db/models');
const sequelize = require('../db/index');

const router = express.Router();

// Fallback default admin crypto addresses
const DEFAULT_CRYPTO_ADDRESSES = {
  TRC20: 'TYDzsYUEpvnYmQK4WKnMBukZxDHzU4mTRC',
  BEP20: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
  ERC20: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852'
};

// GET /wallet/crypto-addresses (Public or Authenticated)
router.get('/crypto-addresses', async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({
      where: {
        key: ['crypto_trc20_address', 'crypto_bep20_address', 'crypto_erc20_address']
      }
    });

    const addresses = { ...DEFAULT_CRYPTO_ADDRESSES };
    settings.forEach(s => {
      if (s.key === 'crypto_trc20_address' && s.value) addresses.TRC20 = s.value;
      if (s.key === 'crypto_bep20_address' && s.value) addresses.BEP20 = s.value;
      if (s.key === 'crypto_erc20_address' && s.value) addresses.ERC20 = s.value;
    });

    res.json({
      currency: 'USDT',
      networks: {
        TRC20: { name: 'Tron (TRC20)', address: addresses.TRC20, symbol: 'USDT-TRC20', confirmations: 1 },
        BEP20: { name: 'BNB Smart Chain (BEP20)', address: addresses.BEP20, symbol: 'USDT-BEP20', confirmations: 15 },
        ERC20: { name: 'Ethereum (ERC20)', address: addresses.ERC20, symbol: 'USDT-ERC20', confirmations: 12 }
      }
    });
  } catch (error) {
    console.error('Crypto addresses error:', error);
    res.status(500).json({ error: 'Failed to retrieve crypto addresses' });
  }
});

// GET /wallet/balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ where: { user_id: req.userId } });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.json({ balance: parseFloat(wallet.balance), currency: 'USDT' });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /wallet/deposit-request (Submit USDT Deposit Proof with TXID)
router.post('/deposit-request', authenticate, async (req, res) => {
  try {
    const { amount, network, txid } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid USDT amount is required' });
    }

    if (!['TRC20', 'BEP20', 'ERC20'].includes(network)) {
      return res.status(400).json({ error: 'Valid network (TRC20, BEP20, or ERC20) is required' });
    }

    if (!txid || txid.trim().length < 8) {
      return res.status(400).json({ error: 'Valid Transaction Hash (TXID) proof is required' });
    }

    // Check if TXID already exists
    const cleanTxid = txid.trim();
    const existing = await Transaction.findOne({ where: { txid: cleanTxid } });
    if (existing) {
      return res.status(400).json({ error: 'This Transaction Hash (TXID) has already been submitted' });
    }

    const wallet = await Wallet.findOne({ where: { user_id: req.userId } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const tx = await Transaction.create({
      wallet_id: wallet.id,
      type: 'deposit',
      amount: numAmount,
      network,
      txid: cleanTxid,
      status: 'pending',
      description: `USDT (${network}) Deposit - TXID: ${cleanTxid.slice(0, 10)}...`,
    });

    await Notification.create({
      user_id: req.userId,
      title: 'USDT Deposit Submitted',
      message: `Your deposit of ${numAmount} USDT via ${network} is pending verification.`,
      type: 'wallet_deposit',
    });

    res.json({
      message: 'Deposit proof submitted successfully! Balance will be credited upon verification.',
      transaction: tx,
    });
  } catch (error) {
    console.error('Deposit request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /wallet/add-funds (Instant dev/testing mock deposit)
router.post('/add-funds', authenticate, async (req, res) => {
  try {
    const { amount, network } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const t = await sequelize.transaction();
    try {
      const wallet = await Wallet.findOne({ where: { user_id: req.userId }, transaction: t });
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + numAmount;

      await wallet.update({ balance: newBalance }, { transaction: t });

      await Transaction.create({
        wallet_id: wallet.id,
        type: 'deposit',
        amount: numAmount,
        network: network || 'BEP20',
        status: 'completed',
        description: `Direct USDT (${network || 'BEP20'}) Test Credit`,
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

// POST /wallet/withdraw (Submit USDT Withdrawal Request)
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const { amount, network, wallet_address } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    if (!network || !['TRC20', 'BEP20', 'ERC20'].includes(network)) {
      return res.status(400).json({ error: 'Select a valid withdrawal network (TRC20, BEP20, ERC20)' });
    }

    if (!wallet_address || wallet_address.trim().length < 15) {
      return res.status(400).json({ error: 'Valid destination USDT wallet address is required' });
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

      if (currentBalance < numAmount) {
        await t.rollback();
        return res.status(400).json({ error: 'Insufficient USDT balance' });
      }

      const newBalance = currentBalance - numAmount;
      await wallet.update({ balance: newBalance }, { transaction: t });

      const tx = await Transaction.create({
        wallet_id: wallet.id,
        type: 'withdraw',
        amount: -numAmount,
        network,
        wallet_address: wallet_address.trim(),
        status: 'pending',
        description: `USDT (${network}) Withdrawal to ${wallet_address.trim().slice(0, 10)}...`,
      }, { transaction: t });

      await Notification.create({
        user_id: req.userId,
        title: 'Withdrawal Request Submitted',
        message: `Your withdrawal of ${numAmount} USDT (${network}) is pending review.`,
        type: 'wallet_withdrawal',
      }, { transaction: t });

      await t.commit();

      res.json({
        message: 'Withdrawal request submitted successfully! Processing payout.',
        balance: newBalance,
        transaction: tx,
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
      return res.status(400).json({ error: 'Full name and PAN / ID number are required' });
    }

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
