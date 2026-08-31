'use strict';
/**
 * scripts/maintenance/analyze_circular_deps.js — Static Circular Dependency Analyzer
 *
 * Scans JavaScript and JSX files across the codebase to:
 * - Extract all require() and import/export statements
 * - Resolve absolute filesystem paths
 * - Build dependency adjacency graph
 * - Detect all simple cycles (Tarjan / DFS cycle detection)
 * - Report exact cycle paths and offending modules
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// File extensions to test for resolution
const EXTENSIONS = ['.js', '.jsx', '.cjs', '.mjs', '.json'];

function resolveModule(sourceFile, importPath) {
  // Ignore external node_modules or built-ins
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  const sourceDir = path.dirname(sourceFile);
  const targetBase = path.resolve(sourceDir, importPath);

  // 1. Direct file match
  if (fs.existsSync(targetBase) && fs.statSync(targetBase).isFile()) {
    return targetBase;
  }

  // 2. Direct with extension
  for (const ext of EXTENSIONS) {
    const candidate = targetBase + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  // 3. Directory index
  if (fs.existsSync(targetBase) && fs.statSync(targetBase).isDirectory()) {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(targetBase, 'index' + ext);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
  }

  return null;
}

function stripComments(content) {
  // Strip block comments /* ... */ and line comments // ...
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');
}

function extractImports(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const content = stripComments(rawContent);
  const imports = [];

  // Match require('...')
  const requireRegex = /\brequire\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Match import ... from '...'
  const importFromRegex = /\bimport\s+(?:[\s\S]*?from\s+)?['"`]([^'"`]+)['"`]/g;
  while ((match = importFromRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Match export ... from '...'
  const exportFromRegex = /\bexport\s+(?:[\s\S]*?from\s+)?['"`]([^'"`]+)['"`]/g;
  while ((match = exportFromRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === '_archive_scripts' ||
        entry.name === 'graphify-out' ||
        entry.name === '.agents'
      ) continue;
      walkDir(fullPath, fileList);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs') || entry.name.endsWith('.jsx'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function buildDependencyGraph(files) {
  const graph = new Map();

  for (const file of files) {
    const rawImports = extractImports(file);
    const resolvedDeps = new Set();

    for (const imp of rawImports) {
      const resolved = resolveModule(file, imp);
      if (resolved && (resolved.endsWith('.js') || resolved.endsWith('.jsx') || resolved.endsWith('.cjs'))) {
        resolvedDeps.add(resolved);
      }
    }

    graph.set(file, Array.from(resolvedDeps));
  }

  return graph;
}

function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recStack = new Set();
  const pathStack = [];

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    pathStack.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStartIndex = pathStack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = pathStack.slice(cycleStartIndex).concat(neighbor);
          cycles.push(cyclePath);
        }
      }
    }

    pathStack.pop();
    recStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  // Deduplicate cycles (normalize cycles by rotation)
  const uniqueCycles = [];
  const seenCycleSignatures = new Set();

  for (const cycle of cycles) {
    const cycleNodes = cycle.slice(0, -1);
    const minIndex = cycleNodes.reduce((minIdx, curr, idx, arr) => curr < arr[minIdx] ? idx : minIdx, 0);
    const rotated = [...cycleNodes.slice(minIndex), ...cycleNodes.slice(0, minIndex)];
    const sig = rotated.join(' -> ');

    if (!seenCycleSignatures.has(sig)) {
      seenCycleSignatures.add(sig);
      uniqueCycles.push(cycle);
    }
  }

  return uniqueCycles;
}

function runCircularAnalysis() {
  console.log('================================================================');
  console.log('🔄 STATIC CIRCULAR DEPENDENCY & GRAPH CYCLE ANALYZER');
  console.log('================================================================\n');

  const targets = [
    path.join(PROJECT_ROOT, 'scripts'),
    path.join(PROJECT_ROOT, 'dashboard', 'src'),
    path.join(PROJECT_ROOT, 'dashboard', 'routes'),
    path.join(PROJECT_ROOT, 'dashboard', 'services'),
    path.join(PROJECT_ROOT, 'tests')
  ];

  const allFiles = targets.flatMap(t => walkDir(t));
  console.log(`📁 Scanning ${allFiles.length} files across repository for circular dependencies...`);

  const graph = buildDependencyGraph(allFiles);
  const cycles = findCycles(graph);

  if (cycles.length === 0) {
    console.log('\n✅ NO CIRCULAR DEPENDENCIES FOUND! Dependency graph is a clean DAG.\n');
  } else {
    console.log(`\n❌ FOUND ${cycles.length} CIRCULAR DEPENDENCY CYCLE(S):\n`);
    cycles.forEach((cycle, idx) => {
      console.log(`----------------------------------------------------------------`);
      console.log(`🔴 Cycle #${idx + 1} (${cycle.length - 1} hops):`);
      cycle.forEach((step, stepIdx) => {
        const rel = path.relative(PROJECT_ROOT, step);
        if (stepIdx === cycle.length - 1) {
          console.log(`   └─► 🔁 (Back to: ${rel})`);
        } else {
          console.log(`   ${stepIdx === 0 ? '┌──' : '├──'} ${rel}`);
        }
      });
    });
    console.log('----------------------------------------------------------------\n');
  }

  return { allFiles, graph, cycles };
}

if (require.main === module) {
  runCircularAnalysis();
}

module.exports = { runCircularAnalysis, buildDependencyGraph, findCycles };
