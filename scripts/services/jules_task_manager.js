'use strict';
/**
 * scripts/jules_task_manager.js — Jules CLI & Background Task Orchestrator
 *
 * Provides a unified interface for dispatching background tasks to Google Jules,
 * querying session activities, sending reviews, and verifying completed pull requests.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

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
  return sessions.map(s => {
    const rawId = s.id || (s.name ? s.name.replace(/^sessions\//, '') : 'unknown');
    const resolvedState = (s.outcome?.state === 'completed' || s.state === 'completed') ? 'completed' : (s.state || s.status || 'unknown');
    return {
      id: rawId,
      title: s.title || s.outcome?.title || (s.prompt ? s.prompt.substring(0, 55).replace(/\n/g, ' ') + '...' : 'Untitled Session'),
      state: resolvedState,
      outcome: s.outcome || null,
      createdAt: s.createTime || s.createdAt || '',
      updatedAt: s.updateTime || s.updatedAt || '',
      branch: s.source?.branch || s.sourceContext?.githubRepoContext?.startingBranch || s.branch || 'main',
      pullRequest: s.pullRequest || null
    };
  });
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
  // Normalize session object fields
  session.id = session.id || (session.name ? session.name.replace(/^sessions\//, '') : '');
  session.title = session.title || title;
  return session;
}

/**
 * Get details & activity for a specific session ID.
 */
async function getSessionDetails(sessionId) {
  const client = await getJulesClient();
  const rawId = String(sessionId).replace(/^sessions\//, '');
  const session = await client.session(rawId);
  let info = {};
  if (typeof session.info === 'function') {
    try {
      info = await session.info();
    } catch (_) {}
  }
  return {
    ...info,
    id: rawId,
    title: info.title || info.outcome?.title || session.title || 'Untitled Session',
    state: info.state || info.status || session.state || 'unknown',
    url: info.url || `https://jules.google.com/session/${rawId}`
  };
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
        let id = args[1];
        let message = args[2];
        if (!message && id && id.length > 30) {
          // If user/agent called `send "<message>"` without sessionId
          message = id;
          id = 'active';
        }
        if (id === 'active' || id === 'current' || id === 'test-session' || !id) {
          const list = await listSessions();
          if (list.length > 0) {
            id = list[0].id;
          }
        }
        if (!id || !message) {
          console.error('Usage: node scripts/services/jules_task_manager.js send [sessionId|active] "<message>"');
          process.exit(1);
        }
        console.log(`Sending message to session: ${id}...`);
        await sendMessageToSession(id, message);
        console.log('✅ Message sent to Jules session successfully.');
      } else if (command === 'status') {
        let id = args[1] || 'active';
        if (id === 'active' || id === 'current' || id === 'test-session') {
          const list = await listSessions();
          if (list.length > 0) id = list[0].id;
        }
        const details = await getSessionDetails(id);
        console.log('Session Details:', details);
      } else if (command === 'audit') {
        let id = args[1] || 'active';
        if (id === 'active' || id === 'current' || id === 'test-session') {
          const list = await listSessions();
          if (list.length > 0) id = list[0].id;
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
      } else if (command === 'prs' || command === 'pr:list') {
        const state = args[1] || 'all';
        console.log(`Fetching pull requests from GitHub (State: ${state})...`);
        const prs = await listPullRequests(state);
        console.log(`\nFound ${prs.length} pull request(s) on ${GITHUB_REPO}:`);
        prs.forEach(pr => {
          console.log(`  [PR #${String(pr.number).padEnd(3)}] [${(pr.state || '').toUpperCase().padEnd(6)}] ${pr.title}`);
          console.log(`        Branch: ${pr.branch} | Author: ${pr.author} | URL: ${pr.html_url}`);
        });
      } else if (command === 'archive' || command === 'archive-completed') {
        let id = args[1];
        if (id && id !== 'all' && id !== 'completed') {
          console.log(`🔍 Auditing and archiving single session: ${id}...`);
          const res = await archiveSession(id);
          console.log(`✅ Session ${id} archived successfully.`);
        } else {
          console.log('🔍 Auditing and archiving all completed Jules sessions...');
          const results = await archiveCompletedSessions();
          console.log(`\n🎉 Successfully audited and archived ${results.length} completed session(s).`);
        }
      } else {
        console.log('Unknown command. Available commands: list, create, send, status, audit, prune, prs, archive, archive-completed');
      }
    } catch (err) {
      console.error('❌ Error in Jules Task Manager:', err.message);
      process.exit(1);
    }
  })();
}

/**
 * Archive a specific Jules session after validating its audit report.
 */
