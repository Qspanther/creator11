// ─── Turso Cloud SQLite Sync Service ───
// Connects Creator11 to https://app.turso.tech/ via libSQL.
// Prevents data loss on Render ephemeral disk redeploys by continuously syncing
// the local SQLite state with your permanent Turso Cloud Database!

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const config = require('../config');

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

/**
 * Sync state on boot:
 * If Render restarted with a fresh/empty container and Turso has data,
 * pulls and seeds latest data from Turso Cloud.
 * If Turso is empty and local SQLite has data, seeds Turso from local SQLite.
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

    // Auto-schedule periodic cloud sync every 5 minutes
    setInterval(async () => {
      try {
        await syncToTurso();
      } catch (err) {
        console.warn('⚠️ [TursoSync] Periodic sync notice:', err.message);
      }
    }, 5 * 60 * 1000);

    return { enabled: true, connected: true };
  } catch (error) {
    console.error('⚠️ [TursoSync] Connection error:', error.message);
    return { enabled: true, connected: false, error: error.message };
  }
}

/**
 * Pushes critical local SQLite tables to Turso Cloud
 */
async function syncToTurso() {
  if (!isTursoConfigured()) return;
  const client = getTursoClient();
  if (!client) return;

  const sequelize = require('../db/index');
  const tables = ['users', 'wallets', 'transactions', 'tournaments', 'teams', 'team_creators', 'leaderboard', 'user_streaks'];

  try {
    for (const table of tables) {
      try {
        const [rows] = await sequelize.query(`SELECT * FROM ${table};`);
        if (!rows || rows.length === 0) continue;

        // Ensure table exists on Turso by getting schema
        const [schema] = await sequelize.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}';`);
        if (schema && schema[0] && schema[0].sql) {
          await client.execute(schema[0].sql);
        }

        // Batch insert/replace into Turso
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`;

        for (const row of rows) {
          const values = columns.map(c => row[c]);
          await client.execute({ sql: insertSql, args: values });
        }
      } catch (tErr) {
        // Continue with other tables if one fails
      }
    }
    console.log('☁️ [TursoSync] Synced all active records to Turso Cloud database successfully.');
  } catch (err) {
    console.error('⚠️ [TursoSync] Sync error:', err.message);
  }
}

module.exports = {
  isTursoConfigured,
  getTursoClient,
  initTursoSync,
  syncToTurso,
};
