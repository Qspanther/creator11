const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Wallet } = require('../db/models');

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Generate OTP (mock — displayed, not sent)
    const otp_code = String(Math.floor(100000 + Math.random() * 900000));
    const otp_expires_at = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Create user
    const user = await User.create({
      name,
      email,
      password_hash,
      phone: phone || null,
      otp_code,
      otp_expires_at,
      otp_verified: false,
    });

    // Create wallet with initial balance
    await Wallet.create({
      user_id: user.id,
      balance: config.INITIAL_WALLET_BALANCE,
    });

    console.log(`📧 MOCK OTP for ${email}: ${otp_code}`);

    res.status(201).json({
      message: 'Account created. Please verify OTP.',
      userId: user.id,
      email: user.email,
      // MOCK: Display OTP since we can't send real SMS/email
      mockOtp: otp_code,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.otp_verified) {
      return res.status(400).json({ error: 'OTP already verified' });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    await user.update({ otp_verified: true, otp_code: null });

    // Issue JWT
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRY,
    });

    res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.otp_verified) {
      // Generate new OTP
      const otp_code = String(Math.floor(100000 + Math.random() * 900000));
      const otp_expires_at = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);
      await user.update({ otp_code, otp_expires_at });

      console.log(`📧 MOCK OTP for ${email}: ${otp_code}`);

      return res.status(403).json({
        error: 'OTP not verified',
        requiresOtp: true,
        mockOtp: otp_code,
      });
    }

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRY,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        kycStatus: user.kyc_status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me (get current user)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      kycStatus: user.kyc_status,
      otpVerified: user.otp_verified,
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
