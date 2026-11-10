'use strict';
const crypto = require('crypto');

function configRevision(config) {
  return crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

function validateMappings(notebooks) {
  if (!notebooks || typeof notebooks !== 'object' || Array.isArray(notebooks)) throw new Error('notebooks must be an object');
  for (const [key, value] of Object.entries(notebooks)) {
    if (!/^[A-Za-z0-9_-]+$/.test(key)) throw new Error(`Invalid product key: ${key}`);
    const id = typeof value === 'string' ? value : value?.notebookId;
    if (typeof id !== 'string' || !id.trim()) throw new Error(`Notebook ID is required for ${key}`);
  }
}

/** Versioned replacements allow deletion without silently dropping concurrent updates. */
function updateConfig(existing, body) {
  validateMappings(body.notebooks);
  if (body.revision && body.revision !== configRevision(existing)) {
    const error = new Error('Notebook configuration changed. Reload before saving.');
    error.status = 409;
    throw error;
  }
  if (body.replaceMappings && !body.revision) {
    const error = new Error('A configuration revision is required to replace mappings');
    error.status = 409;
    throw error;
  }
  const notebooks = body.replaceMappings ? body.notebooks : { ...existing.notebooks, ...body.notebooks };
  return { ...existing, defaultNotebookId: body.defaultNotebookId ?? existing.defaultNotebookId ?? '', notebooks };
}

module.exports = { configRevision, updateConfig };
