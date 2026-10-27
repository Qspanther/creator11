const SystemSetting = require('./SystemSetting');
const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Creator = require('./Creator');
const Tournament = require('./Tournament');
const Team = require('./Team');
const TeamCreator = require('./TeamCreator');
const CreatorStatsSnapshot = require('./CreatorStatsSnapshot');
const Score = require('./Score');
const Leaderboard = require('./Leaderboard');
const Notification = require('./Notification');
const Contest = require('./Contest');
const ContestParticipant = require('./ContestParticipant');

// ─── Associations ───

// User <-> Wallet (1:1)
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'user_id' });

// Wallet <-> Transaction (1:N)
Wallet.hasMany(Transaction, { foreignKey: 'wallet_id', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id' });

// User <-> Team (1:N)
User.hasMany(Team, { foreignKey: 'user_id', as: 'teams' });
Team.belongsTo(User, { foreignKey: 'user_id' });

// Tournament <-> Team (1:N)
Tournament.hasMany(Team, { foreignKey: 'tournament_id', as: 'teams' });
Team.belongsTo(Tournament, { foreignKey: 'tournament_id' });

// Team <-> TeamCreator (1:N)
Team.hasMany(TeamCreator, { foreignKey: 'team_id', as: 'teamCreators' });
TeamCreator.belongsTo(Team, { foreignKey: 'team_id' });

// Creator <-> TeamCreator (1:N)
Creator.hasMany(TeamCreator, { foreignKey: 'creator_id' });
TeamCreator.belongsTo(Creator, { foreignKey: 'creator_id', as: 'creator' });

// Team <-> Creator (M:N through TeamCreator)
Team.belongsToMany(Creator, { through: TeamCreator, foreignKey: 'team_id', otherKey: 'creator_id', as: 'creators' });
Creator.belongsToMany(Team, { through: TeamCreator, foreignKey: 'creator_id', otherKey: 'team_id', as: 'teams' });

// Captain/Vice-Captain refs
Team.belongsTo(Creator, { foreignKey: 'captain_creator_id', as: 'captain' });
Team.belongsTo(Creator, { foreignKey: 'vice_captain_creator_id', as: 'viceCaptain' });

// Creator <-> CreatorStatsSnapshot (1:N)
Creator.hasMany(CreatorStatsSnapshot, { foreignKey: 'creator_id', as: 'snapshots' });
CreatorStatsSnapshot.belongsTo(Creator, { foreignKey: 'creator_id' });

// Tournament <-> CreatorStatsSnapshot (1:N)
Tournament.hasMany(CreatorStatsSnapshot, { foreignKey: 'tournament_id' });
CreatorStatsSnapshot.belongsTo(Tournament, { foreignKey: 'tournament_id' });

// Team <-> Score (1:N)
Team.hasMany(Score, { foreignKey: 'team_id', as: 'scores' });
Score.belongsTo(Team, { foreignKey: 'team_id' });

// Creator <-> Score (1:N)
Creator.hasMany(Score, { foreignKey: 'creator_id' });
Score.belongsTo(Creator, { foreignKey: 'creator_id' });

// Tournament <-> Leaderboard (1:N)
Tournament.hasMany(Leaderboard, { foreignKey: 'tournament_id', as: 'leaderboard' });
Leaderboard.belongsTo(Tournament, { foreignKey: 'tournament_id' });

// Team <-> Leaderboard (1:1 per tournament)
Team.hasOne(Leaderboard, { foreignKey: 'team_id', as: 'leaderboardEntry' });
Leaderboard.belongsTo(Team, { foreignKey: 'team_id' });

// User <-> Leaderboard
User.hasMany(Leaderboard, { foreignKey: 'user_id' });
Leaderboard.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Tournament <-> Contest
Tournament.hasMany(Contest, { foreignKey: 'tournament_id', as: 'contests' });
Contest.belongsTo(Tournament, { foreignKey: 'tournament_id' });

// Contest <-> ContestParticipant
Contest.hasMany(ContestParticipant, { foreignKey: 'contest_id', as: 'participants' });
ContestParticipant.belongsTo(Contest, { foreignKey: 'contest_id' });

// User <-> ContestParticipant
User.hasMany(ContestParticipant, { foreignKey: 'user_id' });
ContestParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Team <-> ContestParticipant
Team.hasMany(ContestParticipant, { foreignKey: 'team_id', as: 'contestEntries' });
ContestParticipant.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

module.exports = {
  SystemSetting,
  User,
  Wallet,
  Transaction,
  Creator,
  Tournament,
  Team,
  TeamCreator,
  CreatorStatsSnapshot,
  Score,
  Leaderboard,
  Notification,
  Contest,
  ContestParticipant,
};
