'use strict';
const { buildRefreshPlan, executeRefreshPlan } = require('../lib/catalog/catalog_refresh_plan.js');
const args = process.argv.slice(2);
function values(flag) { return args.flatMap((value, index) => value === flag && args[index + 1] ? [args[index + 1]] : []); }
const products = values('--product').flatMap(p => p.split(',')).map(s => s.trim()).filter(Boolean);
try {
  const plan = buildRefreshPlan({ products, filePath: values('--workbook')[0],
    query: values('--query')[0], vendor: values('--vendor')[0] || 'HPE', force: args.includes('--force') });
  const execution = args.includes('--execute') ? executeRefreshPlan(plan) : null;
  process.stdout.write(JSON.stringify({ plan, execution }, null, 2) + '\n');
  if (!plan.ready || execution?.success === false) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
