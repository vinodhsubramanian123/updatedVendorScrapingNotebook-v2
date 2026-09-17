'use strict';
const { execFile } = require('child_process');
const { promisify } = require('util');
const runFile = promisify(execFile);

async function refreshSharedKnowledgeSources(config, documentId, revision, options = {}) {
  const run = options.run || (async args => (await runFile('nlm', args, { encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 })).stdout);
  const targets = Object.entries(config.notebooks || {}).filter(([, entry]) => entry?.notebookId && entry.queryEnabled !== false);
  const results = [];
  async function refresh(chassis, entry) {
    try {
      const title = `Universal Knowledge ${documentId}`;
      const listed = JSON.parse(await run(['source', 'list', entry.notebookId, '--json']));
      const sources = Array.isArray(listed) ? listed : listed.sources;
      if (!Array.isArray(sources)) throw new Error('Unrecognized notebook source inventory');
      let sourceId = entry.runningKnowledgeSourceId;
      if (entry.runningKnowledgeDocId !== documentId || !sources.some(source => (source.id || source.source_id) === sourceId)) {
        const matching = sources.find(source => source.title === title);
        sourceId = matching?.id || matching?.source_id;
      }
      if (!sourceId) {
        const added = JSON.parse(await run(['source', 'add', entry.notebookId, '--drive', documentId, '--type', 'doc', '--title', title, '--wait', '--wait-timeout', '100', '--json']));
        sourceId = added.source_id || added.id || added.sourceId;
        if (!sourceId) throw new Error('Source addition returned no identifier');
      } else {
        await run(['source', 'sync', entry.notebookId, '--source-ids', sourceId, '--confirm']);
      }
      const content = await run(['source', 'content', sourceId, '--json']);
      if (!String(content).includes(revision)) throw new Error('Notebook source does not contain the current shared-document revision');
      entry.runningKnowledgeSourceId = sourceId;
      entry.runningKnowledgeDocId = documentId;
      entry.runningKnowledgeVerifiedRevision = revision;
      entry.runningKnowledgeVerifiedAt = new Date().toISOString();
      for (const key of ['canonicalKnowledgeSourceIds', 'trustedSourceIds']) entry[key] = [...new Set([...(entry[key] || []), sourceId])];
      return { chassis, sourceId, status: 'VERIFIED', revision };
    } catch (error) { return { chassis, status: 'FAILED', error: error.message }; }
  }
  for (let index = 0; index < targets.length; index += 2) results.push(...await Promise.all(targets.slice(index, index + 2).map(([chassis, entry]) => refresh(chassis, entry))));
  return { verified: results.length > 0 && results.every(result => result.status === 'VERIFIED'), results };
}
module.exports = { refreshSharedKnowledgeSources };
