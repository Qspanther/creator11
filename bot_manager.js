/**
 * ★★★ CREATOR11 BOT MANAGER & CENTRAL COMMAND NETWORK ★★★
 * 
 * Autonomous Bot Leadership, Continuous Schedule Tracker & Fair-Rotation System
 * 
 * Features:
 * - 1100 Autonomous Bots with realistic identities & INR wallets
 * - Pre-Contest Squad Deployment: All 1100 bots enter and lock fantasy teams before contest starts
 * - Post-Contest Tactical Rearrangement: Bots rearrange lineups, captain (2x), and vice-captain (1.5x)
 *   according to their assigned ranking tiers (Rank 1 to 1000 prize tiers, 1001-1100 refund tier)
 * - Anti-Monopoly & Fair Winner Rotation Engine: every bot eventually gets a chance at Rank #1
 * - Hourly / Continuous tracking of upcoming and live contests via daemon
 * - Communicates strictly via API Key over HTTP
 */

const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  API_BASE_URL: process.env.CREATOR11_API_URL || 'http://localhost:5000',
  BOT_API_KEY: process.env.BOT_API_KEY || 'c11_bot_mgr_sec_9938a7fbc21d49e',
  TOTAL_BOTS: 1100,
  DEFAULT_COMPLETED_TOURNAMENT_ID: '0b46906f-97df-478a-9ed1-451c24fda5c4',
  DEFAULT_LIVE_TOURNAMENT_ID: 'b9bdbc3a-df26-4746-b9f6-7a9152703fc3',
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
   * 3. List all registered bots (up to 1100)
   */
  async listBots(limit = 1100) {
    return await apiRequest(`/bot-manager/bots?limit=${limit}`, 'GET');
  }

  /**
   * 4. Past winners history to inspect fair rotation
   */
  async getWinnersHistory() {
    return await apiRequest('/bot-manager/winners-history', 'GET');
  }

  /**
   * 5. ★★★ Pre-Contest Command: All 1100 Bots Build Initial Teams Before Contest Starts ★★★
   */
  async deployPreContest(tournamentId) {
    console.log(`🤖 [BotManager] COMMAND: Deploying pre-contest teams for 1100 bots in tournament: ${tournamentId}...`);
    return await apiRequest('/bot-manager/deploy-pre-contest', 'POST', {
      tournamentId
    });
  }

  /**
   * 6. ★★★ Post-Contest Command: 1100-Bot Rearrangement by Ranking with Fair Winner Rotation ★★★
   * Automatically executes as soon as contest completes:
   * - Enforces anti-monopoly fair rotation so a new bot wins every time
   * - Rearranges players, captain (2x), and vice-captain (1.5x) based on ranking tiers (1 to 1000 prizes, 1001-1100 refunds)
   * - Finalizes scores and triggers prize distribution & never-lose refunds
   */
  async deploy1100Autonomous(tournamentId = CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID) {
    console.log(`🤖 [BotManager] COMMAND: Deploying & rearranging 1100 bots for tournament: ${tournamentId}...`);
    console.log(`🎲 [BotManager] Applying Fair Winner Rotation & Rank-Tier Lineup Rearrangement...`);
    return await apiRequest('/bot-manager/deploy-1100-autonomous', 'POST', {
      tournamentId
    });
  }

  // Backward compatibility alias
  async deploy300Autonomous(tournamentId = CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID) {
    return await this.deploy1100Autonomous(tournamentId);
  }

  /**
   * 7. Standard batch join
   */
  async deployBots(tournamentId, count = 10) {
    return await apiRequest('/bot-manager/batch-join', 'POST', {
      tournamentId,
      botCount: count
    });
  }

  /**
   * 8. Query Leaderboard with bot tags
   */
  async getLeaderboard(tournamentId) {
    return await apiRequest(`/bot-manager/leaderboard/${tournamentId}`, 'GET');
  }

  /**
   * 9. Continuous Autonomous Daemon
   * - Tracks upcoming contests: automatically commands all 1100 bots to build their teams before start
   * - Tracks completed contests: commands all 1100 bots to rearrange teams by ranking, finalize scores, and trigger payouts
   */
  async runDaemon() {
    console.log('🤖 [BotManager Daemon] Started autonomous monitoring service (1100 Bots Network)...');
    console.log(`⏱️  Daemon Poll Interval: ${CONFIG.DAEMON_POLL_INTERVAL_MS / 1000}s`);
    console.log(`📢 Hourly Schedule Checks: ENABLED`);
    console.log('───────────────────────────────────────────────────────────────────');

    let lastHourlyCheck = 0;
    const preContestDeployed = new Set();
    const postContestProcessed = new Set();

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
              console.log(`  ⏳ UPCOMING CONTEST: "${uc.name}" | Starts in: ${uc.minutesUntilStart} mins | Participants: ${uc.participants}`);
            });
          }

          if (schedule.completedContests && schedule.completedContests.length > 0) {
            console.log(`  🏁 RECENT COMPLETED CONTESTS: ${schedule.completedContests.length} tracked`);
          }
          console.log('───────────────────────────────────────────────────────────────────\n');
        }

        // 2. PRE-CONTEST TASK: Automatically build teams for all 1100 bots before contest starts
        if (schedule.upcomingContests) {
          for (const uc of schedule.upcomingContests) {
            if (!preContestDeployed.has(uc.id) && uc.participants < CONFIG.TOTAL_BOTS) {
              preContestDeployed.add(uc.id);
              console.log(`\n⏳ [PRE-CONTEST BOT COMMAND] Upcoming contest "${uc.name}" starts in ${uc.minutesUntilStart} mins!`);
              console.log(`⚡ Commanding all 1100 bots to build their fantasy teams before match start...`);
              const preRes = await this.deployPreContest(uc.id);
              console.log(`✅ [PRE-CONTEST READY] ${preRes.totalTeams} bots successfully locked into "${uc.name}"!\n`);
            }
          }
        }

        // 3. POST-CONTEST TASK: Rearrange teams, captain & vice-captain by ranking tier upon completion
        if (schedule.completedContests) {
          for (const c of schedule.completedContests) {
            if (!c.rankingsFinalized && !postContestProcessed.has(c.id)) {
              postContestProcessed.add(c.id);
              console.log(`\n🚨 [BOT MANAGER ALERT] Contest "${c.name}" has COMPLETED!`);
              console.log(`⚡ [POST-CONTEST TACTICAL REARRANGEMENT] 1100 bots rearranging players, captain & vice-captain by ranking tier...`);
              console.log(`🎲 Running Anti-Monopoly & Fair Winner Rotation Engine...`);

              const res = await this.deploy1100Autonomous(c.id);

              console.log(`✅ [SUCCESS] ${res.totalTeams} bots rearranged and finalized!`);
              console.log(`🏆 [NEW ROTATED WINNER]: "${res.winner.botName}" (Rank #1 with ${res.winner.points} pts)`);
              console.log(`🔓 Leaderboard & prize payouts/refunds are now active!\n`);
            }
          }
        }

        // 4. Check if any live contest has reached its end time
        if (schedule.liveContests) {
          for (const lc of schedule.liveContests) {
            if (lc.minutesRemaining === 0 && !postContestProcessed.has(lc.id)) {
              postContestProcessed.add(lc.id);
              console.log(`\n🚨 [BOT MANAGER ALERT] Live Contest "${lc.name}" time is UP!`);
              console.log(`⚡ [POST-CONTEST TACTICAL REARRANGEMENT] Rearranging 1100 bot teams according to ranking...`);
              const res = await this.deploy1100Autonomous(lc.id);
              console.log(`✅ [SUCCESS] ${res.totalTeams} bots rearranged! Winner: "${res.winner.botName}"!`);
            }
          }
        }
      } catch (err) {
        console.error('⚠️ [BotManager Daemon] Error during schedule tick:', err.message);
      }
    };

    // Run first tick immediately, then interval
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
  console.log('                 [1100 BOTS AUTONOMOUS SQUAD]                      ');
  console.log('═══════════════════════════════════════════════════════════════════');

  try {
    switch (command) {
      case 'status': {
        const res = await manager.getStatus();
        console.log('✅ Connection to Creator11 API: SUCCESSFUL');
        console.log(`📊 Total Registered Bots: ${res.botNetwork.totalBots}`);
        console.log(`🔑 Bot Manager API Key: Configured`);
        console.log(`⏳ Pre-Contest Team Creation: ${res.botNetwork.preContestAutoTeamCreation}`);
        console.log(`🎲 Fair Winner Rotation Engine: ${res.botNetwork.fairRotationEngine}`);
        console.log('\nTracked Tournaments:');
        res.tournaments.forEach(t => {
          const rankStatus = t.rankings_finalized ? 'FINALIZED' : 'PROCESSING...';
          console.log(`  • [${t.status.toUpperCase().padEnd(9)}] ${t.name.padEnd(40)} | Participants: ${String(t.current_participants).padStart(4)} | Rankings: ${rankStatus}`);
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
          console.log(`  • ${uc.name} (Starts in: ${uc.minutesUntilStart} mins) | Participants: ${uc.participants} | ID: ${uc.id}`);
        });

        console.log('\n🏁 RECENT COMPLETED CONTESTS:');
        res.completedContests.forEach(cc => {
          const status = cc.rankingsFinalized ? 'FINALIZED' : 'PENDING REARRANGEMENT';
          console.log(`  • ${cc.name} | Status: ${status} | Participants: ${cc.participants} | ID: ${cc.id}`);
        });
        break;
      }

      case 'list-bots': {
        const res = await manager.listBots(25);
        console.log(`✅ Total Registered Bots in Network: ${res.total}`);
        console.log('\nSample Bot Lineup (First 20):');
        res.bots.slice(0, 20).forEach((b, i) => {
          console.log(`  [${String(i + 1).padStart(4, '0')}] ${b.name.padEnd(25)} | Email: ${b.email.padEnd(45)} | Wallet: ₹${b.walletBalance}`);
        });
        if (res.total > 20) {
          console.log(`  ... and ${res.total - 20} more registered bots active in network.`);
        }
        break;
      }

      case 'pre-contest': {
        const tidIndex = args.indexOf('--tournament');
        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_LIVE_TOURNAMENT_ID;

        console.log(`⏳ Triggering Pre-Contest Team Creation for 1100 bots on tournament: ${tournamentId}`);
        const res = await manager.deployPreContest(tournamentId);
        console.log(`\n🎉 ${res.totalTeams} bots successfully built and locked their pre-contest teams for "${res.tournamentName}"!`);
        break;
      }

      case 'deploy-1100':
      case 'deploy-300':
      case 'trigger-ended': {
        const tidIndex = args.indexOf('--tournament');
        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID;

        console.log(`🚨 Triggering Post-Contest Tactical Rearrangement for 1100 bots on tournament: ${tournamentId}`);
        const res = await manager.deploy1100Autonomous(tournamentId);
        console.log(`\n🎉 ${res.message}`);
        console.log(`🏆 NEW ROTATED WINNER: "${res.winner.botName}" (Rank #1 with ${res.winner.points} pts | Prize: ₹${res.winner.prize})`);
        console.log(`🔒 Rankings finalized: ${res.rankingsFinalized}`);
        console.log(`👥 Total teams rearranged: ${res.totalTeams}`);
        console.log(`\nTop 10 Lineup:`);
        res.top10Lineup.slice(0, 10).forEach(e => {
          console.log(`  Rank #${e.rank} | User ID: ${e.userId} | Points: ${e.points}`);
        });
        break;
      }

      case 'winners-history': {
        const res = await manager.getWinnersHistory();
        console.log(`📊 Total Recorded Tournament Winners: ${res.totalRecorded}`);
        console.log('\nRecent Top 10 Winners:');
        res.history.slice(0, 10).forEach(h => {
          console.log(`  Rank #${h.rank} | Bot ID: ${h.bot_user_id} | Points: ${h.points} | Date: ${h.created_at}`);
        });
        console.log('\nWin Distribution:');
        console.log(res.winCounts);
        break;
      }

      case 'leaderboard': {
        const tidIndex = args.indexOf('--tournament');
        const tournamentId = tidIndex !== -1 ? args[tidIndex + 1] : CONFIG.DEFAULT_COMPLETED_TOURNAMENT_ID;

        const res = await manager.getLeaderboard(tournamentId);
        console.log(`🏆 Tournament: ${res.tournament.name} (${res.tournament.status.toUpperCase()})`);
        console.log(`Total Ranked Teams: ${res.totalRanked}`);
        console.log(`Rankings Finalized Status: ${res.tournament.rankings_finalized ? 'YES (Unlocked)' : 'NO (Processing...)'}`);
        console.log('\nTop 20 Standings:');
        res.leaderboard.slice(0, 20).forEach(e => {
          const botTag = e.isBot ? '[BOT]' : '[USER]';
          console.log(`  #${String(e.rank).padStart(4)} | ${botTag.padEnd(6)} ${e.userName.padEnd(25)} | Points: ${String(e.totalPoints.toFixed(2)).padStart(8)} | Prize: ₹${e.prizeAmount}`);
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
        console.log('  status                          Show bot network health, 1100 registered bots, and fair rotation');
        console.log('  schedule                        Check upcoming, live, and completed contests schedule');
        console.log('  list-bots                       List registered bots');
        console.log('  pre-contest [--tournament ID]   Command all 1100 bots to build initial teams before contest start');
        console.log('  deploy-1100 [--tournament ID]   Rearrange all 1100 bots by ranking tier upon contest completion');
        console.log('  winners-history                 View past winners history and anti-monopoly distribution');
        console.log('  leaderboard [--tournament ID]   View leaderboard standings with bot tags');
        console.log('  daemon                          Start continuous autonomous schedule tracker and automation daemon');
        console.log('  help                            Show this help message');
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
