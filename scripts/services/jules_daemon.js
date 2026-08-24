'use strict';
/**
 * scripts/services/jules_daemon.js — Continuous Jules Multi-Agent Background Daemon
 *
 * Continuously polls Google Jules API in the background (default: every 15s)
 * to detect:
 * 1. Sessions transitioning to 'awaitingUserFeedback'
 * 2. New 'agentMessaged' inquiry activities from Jules
 * 3. Pull requests and branch updates authored by Jules
 *
 * Automatically records events into outputs/history/jules_activity_log.json
 * and provides an event-driven hook for hands-free multi-agent communication.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { listSessions, getSessionDetails, sendMessageToSession, getJulesClient } = require('./jules_task_manager.js');

const POLL_INTERVAL_MS = parseInt(process.env.JULES_POLL_INTERVAL_MS || '15000', 10);
const ACTIVITY_LOG_PATH = path.join(__dirname, '..', '..', 'outputs', 'history', 'jules_activity_log.json');

let seenActivityIds = new Set();
let isRunning = true;

function loadSeenActivities() {
  if (fs.existsSync(ACTIVITY_LOG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(ACTIVITY_LOG_PATH, 'utf-8'));
      if (Array.isArray(data.seenActivityIds)) {
        seenActivityIds = new Set(data.seenActivityIds);
      }
    } catch (e) {
      // Start fresh
    }
  }
}

function persistSeenActivities(newEntries = []) {
  const dir = path.dirname(ACTIVITY_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  let existingEntries = [];
  if (fs.existsSync(ACTIVITY_LOG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(ACTIVITY_LOG_PATH, 'utf-8'));
      existingEntries = data.entries || [];
    } catch (e) {}
  }

  const combined = [...existingEntries, ...newEntries].slice(-100);
  fs.writeFileSync(ACTIVITY_LOG_PATH, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    seenActivityIds: Array.from(seenActivityIds),
    entries: combined
  }, null, 2), 'utf-8');
}

async function pollOnce() {
  try {
    const sessions = await listSessions();
    if (!sessions || sessions.length === 0) {
      return;
    }

    const newEntries = [];

    for (const s of sessions) {
      const sessionId = s.id;
      const client = await getJulesClient();
      const session = await client.session(sessionId);
      const activitiesRes = await session.activities.list();
      const activities = activitiesRes.activities || [];

      for (const act of activities) {
        if (!seenActivityIds.has(act.id)) {
          seenActivityIds.add(act.id);
          const entry = {
            sessionId,
            activityId: act.id,
            type: act.type,
            originator: act.originator,
            message: act.message || '',
            createTime: act.createTime,
            timestamp: new Date().toISOString()
          };
          newEntries.push(entry);

          console.log(`\n🤖 [Jules Daemon Event] Session: ${sessionId} | Type: ${act.type} | Originator: ${act.originator}`);
          if (act.message) {
            console.log(`   Message: ${act.message.trim()}`);
          }
        }
      }
    }

    if (newEntries.length > 0) {
      persistSeenActivities(newEntries);
    }
  } catch (err) {
    console.warn(`⚠️ [Jules Daemon] Poll check error: ${err.message}`);
  }
}

async function startDaemon() {
  console.log(`🚀 [Jules Daemon] Starting background listener (interval: ${POLL_INTERVAL_MS}ms)...`);
  loadSeenActivities();

  // Run initial poll
  await pollOnce();

  const intervalId = setInterval(async () => {
    if (!isRunning) {
      clearInterval(intervalId);
      return;
    }
    await pollOnce();
  }, POLL_INTERVAL_MS);

  process.on('SIGINT', () => {
    console.log('\n🛑 [Jules Daemon] Shutting down listener...');
    isRunning = false;
    clearInterval(intervalId);
    process.exit(0);
  });
}

if (require.main === module) {
  startDaemon();
}

module.exports = {
  startDaemon,
  pollOnce
};
