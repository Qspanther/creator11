const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Wallet, SystemSetting, ReferralLog, Notification } = require('../db/models');

const { authenticate } = require('../middleware/auth');
const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, promoCode, referralCode } = req.body;

    const cleanName = String(name || '').trim().slice(0, 100);
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (cleanPassword.length > 128) {
      return res.status(400).json({ error: 'Password cannot exceed 128 characters' });
    }

    // Check if user exists
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate clean personal referral promo code for this new user
    const cleanPrefix = (name || 'USER').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newReferralCode = `${cleanPrefix || 'CEL'}${randomSuffix}`;

    // Validate referrer promo code if provided
    let referrer = null;
    const incomingCode = (promoCode || referralCode || '').trim().toUpperCase();
    if (incomingCode) {
      referrer = await User.findOne({ where: { referral_code: incomingCode } });
    }

    // Hash password
    const password_hash = await bcrypt.hash(cleanPassword, 10);

    // Generate OTP (mock — displayed, not sent)
    const otp_code = String(Math.floor(100000 + Math.random() * 900000));
    const otp_expires_at = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Create user
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password_hash,
      phone: phone || null,
      otp_code,
      otp_expires_at,
      otp_verified: false,
      referral_code: newReferralCode,
      referred_by_id: referrer ? referrer.id : null,
      referral_round: 1,
      referrals_in_current_round: 0,
      total_referrals_count: 0,
      subscription_type: 'none',
    });

    // Create wallet with initial balance
    await Wallet.create({
      user_id: user.id,
      balance: config.INITIAL_WALLET_BALANCE,
    });

    // Process Referrer Reward Progression (Up to 4 Rounds)
    if (referrer) {
      try {
        const round = referrer.referral_round || 1;

        // Log referral
        await ReferralLog.create({
          referrer_user_id: referrer.id,
          referred_user_id: user.id,
          round: round,
        });

        // Increment counts
        referrer.total_referrals_count = (referrer.total_referrals_count || 0) + 1;
        referrer.referrals_in_current_round = (referrer.referrals_in_current_round || 0) + 1;

        if (round <= 4) {
          // Read target and reward days for this specific round
          const targetSetting = await SystemSetting.findOne({ where: { key: `referral_round_${round}_target` } });
          const daysSetting = await SystemSetting.findOne({ where: { key: `referral_round_${round}_days` } });

          const defaultTargets = { 1: 2, 2: 3, 3: 4, 4: 5 };
          const defaultDays = { 1: 15, 2: 15, 3: 15, 4: 30 };

          const target = targetSetting ? parseInt(targetSetting.value) : (defaultTargets[round] || 2);
          const rewardDays = daysSetting ? parseInt(daysSetting.value) : (defaultDays[round] || 15);

          if (referrer.referrals_in_current_round >= target) {
            // Milestone Reached: Award Free Access Days!
            const now = new Date();
            const currentExpiry = referrer.subscription_active_until ? new Date(referrer.subscription_active_until) : null;
            let newExpiry;
            if (currentExpiry && currentExpiry > now) {
              newExpiry = new Date(currentExpiry.getTime() + rewardDays * 24 * 60 * 60 * 1000);
            } else {
              newExpiry = new Date(now.getTime() + rewardDays * 24 * 60 * 60 * 1000);
            }

            referrer.subscription_active_until = newExpiry;
            referrer.subscription_type = `referral_round_${round}`;
            referrer.referral_round = round + 1;
            referrer.referrals_in_current_round = 0; // Reset for next round

            await referrer.save();

            await Notification.create({
              user_id: referrer.id,
              title: `🎉 Round ${round} Complete: Free Pass Unlocked!`,
              message: `Woohoo! ${target} friends joined using your promo code "${referrer.referral_code}". You unlocked ${rewardDays} Days of FREE tournament access! Next: Round ${Math.min(round + 1, 4)}.`,
              type: 'referral_reward',
            });
          } else {
            await referrer.save();
            await Notification.create({
              user_id: referrer.id,
              title: '👤 Friend Joined via Your Promo Code!',
              message: `${user.name} joined with your code. You have ${referrer.referrals_in_current_round}/${target} referrals for Round ${round}. Invite ${target - referrer.referrals_in_current_round} more to unlock ${rewardDays} days free tournament access!`,
              type: 'referral_progress',
            });
          }
        } else {
          await referrer.save();
        }
      } catch (refErr) {
        console.error('Error crediting referrer:', refErr);
      }
    }

    console.log(`📧 MOCK OTP for ${email}: ${otp_code}`);

    res.status(201).json({
      message: 'Account created. Please verify OTP.',
      userId: user.id,
      email: user.email,
      referralCode: newReferralCode,
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

    const user = await User.findOne({ where: { email: cleanEmail } });
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
        role: user.role,
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

    const user = await User.findOne({ where: { email: cleanEmail } });
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
        role: user.role,
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

    const now = new Date();
    const hasActiveSubscription = (user.is_bot || user.role === 'admin')
      ? true
      : Boolean(user.subscription_active_until && new Date(user.subscription_active_until) > now);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      kycStatus: user.kyc_status,
      otpVerified: user.otp_verified,
      role: user.role,
      referralCode: user.referral_code,
      subscriptionActiveUntil: user.subscription_active_until,
      subscriptionType: user.subscription_type,
      hasActiveSubscription,
      referralRound: user.referral_round || 1,
      referralsInCurrentRound: user.referrals_in_current_round || 0,
      totalReferralsCount: user.total_referrals_count || 0,
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp_code = String(Math.floor(100000 + Math.random() * 900000));
    const otp_expires_at = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);
    
    await user.update({ otp_code, otp_expires_at });
    console.log(`📧 MOCK RESET OTP for ${email}: ${otp_code}`);

    res.json({ message: 'OTP sent', mockOtp: otp_code });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.otp_code !== otp || new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash, otp_code: null });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /auth/change-password (Requires Auth)
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    if (String(newPassword).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect current password' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized or error changing password' });
  }
});

// PUT /auth/change-email (Requires Auth)
router.put('/change-email', authenticate, async (req, res) => {
  try {
    const { newEmail } = req.body;
    const cleanNewEmail = String(newEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanNewEmail)) return res.status(400).json({ error: 'Invalid email address' });

    const existing = await User.findOne({ where: { email: cleanNewEmail } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ email: cleanNewEmail });
    res.json({ message: 'Email changed successfully' });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized or error changing email' });
  }
});

module.exports = router;
