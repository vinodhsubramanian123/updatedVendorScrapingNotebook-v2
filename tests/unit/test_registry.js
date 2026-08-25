const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { updateScrapedRegistry, REGISTRY_PATH } = require('../../scripts/lib/catalog/registry.js');

test('updateScrapedRegistry', async (t) => {
  // Capture fs.writeFileSync calls
  let writtenPath;
  let writtenContent;

  t.mock.method(fs, 'writeFileSync', (p, c) => {
    writtenPath = p;
    writtenContent = c;
  });

  // Mock console.log to avoid spamming the test output
  t.mock.method(console, 'log', () => {});

  const MOCK_PROJECT_ROOT = path.resolve(__dirname, '..', '..');
  const mockInfo = {
    timestamp: '2023-10-27T12:00:00.000Z',
    solutionName: 'Test Solution',
    family: 'ProLiant',
    gen: 'Gen11',
    chassisName: 'DL380',
    skuCount: 42,
    xlsxPath: path.join(MOCK_PROJECT_ROOT, 'outputs/test/catalog.xlsx'),
    jsonPath: path.join(MOCK_PROJECT_ROOT, 'outputs/test/catalog.json'),
    pdfPath: path.join(MOCK_PROJECT_ROOT, 'outputs/test/advisory.pdf'),
    outputDir: path.join(MOCK_PROJECT_ROOT, 'outputs/test/')
  };

  await t.test('creates new file with headers if registry does not exist', (t2) => {
    t2.mock.method(fs, 'existsSync', (p) => false);

    updateScrapedRegistry(mockInfo);

    assert.strictEqual(writtenPath, REGISTRY_PATH);
    assert.match(writtenContent, /# Master Scraped HPE Product Catalogs Registry/);
    assert.match(writtenContent, /\| 2023-10-27 \| Test Solution \| ProLiant \| Gen11 \| `DL380` \| \*\*42\*\* \| \[catalog\.xlsx\]\(outputs\/test\/catalog\.xlsx\) \| \[catalog\.json\]\(outputs\/test\/catalog\.json\) \| \[PDF\]\(outputs\/test\/advisory\.pdf\) \| `outputs\/test\/` \|/);
  });

  await t.test('appends to existing file if entry is not present', (t2) => {
    t2.mock.method(fs, 'existsSync', (p) => true);
    t2.mock.method(fs, 'readFileSync', (p, enc) => {
      return `# Master Scraped HPE Product Catalogs Registry\n\n## Scraped Product Catalogs\n\n| Date | Solution Name | Family | Gen | Chassis (prefix) | Total SKUs | Excel | JSON | PDF | Output Folder |\n| :--- | :--- | :--- | :--- | :--- | ---: | :--- | :--- | :--- | :--- |\n`;
    });

    const info = {
      ...mockInfo,
      pdfPath: null, // Test null pdfPath
      skuCount: undefined,
      tablesCount: 15,
      solutionName: undefined // Test default 'OCA Solution'
    };

    updateScrapedRegistry(info);

    assert.strictEqual(writtenPath, REGISTRY_PATH);
    assert.match(writtenContent, /\| 2023-10-27 \| OCA Solution \| ProLiant \| Gen11 \| `DL380` \| \*\*15\*\* \| \[catalog\.xlsx\]\(outputs\/test\/catalog\.xlsx\) \| \[catalog\.json\]\(outputs\/test\/catalog\.json\) \| Advisory \(No QS Link\) \| `outputs\/test\/` \|/);
  });

  await t.test('updates existing row if outputDir matches', (t2) => {
    t2.mock.method(fs, 'existsSync', (p) => true);

    // An existing registry file with an outdated row for the same output folder
    const existingContent = `# Master Scraped HPE Product Catalogs Registry\n\n` +
      `| Date | Solution Name | Family | Gen | Chassis (prefix) | Total SKUs | Excel | JSON | PDF | Output Folder |\n` +
      `| :--- | :--- | :--- | :--- | :--- | ---: | :--- | :--- | :--- | :--- |\n` +
      `| 2023-10-26 | Old Solution | OldFam | Gen10 | \`DL360\` | **10** | [old.xlsx](old.xlsx) | [old.json](old.json) | Advisory (No QS Link) | \`outputs/test/\` |\n`;

    t2.mock.method(fs, 'readFileSync', (p, enc) => existingContent);

    updateScrapedRegistry(mockInfo);

    assert.strictEqual(writtenPath, REGISTRY_PATH);

    // Should NOT contain the old row
    assert.doesNotMatch(writtenContent, /Old Solution/);

    // Should contain the updated row in its place
    assert.match(writtenContent, /\| 2023-10-27 \| Test Solution \| ProLiant \| Gen11 \| `DL380` \| \*\*42\*\* \| \[catalog\.xlsx\]\(outputs\/test\/catalog\.xlsx\) \| \[catalog\.json\]\(outputs\/test\/catalog\.json\) \| \[PDF\]\(outputs\/test\/advisory\.pdf\) \| `outputs\/test\/` \|/);
  });

});
