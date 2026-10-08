'use strict';
// Markdown links/headings are read as data; no network requests or document edits.
const fs = require('fs');
const path = require('path');
const { isWithin, relative } = require('./io.js');

function withoutCode(text, inline = true) {
  let fence = null;
  return text.split('\n').map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker && !fence && !(marker[1][0] === '`' && marker[2].includes('`'))) fence = marker[1];
    else if (marker && fence && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    else if (!fence) return inline ? line.replace(/(`+)[^`\n]*?\1/g, match => ' '.repeat(match.length)) : line;
    return ' '.repeat(line.length);
  }).join('\n');
}

function slugHeading(value) {
  return value.replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_~]/g, '').trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-');
}

function headingAnchors(text) {
  const visible = withoutCode(text, false);
  const anchors = new Set();
  const counts = new Map();
  const add = value => {
    const slug = slugHeading(value);
    const count = counts.get(slug) || 0;
    anchors.add(count ? `${slug}-${count}` : slug);
    counts.set(slug, count + 1);
  };
  const lines = visible.split('\n');
  lines.forEach((line, index) => {
    const atx = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (atx) add(atx[1]);
    else if (index && /^\s{0,3}(?:=+|-+)\s*$/.test(line) && lines[index - 1].trim()) add(lines[index - 1]);
  });
  for (const match of text.matchAll(/<(?:a|[a-z][\w-]*)\b[^>]*\b(?:id|name)=["']([^"']+)["']/gi)) anchors.add(match[1]);
  return anchors;
}

function destination(value) {
  const angle = /^\s*<([^>]+)>/.exec(value);
  return angle ? angle[1] : value.trim().replace(/\s+["'][\s\S]*$/, '');
}

function extractLinks(text) {
  const visible = withoutCode(text);
  const definitions = new Map();
  const links = [];
  const lineAt = index => visible.slice(0, index).split('\n').length;
  for (const match of visible.matchAll(/^\s{0,3}\[([^\]]+)\]:\s*(.+)$/gm)) {
    definitions.set(match[1].trim().toLowerCase(), destination(match[2]));
    links.push({ label: match[1], target: destination(match[2]), line: lineAt(match.index), syntax: 'reference-definition' });
  }
  // Balanced parentheses permit destinations such as guide_(legacy).md.
  const start = /!?\[([^\]\n]+)\]\(/g;
  let match;
  while ((match = start.exec(visible))) {
    let end = start.lastIndex, depth = 1;
    for (; end < visible.length && depth; end++) {
      if (visible[end] === '\\') { end++; continue; }
      if (visible[end] === '(') depth++;
      else if (visible[end] === ')') depth--;
    }
    if (depth) continue;
    links.push({ label: match[1], target: destination(visible.slice(start.lastIndex, end - 1)), line: lineAt(match.index), syntax: 'inline' });
    start.lastIndex = end;
  }
  for (const ref of visible.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const id = (ref[2] || ref[1]).trim().toLowerCase();
    links.push({ label: ref[1], target: definitions.get(id) || null, referenceId: id, line: lineAt(ref.index), syntax: 'reference-use' });
  }
  for (const shortcut of visible.matchAll(/(?<!!)\[([^\]\n]+)\](?![[(]|:)/g)) {
    if (shortcut.index && visible[shortcut.index - 1] === ']') continue; // Second bracket in a full reference use.
    const id = shortcut[1].trim().toLowerCase();
    if (definitions.has(id)) links.push({ label: shortcut[1], target: definitions.get(id), line: lineAt(shortcut.index), syntax: 'shortcut-reference' });
  }
  return links;
}

function resolveLink(root, referringFile, link, cache = new Map()) {
  const result = { source: referringFile, ...link };
  if (link.target === null) return { ...result, status: 'UNDEFINED_REFERENCE' };
  if (/^(?:https?:|mailto:|app:|plugin:|data:|javascript:)/i.test(link.target)) return { ...result, status: 'EXTERNAL_NOT_FETCHED' };
  if (link.target.startsWith('//')) return { ...result, status: 'EXTERNAL_NOT_FETCHED' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(link.target) && !/^file:/i.test(link.target) && !/^[a-z]:[\\/]/i.test(link.target)) return { ...result, status: 'OTHER_URI_NOT_CHECKED' };
  let target;
  try { target = decodeURIComponent(link.target); }
  catch { return { ...result, status: 'INVALID_ENCODING' }; }
  const hashIndex = target.indexOf('#');
  const fragment = hashIndex >= 0 ? target.slice(hashIndex + 1) : null;
  let filePart = (hashIndex >= 0 ? target.slice(0, hashIndex) : target).split('?')[0];
  const isFileUri = /^file:\/\//i.test(filePart);
  if (isFileUri) {
    filePart = filePart.replace(/^file:\/\/\/?/i, '');
    // Repository charters use file:///docs/... as a repo-root convention.
    if (/^(?:\.agents|scripts|docs|tests|dashboard|outputs)\//.test(filePart)) filePart = path.join(root, filePart);
    else if (!/^[a-z]:[\\/]/i.test(filePart)) return { ...result, status: 'ENVIRONMENT_PATH_NOT_CHECKED' };
  }
  const full = !filePart ? path.resolve(root, referringFile) : filePart.startsWith('/') ? path.resolve(root, '.' + filePart) : path.resolve(root, path.dirname(referringFile), filePart);
  if (!isWithin(root, full)) return { ...result, resolvedPath: full, status: fs.existsSync(full) ? 'ENVIRONMENT_PATH_EXISTS' : 'ENVIRONMENT_PATH_MISSING' };
  const resolvedPath = relative(root, full);
  if (!fs.existsSync(full)) return { ...result, resolvedPath, status: 'MISSING_PATH' };
  if (fragment && fs.statSync(full).isFile() && /\.md$/i.test(full)) {
    if (!cache.has(full)) cache.set(full, headingAnchors(fs.readFileSync(full, 'utf8')));
    if (!cache.get(full).has(fragment)) return { ...result, resolvedPath, fragment, status: 'MISSING_FRAGMENT' };
  }
  return { ...result, resolvedPath, fragment, status: 'RESOLVED' };
}

module.exports = { withoutCode, slugHeading, headingAnchors, extractLinks, resolveLink };
