const { User, Wallet } = require('../db/models');
const { v4: uuidv4 } = require('uuid');

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Muhammad", "Sai", "Ayaan", "Krishna",
  "Ishaan", "Shaurya", "Atharva", "Advik", "Pranav", "Advaith", "Aaryan", "Dhruv", "Kabir", "Ritvik",
  "Aanvi", "Ananya", "Diya", "Ira", "Myra", "Saanvi", "Aadhya", "Kiara", "Pari", "Riya",
  "Avni", "Ahana", "Navya", "Shanaya", "Sara", "Tara", "Anika", "Meera", "Zara", "Vanya",
  "Dev", "Rohan", "Karan", "Kunal", "Sameer", "Varun", "Manish", "Rahul", "Naveen", "Abhishek",
  "Suresh", "Ramesh", "Deepak", "Gaurav", "Vikas", "Amit", "Rajesh", "Sunil", "Anil", "Pooja",
  "Neha", "Sneha", "Priya", "Kavita", "Sunita", "Anita", "Deepa", "Rekha", "Shweta", "Ritu",
  "Harsh", "Yash", "Mohit", "Tarun", "Nikhil", "Akash", "Suraj", "Pankaj", "Chetan", "Tushar"
];

const lastNames = [
  "Sharma", "Patel", "Verma", "Rao", "Mehta", "Singh", "Kumar", "Gupta", "Joshi", "Bhatia",
  "Malhotra", "Kapoor", "Chopra", "Reddy", "Nair", "Pillai", "Iyer", "Menon", "Mukherjee", "Chatterjee",
  "Banerjee", "Das", "Dutta", "Roy", "Bose", "Sengupta", "Choudhury", "Mishra", "Pandey", "Trivedi",
  "Deshmukh", "Kulkarni", "Patil", "Pawar", "Shinde", "Jadhav", "Gaekwad", "Chavan", "Bhosale", "More",
  "Agarwal", "Bansal", "Garg", "Goel", "Jindal", "Mittal", "Singhal", "Tayal", "Kansal", "Bindal"
];

async function seedBots() {
  const currentCount = await User.count({ where: { is_bot: true } });
  console.log(`Current bot count: ${currentCount}`);

  if (currentCount >= 1100) {
    console.log(`Already have ${currentCount} bots (>= 1100). No more bots needed.`);
    return;
  }

  const targetCount = 1100;
  const needed = targetCount - currentCount;
  console.log(`Creating ${needed} additional bots to reach ${targetCount}...`);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const newUsers = [];
  const newWallets = [];

  for (let i = currentCount + 1; i <= targetCount; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${fn} ${ln}`;
    const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const paddedIndex = String(i).padStart(4, '0');
    const email = `bot_${paddedIndex}_${cleanName}@creator11.bot`;
    const userId = uuidv4();
    const cleanPrefix = fn.slice(0, 4).toUpperCase();
    const refCode = `${cleanPrefix}${Math.floor(1000 + Math.random() * 9000)}`;

    newUsers.push({
      id: userId,
      name: fullName,
      role: 'user',
      is_bot: true,
      email,
      password_hash: 'dummy_hash',
      otp_verified: true,
      kyc_status: 'none',
      referral_code: refCode,
      subscription_active_until: oneYearFromNow,
      subscription_type: 'system_unlimited',
      referral_round: 1,
      referrals_in_current_round: 0,
      total_referrals_count: 0,
    });

    newWallets.push({
      id: uuidv4(),
      user_id: userId,
      balance: 10000.00, // ₹10,000 INR
    });
  }

  // Bulk create in chunks of 200
  const CHUNK_SIZE = 200;
  for (let i = 0; i < newUsers.length; i += CHUNK_SIZE) {
    const userChunk = newUsers.slice(i, i + CHUNK_SIZE);
    const walletChunk = newWallets.slice(i, i + CHUNK_SIZE);

    await User.bulkCreate(userChunk);
    await Wallet.bulkCreate(walletChunk);
    console.log(`Saved batch ${i + 1} - ${Math.min(i + CHUNK_SIZE, newUsers.length)}`);
  }

  const total = await User.count({ where: { is_bot: true } });
  console.log(`✅ Successfully seeded! Total bot count is now: ${total}`);
}

module.exports = { seedBots };

if (require.main === module) {
  seedBots().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

