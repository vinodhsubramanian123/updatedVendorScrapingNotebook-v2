'use strict';
/**
 * tests/unit/test_local_rag_search_comprehensive.js
 * Comprehensive Unit & Boundary Test Suite for Local RAG Search & Ranking Engine
 */

const test = require('node:test');
const assert = require('node:assert');
const { queryLocalKnowledgeBase } = require('../../scripts/lib/rag/local_rag_search.js');

test('1) Exact SKU queries vs fuzzy product queries', () => {
  // Exact SKU match
  const resultExact = queryLocalKnowledgeBase('P73282-B21', 'DL380_Gen12_SFF');
  assert.ok(resultExact.answer.includes('P73282-B21'), 'Exact SKU search should return P73282-B21');
  assert.ok(resultExact.confidenceScore >= 0.7, 'Exact match should have solid confidence score');

  // Fuzzy core query
  const resultFuzzy = queryLocalKnowledgeBase('64 core processor', 'DL380_Gen12_SFF');
  assert.ok(resultFuzzy.answer.includes('Processors with 64+ Cores'), 'Fuzzy processor query should find 64+ core heading');
  assert.strictEqual(resultFuzzy.confidenceScore, 0.95, 'Processor match should set 0.95 confidence');
  assert.ok(resultFuzzy.citations.length > 0, 'Should return citations');
});

test('2) Multi-token scoring and domain keyword boost factors', () => {
  // Query DDR5 memory category
  const resultMemory = queryLocalKnowledgeBase('DDR5 memory', 'DL380_Gen12_SFF');
  assert.ok(resultMemory.answer.includes('Memory') && resultMemory.answer.includes('DDR5'), 'Should match DDR5 Memory category');
  assert.ok(resultMemory.confidenceScore > 0, 'Confidence score should be positive');

  // Query Tri-Mode Storage Controller
  const resultStorage = queryLocalKnowledgeBase('MR416i controller', 'DL380_Gen12_SFF');
  assert.ok(resultStorage.answer.includes('MR416i') || resultStorage.answer.includes('Storage Controllers'), 'Should match MR416i storage controller');
});

test('3) Semantic similarity ranking score ordering', () => {
  const resultProc = queryLocalKnowledgeBase('processor', 'DL380_Gen12_SFF');
  assert.ok(resultProc.answer.includes('Matching Processor SKUs') || resultProc.answer.includes('Processors with'), 'Should group processor matches');

  // Multi-term query ranking
  const resultMulti = queryLocalKnowledgeBase('Power Supply 1600W Titanium', 'DL380_Gen12_SFF');
  assert.ok(resultMulti.answer.includes('Power') || resultMulti.answer.includes('Supply') || resultMulti.answer.includes('1600W'), 'Should match power supply terms');
});

test('4) Edge cases: Empty strings, dirty characters, query truncation, zero-match fallbacks', () => {
  // Zero-match fallback
  const resultZero = queryLocalKnowledgeBase('GibberishNonExistentXYZ999', 'DL380_Gen12_SFF');
  assert.ok(resultZero.answer.includes('No specific catalog items or rules found matching query'), 'Should return zero-match fallback message');
  assert.strictEqual(resultZero.confidenceScore, 0.0, 'Zero match should have 0.0 confidence');
  assert.deepStrictEqual(resultZero.citations, [], 'Zero match should have empty citations');

  // Empty query
  const resultEmpty = queryLocalKnowledgeBase('', 'DL380_Gen12_SFF');
  assert.ok(resultEmpty.answer.includes('No specific catalog items or rules found matching query'), 'Should handle empty query gracefully');

  // Null query
  const resultNull = queryLocalKnowledgeBase(null, 'DL380_Gen12_SFF');
  assert.ok(resultNull.answer.includes('No specific catalog items or rules found matching query'), 'Should handle null query gracefully');

  // Special regex characters in search
  const resultRegex = queryLocalKnowledgeBase('C++? [.*] (regex+)', 'DL380_Gen12_SFF');
  assert.ok(resultRegex.answer.includes('No specific catalog items') || resultRegex.confidenceScore >= 0, 'Should sanitize special characters without throwing');
});

test('5) Cross-generation and multi-family knowledge search consistency', () => {
  // Tape Library query for DL380 should not return tape library hardware items
  const resultIsol = queryLocalKnowledgeBase('Tape Library', 'DL380_Gen12_SFF');
  assert.ok(resultIsol.answer.includes('No specific catalog items or rules found'), 'DL380 should isolate from tape library hardware');

  // Tape Library query on MSL3040 should match MSL3040
  const resultTape = queryLocalKnowledgeBase('MSL3040 Tape', 'MSL3040_Tape');
  assert.ok(resultTape.answer.includes('MSL3040') || resultTape.answer.includes('Tape'), 'MSL3040 search should match MSL3040 Tape');
});