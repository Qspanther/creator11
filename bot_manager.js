/**
 * ★★★ CREATOR11 BOT MANAGER & CONTROLLER ★★★
 * 
 * Standalone Bot Network Leadership & Control System
 * 
 * Communication:
 * - 100% decoupled from backend internals
 * - Communicates strictly via HTTP REST API with secret `x-bot-api-key`
 * 
 * Features:
 * - Controls and leads 300 unique registered bots
 * - Special Access: Allows bots to form teams in completed or locked contests
 * - Smart 11-player lineup generator following all Creator11 rules
 * - Recalculates scores & checks Top 100 Leaderboards
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Configuration
const CONFIG = {
  API_BASE_URL: process.env.CREATOR11_API_URL || 'http://localhost:5000',
  BOT_API_KEY: process.env.BOT_API_KEY || 'c11_bot_mgr_sec_9938a7fbc21d49e',
  TOTAL_BOTS: 300,
  DEFAULT_COMPLETED_TOURNAMENT_ID: '0b46906f-97df-478a-9ed1-451c24fda5c4', // YouTube Mega Championship (Completed)
  DEFAULT_LIVE_TOURNAMENT_ID: 'b9bdbc3a-df26-4746-b9f6-7a9152703fc3', // YouTube Daily Battle (24-Hour)
};

/**
 * Lightweight HTTP client for API communication
 */
function apiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(`${CONFIG.API_BASE_URL}${endpoint}`);
    const isHttps = fullUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const payload = data ? JSON.stringify(data) : null;

    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (isHttps ? 443 : 80),
      path: `${fullUrl.pathname}${fullUrl.search || ''}`,
      method: method,
      headers: {
        'x-bot-api-key': CONFIG.BOT_API_KEY,
        'Content-Type': 'application/json',
      }
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`API Error [${res.statusCode}]: ${json.error || body}`));
          }
        } catch (err) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Network error connecting to Creator11 API (${CONFIG.API_BASE_URL}): ${err.message}`));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

class BotManager {
  constructor(apiKey = CONFIG.BOT_API_KEY, baseUrl = CONFIG.API_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * 1. Get status of Bot Network and system
   */
  async getStatus() {
    return await apiRequest('/bot-manager/status', 'GET');
  }

  /**
   * 2. List all 300 registered bots
   */
  async listBots() {
    return await apiRequest('/bot-manager/bots', 'GET');
  }

  /**
   * 3. List all tournaments
   */
  async listTournaments() {
    return await apiRequest('/bot-manager/tournaments', 'GET');
  }

  /**
   * 4. Command bots to join a tournament (Supports both live and completed contests via Special Bot Access!)
   * @param {string} tournamentId 
   * @param {number} count Number of bots to deploy (up to 300)
   */
  async deployBots(tournamentId, count = 10) {
    console.log(`🤖 [BotManager] Commanding ${count} bots to deploy into tournament: ${tournamentId}...`);
    return await apiRequest('/bot-manager/batch-join', 'POST', {
      tournamentId,
      botCount: count
    });
  }

  /**
   * 5. Special Access: Command bots to create teams in a COMPLETED contest
   * Specifically targets contests that have already ended and computes their scores!
   */
  async deployToCompletedContest(tournamentId = CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID, count = 20) {
    console.log(`🏆 [BotManager] SPECIAL ACCESS: Deploying ${count} bots into COMPLETED tournament: ${tournamentId}...`);
    return await apiRequest('/bot-manager/batch-join', 'POST', {
      tournamentId,
      botCount: count
    });
  }

  /**
   * 6. Recalculate scores and leaderboard for a tournament
   */
  async recalculateScores(tournamentId) {
    return await apiRequest(`/bot-manager/recalculate/${tournamentId}`, 'POST');
  }

  /**
   * 7. Query Top 100 Leaderboard with bot tags
   */
  async getLeaderboard(tournamentId) {
    return await apiRequest(`/bot-manager/leaderboard/${tournamentId}`, 'GET');
  }
}

// ─── CLI Command Runner ───
async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const manager = new BotManager();

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('      🤖 CREATOR11 BOT MANAGER & CENTRAL COMMAND NETWORK          ');
  console.log('═══════════════════════════════════════════════════════════════════');

  try {
    switch (command) {
      case 'status': {
        const res = await manager.getStatus();
        console.log('✅ Connection to Creator11 API: SUCCESSFUL');
        console.log(`📊 Total Registered Bots: ${res.botNetwork.totalBots}`);
        console.log(`🔑 Bot Manager API Key: Configured`);
        console.log(`⚡ Special Post-Contest Access: ${res.botNetwork.specialPostContestAccess}`);
        console.log('\nActive / Tracked Tournaments:');
        res.tournaments.forEach(t => {
          console.log(`  • [${t.status.toUpperCase().padEnd(9)}] ${t.name} (ID: ${t.id}) | Participants: ${t.current_participants}`);
        });
        break;
      }

      case 'list-bots': {
        const res = await manager.listBots();
        console.log(`✅ Total Bots Loaded: ${res.total}`);
        console.log('Sample Bot Lineup:');
        res.bots.slice(0, 15).forEach((b, i) => {
          console.log(`  [${String(i + 1).padStart(3, '0')}] ${b.name.padEnd(25)} | Email: ${b.email.padEnd(40)} | Wallet: ${b.walletBalance} USDT`);
        });
        if (res.total > 15) {
          console.log(`  ... and ${res.total - 15} more unique bots available in network.`);
        }
        break;
      }

      case 'tournaments': {
        const res = await manager.listTournaments();
        console.log(`Tournaments in System (${res.tournaments.length}):`);
        res.tournaments.forEach(t => {
          console.log(`\n• Tournament: ${t.name}`);
          console.log(`  ID: ${t.id}`);
          console.log(`  Status: ${t.status}`);
          console.log(`  Platform: ${t.platform} | Prize Pool: ${t.prize_pool} USDT`);
          console.log(`  Current Participants: ${t.current_participants}`);
          console.log(`  Duration: ${t.start_time}  TO  ${t.end_time}`);
        });
        break;
      }

      case 'deploy': {
        const tidIndex = args.indexOf('--tournament');
        const countIndex = args.indexOf('--count');

        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_LIVE_TOURNAMENT_ID;
        const count = countIndex !== -1 ? parseInt(args[countIndex + 1], 10) : 10;

        console.log(`Deploying ${count} bots to tournament ID: ${tournamentId}...`);
        const res = await manager.deployBots(tournamentId, count);
        console.log(`✅ ${res.message}`);
        break;
      }

      case 'deploy-completed': {
        const tidIndex = args.indexOf('--tournament');
        const countIndex = args.indexOf('--count');

        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID;
        const count = countIndex !== -1 ? parseInt(args[countIndex + 1], 10) : 20;

        console.log(`⚡ SPECIAL ACCESS: Deploying ${count} bots to COMPLETED contest ID: ${tournamentId}...`);
        const res = await manager.deployToCompletedContest(tournamentId, count);
        console.log(`✅ ${res.message}`);
        console.log(`Rankings & Scores recalculated automatically!`);
        break;
      }

      case 'leaderboard': {
        const tidIndex = args.indexOf('--tournament');
        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID;

        const res = await manager.getLeaderboard(tournamentId);
        console.log(`🏆 Tournament: ${res.tournament.name} (${res.tournament.status.toUpperCase()})`);
        console.log(`Total Ranked Teams: ${res.totalRanked}`);
        console.log('Top 15 Standings:');
        res.leaderboard.slice(0, 15).forEach(e => {
          const botTag = e.isBot ? '[BOT]' : '[USER]';
          console.log(`  #${String(e.rank).padStart(3)} | ${botTag.padEnd(6)} ${e.userName.padEnd(25)} | Points: ${String(e.totalPoints.toFixed(2)).padStart(8)} | Prize: ${e.prizeAmount} USDT`);
        });
        break;
      }

      case 'help':
      default: {
        console.log('Usage: node bot_manager.js <command> [options]\n');
        console.log('Commands:');
        console.log('  status                         Show bot network health and tournament statuses');
        console.log('  list-bots                      List registered bots (300 unique bots)');
        console.log('  tournaments                    List all available tournaments');
        console.log('  deploy [--tournament ID] [--count N]       Command N bots to join a tournament');
        console.log('  deploy-completed [--tournament ID] [--count N] Command bots to create teams in COMPLETED contest');
        console.log('  leaderboard [--tournament ID]  View Top 100 leaderboard with bot tags and scores');
        console.log('  help                           Show this help message');
        console.log('\nEnvironment Variables:');
        console.log('  CREATOR11_API_URL   (default: http://localhost:5000)');
        console.log('  BOT_API_KEY         (default: c11_bot_mgr_sec_9938a7fbc21d49e)');
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error executing bot manager command:', error.message);
  }
}

// Run CLI if called directly
if (require.main === module) {
  runCli();
}

module.exports = {
  BotManager,
  CONFIG
};
