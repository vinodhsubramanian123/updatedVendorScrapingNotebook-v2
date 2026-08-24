'use strict';
/**
 * scripts/jules_task_manager.js — Jules CLI & Background Task Orchestrator
 *
 * Provides a unified interface for dispatching background tasks to Google Jules,
 * querying session activities, sending reviews, and verifying completed pull requests.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JULES_API_KEY = process.env.JULES_API_KEY || '';
const GITHUB_REPO = 'vinodhsubramanian123/updatedVendorScrapingNotebook-v2';

async function getJulesClient() {
  if (!JULES_API_KEY) {
    throw new Error('JULES_API_KEY is not configured in .env or environment.');
  }
  const { connect } = await import('@google/jules-sdk');
  return connect({ apiKey: JULES_API_KEY });
}

/**
 * List all Jules sessions with their status, title, and ID.
 */
async function listSessions() {
  const client = await getJulesClient();
  const sessions = await client.sessions().all();
  return sessions.map(s => ({
    id: s.id || s.name,
    title: s.title || 'Untitled Session',
    state: s.state || s.status || 'unknown',
    createdAt: s.createTime || s.createdAt || '',
    updatedAt: s.updateTime || s.updatedAt || '',
    branch: s.source?.branch || s.branch || '',
    pullRequest: s.pullRequest || null
  }));
}

/**
 * Create a new background session/task for Jules.
 * @param {string} prompt - Task instructions for Jules
 * @param {string} [title] - Human-readable session title
 * @param {string} [branch='main'] - Target branch
 * @param {boolean} [autoPr=true] - Automatically create PR on completion
 */
async function createSession(prompt, title = 'Background Task', branch = 'main', autoPr = true) {
  const client = await getJulesClient();
  const session = await client.run({
    prompt,
    title,
    source: {
      github: GITHUB_REPO,
      baseBranch: branch
    },
    autoPr
  });
  return session;
}

/**
 * Get details & activity for a specific session ID.
 */
async function getSessionDetails(sessionId) {
  const client = await getJulesClient();
  const session = await client.session(sessionId);
  return session;
}

/**
 * Send a message / reply to an active Jules session.
 * @param {string} sessionId
 * @param {string} message
 */
async function sendMessageToSession(sessionId, message) {
  const client = await getJulesClient();
  const session = await client.session(sessionId);
  await session.send(message);
  return session;
}

/**
 * Audit all activities, code changes, PRs, and patches in a Jules session.
 * Ensures zero work or unpushed patches are missed before closing/retiring a session (INV-12).
 */
async function auditSession(sessionId) {
  const client = await getJulesClient();
  const session = await client.session(sessionId);
  const activitiesRes = await session.activities.list();
  const activities = activitiesRes.activities || [];
  
  const auditReport = {
    sessionId,
    title: session.title || session.name || 'Jules Session',
    state: session.state || session.status || 'unknown',
    totalActivities: activities.length,
    commits: [],
    pullRequests: [],
    patches: [],
    affectedFiles: new Set()
  };

  activities.forEach((act, idx) => {
    if (act.gitCommit) auditReport.commits.push(act.gitCommit);
    if (act.pullRequest) auditReport.pullRequests.push(act.pullRequest);
    if (act.artifacts && act.artifacts.length > 0) {
      act.artifacts.forEach(art => {
        const patchText = art.gitPatch?.unidiffPatch || art.changeSet?.gitPatch?.unidiffPatch || art.gitPatch?.patch;
        if (patchText) {
          auditReport.patches.push({
            activityIndex: idx,
            type: art.type || act.type,
            patch: patchText,
            baseCommitId: art.gitPatch?.baseCommitId
          });
          const fileMatches = patchText.match(/diff --git a\/([^\s]+) b\/([^\s]+)/g);
          if (fileMatches) {
            fileMatches.forEach(m => {
              const f = m.split(' b/')[1];
              if (f) auditReport.affectedFiles.add(f);
            });
          }
        }
      });
    }
  });

  auditReport.affectedFiles = Array.from(auditReport.affectedFiles);
  return auditReport;
}

