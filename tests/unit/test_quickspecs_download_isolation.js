'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { downloadQuickSpecs } = require('../../scripts/scrapers/download_quickspecs_pdf.js');

test('QuickSpecs over HTTPS works without Chrome and preserves nearby PDFs', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quickspecs-download-'));
  const destination = path.join(dir, 'QuickSpecs.pdf');
  const unrelated = path.join(dir, 'Other.pdf');
  const pdf = Buffer.alloc(120000);
  pdf.write('%PDF-');
  fs.writeFileSync(unrelated, 'unrelated');
  t.after(() => {
    for (const file of [destination, unrelated]) fs.rmSync(file, { force: true });
    fs.rmdirSync(dir);
  });
  const fetchStub = t.mock.method(global, 'fetch', async url => {
    assert.equal(url, 'https://support.hpe.com/hpesc/public/api/document/a50006984enw');
    return new Response(pdf);
  });

  const first = await downloadQuickSpecs('https://www.hpe.com/psnow/doc/a50006984enw', destination);
  assert.equal(first.method, 'HTTPS');
  assert.deepEqual(fs.readFileSync(destination), pdf);
  assert.equal(fs.readFileSync(unrelated, 'utf8'), 'unrelated');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['Other.pdf', 'QuickSpecs.pdf']);

  const cached = await downloadQuickSpecs('a50006984enw', destination);
  assert.equal(cached.method, 'cache');
  assert.equal(fetchStub.mock.callCount(), 1);
});
