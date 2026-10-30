// â”€â”€â”€ YouTube Live Tracker Supervisor Service â”€â”€â”€
// Manages the autonomous Python YouTube scraper daemon as a child process.
// Ensures 24/7 continuous real-time statistics fetching for all YouTube creators.
// Features:
// - Auto-starts with backend server
// - Auto-restarts on unexpected exit with exponential backoff
// - Safe shutdown hooks on SIGINT/SIGTERM
// - On-demand sync execution via syncNow()

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let trackerProcess = null;
let isShuttingDown = false;
let restartAttempts = 0;
let lastSyncTimestamp = null;
let lastSyncStatus = 'idle';
let lastSyncOutput = '';

const SCRIPT_PATH = path.join(__dirname, 'youtube_live_tracker.py');

/**
 * Determine the correct python executable command on this system.
 */
function getPythonCommand() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Start the continuous background YouTube live tracking daemon.
 */
function startYouTubeTracker() {
  if (trackerProcess) {
    console.log('[YouTubeSupervisor] â„¹ï¸ YouTube tracker daemon is already running.');
    return;
  }

  const pythonCmd = getPythonCommand();
  console.log(`[YouTubeSupervisor] ðŸš€ Spawning YouTube Live Tracker daemon using "${pythonCmd}"...`);
  console.log(`[YouTubeSupervisor] Script: ${SCRIPT_PATH}`);

  try {
    trackerProcess = spawn(pythonCmd, [SCRIPT_PATH], {
      cwd: path.dirname(SCRIPT_PATH),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    lastSyncStatus = 'running';

    trackerProcess.stdout.on('data', (data) => {
      const text = data.toString();
      lastSyncOutput = text.trim().slice(-300);
      if (text.includes('[YT-SYNC]')) {
        lastSyncTimestamp = new Date();
      }
      // Print significant sync logs
      if (text.includes('Sync completed') || text.includes('Starting sync cycle') || text.includes('ERROR')) {
        console.log(`[YouTubeSync] ${text.trim()}`);
      }
    });

    trackerProcess.stderr.on('data', (data) => {
      const errText = data.toString().trim();
      if (errText) {
        console.error(`[YouTubeSync Error] ${errText}`);
      }
    });

    trackerProcess.on('exit', (code, signal) => {
      trackerProcess = null;
      if (!isShuttingDown) {
        console.warn(`[YouTubeSupervisor] âš ï¸ YouTube tracker process exited (code: ${code}, signal: ${signal}).`);
        lastSyncStatus = `exited_code_${code}`;

        // Auto-restart after delay
        const delay = Math.min(30000, 3000 * Math.pow(1.5, restartAttempts++));
        console.log(`[YouTubeSupervisor] ðŸ”„ Auto-restarting in ${Math.round(delay / 1000)}s...`);
        setTimeout(() => {
          if (!isShuttingDown) startYouTubeTracker();
        }, delay);
      } else {
        lastSyncStatus = 'stopped';
      }
    });

    trackerProcess.on('error', (err) => {
      console.error('[YouTubeSupervisor] âŒ Failed to spawn YouTube tracker:', err.message);
      trackerProcess = null;
      lastSyncStatus = `error: ${err.message}`;
    });

  } catch (err) {
    console.error('[YouTubeSupervisor] âŒ Error in startYouTubeTracker:', err.message);
  }
}

/**
 * Stop the tracker cleanly.
 */
function stopYouTubeTracker() {
  isShuttingDown = true;
  if (trackerProcess) {
    console.log('[YouTubeSupervisor] ðŸ›‘ Stopping YouTube tracker daemon...');
    try {
      trackerProcess.kill('SIGINT');
    } catch (_) {}
    trackerProcess = null;
  }
}

/**
 * Trigger an immediate single sync cycle on-demand.
 * @returns {Promise<{ success: boolean, output: string }>}
 */
function syncNow() {
  return new Promise((resolve) => {
    const pythonCmd = getPythonCommand();
    console.log(`[YouTubeSupervisor] âš¡ Running on-demand single sync via "${pythonCmd}"...`);

    const child = spawn(pythonCmd, [SCRIPT_PATH, '--once'], {
      cwd: path.dirname(SCRIPT_PATH),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      lastSyncTimestamp = new Date();
      if (code === 0) {
        lastSyncStatus = 'synced';
        resolve({ success: true, code, output, error: null });
      } else {
        resolve({ success: false, code, output, error: errorOutput || `Exit code ${code}` });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, code: -1, output: '', error: err.message });
    });
  });
}

/**
 * Get current health and status of the YouTube scraper.
 */
function getStatus() {
  return {
    isRunning: trackerProcess !== null,
    pid: trackerProcess ? trackerProcess.pid : null,
    status: lastSyncStatus,
    lastSyncTimestamp,
    recentLog: lastSyncOutput,
  };
}

// Clean shutdown listeners
process.on('SIGINT', stopYouTubeTracker);
process.on('SIGTERM', stopYouTubeTracker);

module.exports = {
  startYouTubeTracker,
  stopYouTubeTracker,
  syncNow,
  getStatus,
};