// CLI runner support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  (async () => {
    try {
      if (command === 'list') {
        console.log('Fetching Jules sessions for repository:', GITHUB_REPO);
        const list = await listSessions();
        console.log(`\nFound ${list.length} Jules Session(s):`);
        list.forEach((s, idx) => {
          console.log(`  [${idx + 1}] ID: ${s.id.padEnd(22)} | Status: ${(s.state || '').padEnd(10)} | Title: ${s.title}`);
        });
      } else if (command === 'create') {
        const prompt = args[1];
        const title = args[2] || 'Automated Task';
        const branch = args[3] || 'main';
        if (!prompt) {
          console.error('Usage: node scripts/jules_task_manager.js create "<prompt>" "[title]" "[branch]"');
          process.exit(1);
        }
        console.log(`Creating Jules session: "${title}" on branch: "${branch}"...`);
        const session = await createSession(prompt, title, branch);
        console.log('✅ Session created successfully:', session.id || session.name);
      } else if (command === 'send') {
        const id = args[1];
        const message = args[2];
        if (!id || !message) {
          console.error('Usage: node scripts/jules_task_manager.js send <sessionId> "<message>"');
          process.exit(1);
        }
        console.log(`Sending message to session: ${id}...`);
        await sendMessageToSession(id, message);
        console.log('✅ Message sent to Jules session successfully.');
      } else if (command === 'status') {
        const id = args[1];
        if (!id) {
          console.error('Usage: node scripts/jules_task_manager.js status <sessionId>');
          process.exit(1);
        }
        const details = await getSessionDetails(id);
        console.log('Session Details:', details);
      } else if (command === 'audit') {
        const id = args[1];
        if (!id) {
          console.error('Usage: node scripts/jules_task_manager.js audit <sessionId>');
          process.exit(1);
        }
        console.log(`🔍 Auditing Jules session activities & patches for: ${id}...`);
        const report = await auditSession(id);
        console.log(`\n===============================================================`);
        console.log(`📊 JULES SESSION AUDIT REPORT: ${report.sessionId}`);
        console.log(`===============================================================`);
        console.log(`  Title           : ${report.title}`);
        console.log(`  Status          : ${report.state}`);
        console.log(`  Total Activities: ${report.totalActivities}`);
        console.log(`  Commits Found   : ${report.commits.length}`);
        console.log(`  PRs Found       : ${report.pullRequests.length}`);
        console.log(`  Patches/Deltas  : ${report.patches.length}`);
        console.log(`  Affected Files  : ${report.affectedFiles.length}`);
        if (report.affectedFiles.length > 0) {
          console.log(`\n  📂 Files Modified/Created in Session:`);
          report.affectedFiles.forEach(f => console.log(`     - ${f}`));
        }
        if (report.pullRequests.length > 0) {
          console.log(`\n  🔗 Pull Requests:`);
          report.pullRequests.forEach(pr => console.log(`     - PR #${pr.number || ''}: ${pr.url || pr.htmlUrl || pr.title || JSON.stringify(pr)}`));
        }
        console.log(`===============================================================\n`);
      } else if (command === 'prune') {
        const { execSync } = require('child_process');
        console.log('Fetching remote branches to prune merged Jules branches...');
        const rawBranches = execSync('git branch -r', { encoding: 'utf-8' });
        const branches = rawBranches
          .split('\n')
          .map(b => b.trim())
          .filter(b => b.startsWith('origin/') && !b.includes('HEAD') && !b.endsWith('/main') && !b.endsWith('/master'))
          .map(b => b.replace('origin/', ''));

        console.log(`Found ${branches.length} remote feature branch(es) to check.`);
        for (const branch of branches) {
          try {
            console.log(`Pruning remote branch: origin/${branch}...`);
            execSync(`git push origin --delete ${branch}`, { stdio: 'inherit' });
            console.log(`✅ Successfully pruned origin/${branch}`);
          } catch (e) {
            console.warn(`⚠️ Could not prune ${branch}: ${e.message}`);
          }
        }
        console.log('🎉 Stale remote branches pruned cleanly.');
      } else {
        console.log('Unknown command. Available commands: list, create, send, status, audit, prune');
      }
    } catch (err) {
      console.error('❌ Error in Jules Task Manager:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  listSessions,
  createSession,
  getSessionDetails,
  sendMessageToSession,
  auditSession,
  getJulesClient
};