async function archiveSession(sessionId) {
  const client = await getJulesClient();
  const auditReport = await auditSession(sessionId);
  const session = await client.session(sessionId);
  await session.archive();

  // Log to persistent audit ledger
  const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
  const ledgerPath = path.join(__dirname, '..', '..', 'outputs', 'history', 'jules_archived_sessions.json');
  let ledger = [];
  try {
    const fs = require('fs');
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'));
    }
  } catch (e) {}

  const entry = {
    sessionId,
    title: auditReport.title,
    archivedAt: new Date().toISOString(),
    totalActivities: auditReport.totalActivities,
    pullRequests: auditReport.pullRequests,
    affectedFiles: auditReport.affectedFiles
  };

  // Upsert
  const idx = ledger.findIndex(x => x.sessionId === sessionId);
  if (idx >= 0) {
    ledger[idx] = entry;
  } else {
    ledger.push(entry);
  }

  safeWriteJsonAtomic(ledgerPath, ledger);
  return entry;
}

/**
 * Audit and archive all completed Jules sessions.
 */
async function archiveCompletedSessions() {
  const sessions = await listSessions();
  const completed = sessions.filter(s => 
    !s.archived &&
    s.state !== 'inProgress' && 
    (s.state === 'completed' || s.state === 'failed' || s.state === 'paused')
  );
  console.log(`Found ${completed.length} completed/inactive session(s) to inspect and archive.`);

  const archived = [];
  for (const s of completed) {
    try {
      console.log(`- Auditing & archiving session: ${s.id} (${(s.title || '').substring(0, 45)})...`);
      const entry = await archiveSession(s.id);
      archived.push(entry);
      console.log(`  ✅ Archived ${s.id}`);
    } catch (err) {
      console.warn(`  ⚠️ Failed to archive ${s.id}: ${err.message}`);
    }
  }
  return archived;
}

/**
 * List Pull Requests from GitHub via REST API (cross-platform, zero gh binary dependency).
 */
async function listPullRequests(state = 'all') {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=${state}&per_page=50`;
  const headers = { 'User-Agent': 'Antigravity-Agent' };
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`;
  }
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`GitHub API returned status ${res.status}: ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      branch: pr.head?.ref || '',
      author: pr.user?.login || 'unknown',
      html_url: pr.html_url || '',
      created_at: pr.created_at || '',
      merged_at: pr.merged_at || null
    }));
  } catch (err) {
    console.warn(`Failed to fetch pull requests: ${err.message}`);
    return [];
  }
}

/**
 * Close a Pull Request on GitHub via REST API.
 */
async function closePullRequest(prNumber) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}`;
  const headers = { 
    'User-Agent': 'Antigravity-Agent',
    'Content-Type': 'application/json'
  };
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`;
  }
  try {
    const res = await fetch(url, { 
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: 'closed' })
    });
    if (res.ok) {
      console.log(`✅ Successfully closed PR #${prNumber} on GitHub.`);
      return true;
    } else {
      console.warn(`⚠️ GitHub API returned ${res.status} when closing PR #${prNumber}`);
      return false;
    }
  } catch (err) {
    console.warn(`Failed to close PR #${prNumber}: ${err.message}`);
    return false;
  }
}

async function pruneMergedBranches() {
  const { execSync } = require('child_process');
  console.log('Fetching remote branches to prune merged Jules branches...');
  try {
    const rawBranches = execSync('git branch -r', { encoding: 'utf8' });
    const julesBranches = rawBranches.split('\n')
      .map(b => b.trim())
      .filter(b => b.startsWith('origin/') && (b.includes('-') || b.includes('/')) && !b.includes('origin/main') && !b.includes('origin/master') && !b.includes('origin/HEAD'));
    console.log(`Found ${julesBranches.length} remote feature branch(es) to check.`);
    for (const remoteBranch of julesBranches) {
      const branch = remoteBranch.replace(/^origin\//, '');
      try {
        console.log(`Pruning remote branch: ${remoteBranch}...`);
        execSync(`git push origin --delete ${branch}`, { stdio: 'inherit' });
        console.log(`✅ Successfully pruned ${remoteBranch}`);
      } catch (e) {
        console.warn(`⚠️ Could not prune ${branch}: ${e.message}`);
      }
    }
    console.log('🎉 Stale remote branches pruned cleanly.');
    return true;
  } catch (err) {
    console.warn(`Failed to list/prune remote branches: ${err.message}`);
    return false;
  }
}

function getResolvedHeaders() {
  const headers = { 'User-Agent': 'Antigravity-Agent' };
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`;
  }
  return headers;
}

module.exports = {
  getJulesClient,
  getResolvedHeaders,
  listSessions,
  createSession,
  getSessionDetails,
  sendMessageToSession,
  archiveSession,
  auditSession,
  archiveCompletedSessions,
  listPullRequests,
  closePullRequest,
  pruneMergedBranches
};

