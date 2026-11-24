#!/usr/bin/env node
'use strict';
/**
 * scripts/maintenance/lookup_invariant.js — Fast Indexed Lookup over docs/INVARIANTS.md
 *
 * Lets agents and engineers resolve exact INV-<n> sections or keyword topics in one
 * targeted read instead of loading the full 265 KB invariants catalog.
 *
 * Usage:
 *   node scripts/maintenance/lookup_invariant.js INV-249
 *   node scripts/maintenance/lookup_invariant.js --index
 *   node scripts/maintenance/lookup_invariant.js "chrome-port-map"
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const INVARIANTS_PATH = path.join(PROJECT_ROOT, 'docs', 'INVARIANTS.md');

/**
 * Parse docs/INVARIANTS.md into indexed INV entries and top-level section headings.
 * @param {string} [filePath=INVARIANTS_PATH]
 * @returns {{ sections: Array<object>, entries: Array<object> }}
 */
function generateInvariantsIndex(filePath = INVARIANTS_PATH) {
  if (!fs.existsSync(filePath)) return { sections: [], entries: [] };
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const sections = [];
  const entries = [];
  let active = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) {
      if (active) { active.endLine = i; entries.push(active); active = null; }
      sections.push({ line: i + 1, heading: line.replace(/^##\s+/, '').trim() });
      continue;
    }
    const invMatch = line.match(/^-\s+(?:<a\s+id="[^"]+"><\/a>)?\*\*INV-(\d+)\s*[:·—–-]\s*([^*]+)\*\*/);
    if (invMatch) {
      if (active) { active.endLine = i; entries.push(active); }
      active = {
        id: `INV-${invMatch[1]}`,
        number: Number(invMatch[1]),
        title: invMatch[2].replace(/[:·]+$/, '').trim(),
        startLine: i + 1,
        endLine: lines.length,
        lines: [line]
      };
      continue;
    }
    if (active) active.lines.push(line);
  }
  if (active) { active.endLine = lines.length; entries.push(active); }
  return { sections, entries };
}

/**
 * Lookup an invariant by exact ID (e.g. "INV-249", "249") or text keyword.
 * @param {string} query
 * @param {{ filePath?: string, maxMatches?: number }} [options={}]
 * @returns {{ query: string, matchCount: number, matches: Array<object> }}
 */
function lookupInvariant(query, options = {}) {
  const q = String(query || '').trim();
  const { entries } = generateInvariantsIndex(options.filePath || INVARIANTS_PATH);
  if (!q) return { query: q, matchCount: 0, matches: [] };
  const maxMatches = Number.isFinite(options.maxMatches) ? options.maxMatches : 10;

  const idMatch = q.match(/^(?:INV-)?(\d+)$/i);
  if (idMatch) {
    const num = Number(idMatch[1]);
    const exact = entries.filter(e => e.number === num);
    if (exact.length > 0) {
      return {
        query: q,
        matchCount: exact.length,
        matches: exact.map(e => ({
          id: e.id,
          title: e.title,
          startLine: e.startLine,
          endLine: e.endLine,
          text: e.lines.join('\n').trim()
        }))
      };
    }
  }

  const lower = q.toLowerCase();
  const hits = entries.filter(e =>
    e.id.toLowerCase().includes(lower) ||
    e.title.toLowerCase().includes(lower) ||
    e.lines.some(l => l.toLowerCase().includes(lower))
  );
  return {
    query: q,
    matchCount: hits.length,
    matches: hits.slice(0, maxMatches).map(e => ({
      id: e.id,
      title: e.title,
      startLine: e.startLine,
      endLine: e.endLine,
      text: e.lines.join('\n').trim()
    }))
  };
}

function main(argv = process.argv.slice(2)) {
  const showIndex = argv.includes('--index');
  const jsonMode = argv.includes('--json');
  const query = argv.filter(a => !a.startsWith('--')).join(' ').trim();

  if (showIndex || !query) {
    const index = generateInvariantsIndex();
    if (jsonMode) {
      console.log(JSON.stringify({
        totalSections: index.sections.length,
        totalEntries: index.entries.length,
        sections: index.sections,
        entries: index.entries.map(({ id, title, startLine, endLine }) => ({ id, title, startLine, endLine }))
      }, null, 2));
      return;
    }
    console.log(`INVARIANTS Index (${index.entries.length} indexed entries across ${index.sections.length} sections):`);
    for (const s of index.sections) console.log(`  L${s.line}: ${s.heading}`);
    console.log('\nLatest Invariants:');
    for (const e of index.entries.slice(-15)) console.log(`  ${e.id} (L${e.startLine}-${e.endLine}): ${e.title}`);
    return;
  }

  const result = lookupInvariant(query);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.matchCount === 0) {
    console.log(`No invariant entries matched "${query}".`);
  } else {
    console.log(`Found ${result.matchCount} match(es) for "${query}":\n`);
    for (const m of result.matches) {
      console.log(`--- ${m.id} (docs/INVARIANTS.md:${m.startLine}-${m.endLine}) ---`);
      console.log(m.text);
      console.log('');
    }
  }
  if (result.matchCount === 0 && /^INV-\d+$/i.test(query)) process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = { generateInvariantsIndex, lookupInvariant, main };
