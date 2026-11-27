'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parsePipelineArgs,
  buildNavigateArgs,
  buildScrapeArgs
} = require('../../scripts/lib/scraper/dashboard_scrape_pipeline.js');

test('parsePipelineArgs parses chassis, mode, recover, sync-knowledge, and skip-navigate flags', () => {
  const opts = parsePipelineArgs([
    '--chassis', 'Alletra MP B10000',
    '--mode', 'storage',
    '--recover',
    '--sync-knowledge',
    '--skip-navigate'
  ]);
  assert.deepEqual(opts, {
    mode: 'storage',
    recover: true,
    syncKnowledge: true,
    skipNavigate: true,
    chassis: 'Alletra MP B10000'
  });
});

test('buildNavigateArgs and buildScrapeArgs avoid duplicate --recover when navigation already ran', () => {
  const withNav = { chassis: 'DL380_Gen12', recover: true, skipNavigate: false };
  assert.deepEqual(buildNavigateArgs(withNav), ['DL380_Gen12', '--recover']);
  assert.deepEqual(buildScrapeArgs(withNav), ['--chassis', 'DL380_Gen12']);

  const skipNav = { chassis: 'DL380_Gen12', recover: true, skipNavigate: true };
  assert.deepEqual(buildScrapeArgs(skipNav), ['--chassis', 'DL380_Gen12', '--recover']);
});
