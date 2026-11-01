// ─── Turso Cloud SQLite Sync Service ───
// Connects Creator11 to https://app.turso.tech/ via libSQL.
// Prevents data loss on Render ephemeral disk redeploys by continuously syncing
// the local SQLite state with your permanent Turso Cloud Database!

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

let tursoClient = null;

function isTursoConfigured() {
  return Boolean(
    process.env.TURSO_DATABASE_URL &&
    (process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN)
  );
}

function getTursoClient() {
  if (tursoClient) return tursoClient;
  if (!isTursoConfigured()) return null;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;

  tursoClient = createClient({
    url,
    authToken,
  });

  return tursoClient;
}

const SYNC_TABLES = [
  'users',
  'creators',
  'tournaments',
  'contests',
  'wallets',
  'transactions',
  'teams',
  'team_creators',
  'scores',
  'leaderboard',
  'creator_stats_snapshots',
  'user_streaks',
  'notifications',
  'contest_participants',
  'system_settings',
  'bot_win_history',
  'referral_logs',
  'share_logs'
];

/**
 * Bootstrap on boot:
 * If Render restarted with a fresh/empty container and Turso has data,
 * pulls and seeds latest data from Turso Cloud into local SQLite.
 */
async function pullFromTurso() {
  if (!isTursoConfigured()) return { success: false, reason: 'Turso not configured' };
  const client = getTursoClient();
  if (!client) return { success: false, reason: 'Turso client unavailable' };

  const sequelize = require('../db/index');
  console.log('📥 [TursoSync] Pulling latest data from Turso Cloud to local SQLite...');

  let pulledCount = 0;
  for (const table of SYNC_TABLES) {
    try {
      const cloudRes = await client.execute(`SELECT * FROM ${table};`);
      if (!cloudRes || !cloudRes.rows || cloudRes.rows.length === 0) continue;

      const rows = cloudRes.rows;
      const columns = cloudRes.columns;

      await sequelize.query('PRAGMA foreign_keys = OFF;');
      
      // Batch insert with chunking for high performance
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`;

        for (const row of chunk) {
          const values = columns.map(c => row[c]);
          await sequelize.query(insertSql, { replacements: values });
        }
      }
      pulledCount += rows.length;
      console.log(`   ⬇️ Restored ${rows.length} rows for "${table}" from Turso Cloud.`);
    } catch (err) {
      // Table might not exist or be empty, continue
    }
  }

  await sequelize.query('PRAGMA foreign_keys = ON;').catch(() => {});
  console.log(`✅ [TursoSync] Bootstrap complete: ${pulledCount} total records restored from Turso Cloud!`);
  return { success: true, pulledCount };
}

/**
 * Pushes critical local SQLite tables to Turso Cloud
 */
async function syncToTurso() {
  if (!isTursoConfigured()) return { success: false, reason: 'Turso not configured' };
  const client = getTursoClient();
  if (!client) return { success: false, reason: 'Turso client unavailable' };

  const sequelize = require('../db/index');

  try {
    await client.execute('PRAGMA foreign_keys = OFF;');
    let syncedCount = 0;

    for (const table of SYNC_TABLES) {
      try {
        const [rows] = await sequelize.query(`SELECT * FROM ${table};`);
        if (!rows || rows.length === 0) continue;

        // Ensure table exists on Turso by getting schema
        const [schema] = await sequelize.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}';`);
        if (schema && schema[0] && schema[0].sql) {
          await client.execute(schema[0].sql).catch(() => {});
        }

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`;

        const chunkSize = 100;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const stmts = chunk.map(row => ({
            sql: insertSql,
            args: columns.map(c => row[c] !== undefined ? row[c] : null)
          }));
          await client.batch(stmts, 'write');
        }
        syncedCount += rows.length;
      } catch (tErr) {
        // Continue with other tables
      }
    }
    await client.execute('PRAGMA foreign_keys = ON;').catch(() => {});
    console.log(`☁️ [TursoSync] Pushed ${syncedCount} records to Turso Cloud successfully.`);
    return { success: true, syncedCount };
  } catch (err) {
    console.error('⚠️ [TursoSync] Push error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Initialize sync service:
 * Checks connection, bootstraps data if local database is empty,
 * and sets up recurring sync.
 */
async function initTursoSync() {
  if (!isTursoConfigured()) {
    console.log('ℹ️ Turso Cloud not configured. Running standard local SQLite engine.');
    return { enabled: false };
  }

  try {
    const client = getTursoClient();
    console.log(`🌐 [TursoSync] Connecting to Turso Cloud at ${process.env.TURSO_DATABASE_URL}...`);

    // Verify connectivity
    const ping = await client.execute('SELECT 1 as alive;');
    if (ping.rows.length > 0) {
      console.log('✅ [TursoSync] Connected to Turso Cloud successfully!');
    }

    // Check if local DB is empty (e.g. freshly deployed container on Render)
    const sequelize = require('../db/index');
    let localUsers = 0;
    try {
      const [userCount] = await sequelize.query('SELECT COUNT(*) as count FROM users;');
      localUsers = userCount[0]?.count || 0;
    } catch (e) {
      localUsers = 0;
    }

    if (localUsers === 0) {
      console.log('⚠️ [TursoSync] Local database is empty! Initiating automatic restore from Turso Cloud...');
      await pullFromTurso();
    } else {
      console.log(`📊 [TursoSync] Local database contains ${localUsers} users. Live sync active.`);
    }

    // Auto-schedule periodic cloud sync every 3 minutes
    setInterval(async () => {
      try {
        await syncToTurso();
      } catch (err) {
        console.warn('⚠️ [TursoSync] Periodic sync notice:', err.message);
      }
    }, 3 * 60 * 1000);

    return { enabled: true, connected: true };
  } catch (error) {
    console.error('⚠️ [TursoSync] Connection error:', error.message);
    return { enabled: true, connected: false, error: error.message };
  }
}

module.exports = {
  isTursoConfigured,
  getTursoClient,
  initTursoSync,
  syncToTurso,
  pullFromTurso,
};
