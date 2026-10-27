const bcrypt = require('bcryptjs');
const { User, Wallet } = require('./db/models');

async function create() {
  try {
    const email = 'test@example.com';
    const password = 'password123';
    const name = 'Test User';
    
    const existing = await User.findOne({ where: { email } });
    if (existing) {
        console.log('User already exists');
        return;
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      name,
      email,
      password_hash,
      phone: '1234567890',
      otp_verified: true,
    });
    
    await Wallet.create({
      user_id: user.id,
      balance: 1000,
    });
    
    console.log(`User created successfully!\nEmail: ${email}\nPassword: ${password}`);
  } catch (err) {
    console.error(err);
  }
}
create().then(() => process.exit(0));
