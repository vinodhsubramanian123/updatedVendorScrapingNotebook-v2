const fs = require('fs');
const path = require('path');
let content = fs.readFileSync('scripts/lib/conflict_graph.js', 'utf8');

const oldSignature = 'function synthesize5TierRankedSolutions(items = [], evalResults = {}, graphResults = {}) {';
const newSignature = 'function synthesize5TierRankedSolutions(items = [], evalResults = {}, graphResults = {}, chassisInfo = {}, targetDir = \'\') {';

content = content.replace(oldSignature, newSignature);

const oldCall = 'const rankedSolutions = synthesize5TierRankedSolutions(boqItems, { missingDependencies }, { isWholeSolutionValid, conflicts });';
const newCall = 'const rankedSolutions = synthesize5TierRankedSolutions(boqItems, { missingDependencies }, { isWholeSolutionValid, conflicts }, chassisInfo, targetDir);';

content = content.replace(oldCall, newCall);

fs.writeFileSync('scripts/lib/conflict_graph.js', content);
