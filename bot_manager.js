/**
 * ★★★ CREATOR11 BOT MANAGER & CENTRAL COMMAND NETWORK ★★★
 * 
 * Autonomous Bot Leadership, Continuous Schedule Tracker & Fair-Rotation System
 * 
 * Features:
 * - Hourly / Continuous tracking of upcoming and live contests
 * - 1-Minute Rapid Command Window: automatically deploys 300 bots as soon as a contest completes
 * - Anti-Monopoly & Fair Winner Rotation Engine: every bot eventually wins; no bot monopolizes #1
 * - Locks and unlocks "View Top 100 Winners" once all rankings are fully audited & ready
 * - 100% decoupled from project database: communicates strictly via API Key over HTTP
 */

const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  API_BASE_URL: process.env.CREATOR11_API_URL || 'http://localhost:5000',
  BOT_API_KEY: process.env.BOT_API_KEY || 'c11_bot_mgr_sec_9938a7fbc21d49e',
  TOTAL_BOTS: 300,
  DEFAULT_COMPLETED_TOURNAMENT_ID: '0b46906f-97df-478a-9ed1-451c24fda5c4', // YouTube Mega Championship (Completed)
  DEFAULT_LIVE_TOURNAMENT_ID: 'b9bdbc3a-df26-4746-b9f6-7a9152703fc3', // YouTube Daily Battle (24-Hour)
  DAEMON_POLL_INTERVAL_MS: 30 * 1000, // 30 seconds
  HOURLY_LOG_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
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
   * 2. Real-time schedule of upcoming, live, and completed contests
   */
  async getSchedule() {
    return await apiRequest('/bot-manager/schedule', 'GET');
  }

  /**
   * 3. List all 300 registered bots
   */
  async listBots() {
    return await apiRequest('/bot-manager/bots', 'GET');
  }

  /**
   * 4. Past winners history to inspect fair rotation
   */
  async getWinnersHistory() {
    return await apiRequest('/bot-manager/winners-history', 'GET');
  }

  /**
   * 5. ★★★ Master Command: 300-Bot Autonomous Deployment with Fair Winner Rotation ★★★
   * Automatically executes the 1-minute command window post-contest:
   * - Enforces anti-monopoly fair rotation so a new bot wins every time
   * - Generates 300 unique valid 11-player teams
   * - Finalizes scores and enables "View Top 100 Winners" button!
   */
  async deploy300Autonomous(tournamentId = CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID) {
    console.log(`🤖 [BotManager] COMMAND: Deploying 300 bots into tournament: ${tournamentId}...`);
    console.log(`🎲 [BotManager] Applying Fair Winner Rotation & Anti-Monopoly algorithm...`);
    return await apiRequest('/bot-manager/deploy-300-autonomous', 'POST', {
      tournamentId
    });
  }

  /**
   * 6. Standard batch join
   */
  async deployBots(tournamentId, count = 10) {
    return await apiRequest('/bot-manager/batch-join', 'POST', {
      tournamentId,
      botCount: count
    });
  }

  /**
   * 7. Query Top 100 Leaderboard with bot tags
   */
  async getLeaderboard(tournamentId) {
    return await apiRequest(`/bot-manager/leaderboard/${tournamentId}`, 'GET');
  }

  /**
   * 8. Continuous Autonomous Daemon
   * Continuously tracks contests, checks schedule, and automatically executes 300-bot command
   * as soon as a contest completes!
   */
  async runDaemon() {
    console.log('🤖 [BotManager Daemon] Started autonomous monitoring service...');
    console.log(`⏱️  Daemon Poll Interval: ${CONFIG.DAEMON_POLL_INTERVAL_MS / 1000}s`);
    console.log(`📢 Hourly Schedule Checks: ENABLED`);
    console.log('───────────────────────────────────────────────────────────────────');

    let lastHourlyCheck = 0;
    const processedTournaments = new Set();

    const tick = async () => {
      try {
        const now = Date.now();
        const schedule = await this.getSchedule();

        // 1. Hourly Schedule Diagnostic Log
        if (now - lastHourlyCheck >= CONFIG.HOURLY_LOG_INTERVAL_MS || lastHourlyCheck === 0) {
          lastHourlyCheck = now;
          console.log(`\n📅 [SCHEDULE UPDATE] — ${new Date().toLocaleTimeString()} —`);
          
          if (schedule.liveContests && schedule.liveContests.length > 0) {
            schedule.liveContests.forEach(lc => {
              console.log(`  🔴 LIVE CONTEST: "${lc.name}" | Ends in: ${lc.minutesRemaining} mins | Participants: ${lc.participants}`);
            });
          } else {
            console.log('  ⚪ No live contests running right now.');
          }

          if (schedule.upcomingContests && schedule.upcomingContests.length > 0) {
            schedule.upcomingContests.forEach(uc => {
              console.log(`  ⏳ UPCOMING CONTEST: "${uc.name}" | Starts in: ${uc.minutesUntilStart} mins`);
            });
          }

          if (schedule.completedContests && schedule.completedContests.length > 0) {
            console.log(`  🏁 RECENT COMPLETED CONTESTS: ${schedule.completedContests.length} tracked`);
          }
          console.log('───────────────────────────────────────────────────────────────────\n');
        }

        // 2. Check for completed tournaments that need 300-bot deployment & ranking finalization
        if (schedule.completedContests) {
          for (const c of schedule.completedContests) {
            if (!c.rankingsFinalized && !processedTournaments.has(c.id)) {
              processedTournaments.add(c.id);
              console.log(`\n🚨 [BOT MANAGER ALERT] Contest "${c.name}" has COMPLETED!`);
              console.log(`⚡ [1-MINUTE COMMAND WINDOW] Commanding all 300 bots to build their fantasy teams...`);
              console.log(`🎲 Running Anti-Monopoly & Fair Winner Rotation Engine...`);

              const res = await this.deploy300Autonomous(c.id);

              console.log(`✅ [SUCCESS] ${res.totalTeams} bots deployed!`);
              console.log(`🏆 [NEW ROTATED WINNER]: "${res.winner.botName}" (Rank #1 with ${res.winner.points} pts)`);
              console.log(`🔓 "View Top 100 Winners" button is now UNLOCKED & ENABLED for users!\n`);
            }
          }
        }

        // 3. Check if any live contest has reached its end time
        if (schedule.liveContests) {
          for (const lc of schedule.liveContests) {
            if (lc.minutesRemaining === 0 && !processedTournaments.has(lc.id)) {
              processedTournaments.add(lc.id);
              console.log(`\n🚨 [BOT MANAGER ALERT] Live Contest "${lc.name}" time is UP!`);
              console.log(`⚡ [1-MINUTE COMMAND WINDOW] Commanding all 300 bots to build their fantasy teams...`);
              const res = await this.deploy300Autonomous(lc.id);
              console.log(`✅ [SUCCESS] ${res.totalTeams} bots deployed! Winner: "${res.winner.botName}"!`);
            }
          }
        }
      } catch (err) {
        console.error('⚠️ [BotManager Daemon] Error during schedule tick:', err.message);
      }
    };

    // Run first tick immediately, then setInterval
    await tick();
    setInterval(tick, CONFIG.DAEMON_POLL_INTERVAL_MS);
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
        console.log(`🎲 Fair Winner Rotation Engine: ${res.botNetwork.fairRotationEngine}`);
        console.log('\nTracked Tournaments:');
        res.tournaments.forEach(t => {
          const rankStatus = t.rankings_finalized ? 'FINALIZED' : 'PROCESSING...';
          console.log(`  • [${t.status.toUpperCase().padEnd(9)}] ${t.name.padEnd(40)} | Participants: ${String(t.current_participants).padStart(3)} | Rankings: ${rankStatus}`);
        });
        break;
      }

      case 'schedule': {
        const res = await manager.getSchedule();
        console.log(`🕒 Server Time: ${new Date(res.currentTime).toLocaleString()}\n`);
        console.log('🔴 LIVE CONTESTS:');
        if (res.liveContests.length === 0) console.log('  None currently active.');
        res.liveContests.forEach(lc => {
          console.log(`  • ${lc.name} (Ends in: ${lc.minutesRemaining} mins) | Participants: ${lc.participants}`);
        });

        console.log('\n⏳ UPCOMING CONTESTS:');
        if (res.upcomingContests.length === 0) console.log('  None scheduled.');
        res.upcomingContests.forEach(uc => {
          console.log(`  • ${uc.name} (Starts in: ${uc.minutesUntilStart} mins) | ID: ${uc.id}`);
        });

        console.log('\n🏁 RECENT COMPLETED CONTESTS:');
        res.completedContests.forEach(cc => {
          const status = cc.rankingsFinalized ? 'FINALIZED (Button Active)' : 'PENDING 300-BOT DEPLOYMENT';
          console.log(`  • ${cc.name} | Status: ${status} | ID: ${cc.id}`);
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

      case 'winners-history': {
        const res = await manager.getWinnersHistory();
        console.log(`📊 Total Recorded Tournament Winners: ${res.totalRecorded}`);
        console.log('\nRecent Top 10 Winners:');
        res.history.slice(0, 10).forEach(h => {
          console.log(`  Rank #${h.rank} | Bot ID: ${h.bot_user_id} | Points: ${h.points} | Date: ${h.created_at}`);
        });
        console.log('\nWin Distribution (Shows rotation works):');
        console.log(res.winCounts);
        break;
      }

      case 'deploy-300':
      case 'trigger-ended': {
        const tidIndex = args.indexOf('--tournament');
        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID;

        console.log(`🚨 Triggering 1-Minute Rapid Command Window for 300 bots on tournament: ${tournamentId}`);
        const res = await manager.deploy300Autonomous(tournamentId);
        console.log(`\n🎉 ${res.message}`);
        console.log(`🏆 NEW ROTATED WINNER: "${res.winner.botName}" (Rank #1 with ${res.winner.points} pts | Prize: ${res.winner.prize} USDT)`);
        console.log(`🔒 Rankings finalized: ${res.rankingsFinalized}`);
        console.log(`👥 Total teams generated: ${res.totalTeams}`);
        console.log(`\nTop 5 Winners Lineup:`);
        res.top10Lineup.slice(0, 5).forEach(e => {
          console.log(`  Rank #${e.rank} | User ID: ${e.userId} | Points: ${e.points}`);
        });
        break;
      }

      case 'leaderboard': {
        const tidIndex = args.indexOf('--tournament');
        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID;

        const res = await manager.getLeaderboard(tournamentId);
        console.log(`🏆 Tournament: ${res.tournament.name} (${res.tournament.status.toUpperCase()})`);
        console.log(`Total Ranked Teams: ${res.totalRanked}`);
        console.log(`Rankings Finalized Status: ${res.tournament.rankings_finalized ? 'YES (Unlocked)' : 'NO (Processing...)'}`);
        console.log('\nTop 15 Standings:');
        res.leaderboard.slice(0, 15).forEach(e => {
          const botTag = e.isBot ? '[BOT]' : '[USER]';
          console.log(`  #${String(e.rank).padStart(3)} | ${botTag.padEnd(6)} ${e.userName.padEnd(25)} | Points: ${String(e.totalPoints.toFixed(2)).padStart(8)} | Prize: ${e.prizeAmount} USDT`);
        });
        break;
      }

      case 'daemon': {
        await manager.runDaemon();
        break;
      }

      case 'help':
      default: {
        console.log('Usage: node bot_manager.js <command> [options]\n');
        console.log('Commands:');
        console.log('  status                         Show bot network health, registered bots, and fair rotation status');
        console.log('  schedule                       Check upcoming, live, and completed contests schedule');
        console.log('  list-bots                      List all 300 unique registered bots');
        console.log('  winners-history                View past winners history and anti-monopoly distribution');
        console.log('  deploy-300 [--tournament ID]   Command all 300 bots to deploy with Fair Winner Rotation');
        console.log('  daemon                         Start the autonomous schedule tracker and auto-deployment daemon');
        console.log('  leaderboard [--tournament ID]  View Top 100 leaderboard with bot tags and scores');
        console.log('  help                           Show this help message');
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error executing bot manager command:', error.message);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  BotManager,
  CONFIG
};
