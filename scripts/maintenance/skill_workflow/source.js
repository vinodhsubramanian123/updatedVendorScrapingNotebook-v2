'use strict';
// Parse source without require/import of inventoried modules or execution of CLIs.
const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');
const { SOURCE_EXTENSIONS, relative, isWithin } = require('./io.js');

function parserInfo() {
  try {
    const resolved = require.resolve('@babel/parser');
    const manifest = JSON.parse(fs.readFileSync(path.resolve(path.dirname(resolved), '../package.json'), 'utf8'));
    return { available: true, path: resolved, version: manifest.version, parser: require('@babel/parser'), dependencyStatus: 'INSTALLED_OPTIONAL_TOOLING_DEPENDENCY' };
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return { available: false, reason: '@babel/parser unavailable; AST coverage incomplete. No regex orphan claims.' };
  }
}

function parseSource(text, file, parser = parserInfo()) {
  if (!parser.available) return { ast: null, error: parser.reason };
  try {
    const plugins = ['jsx'];
    if (/\.tsx?$/i.test(file)) plugins.push('typescript');
    return { ast: parser.parser.parse(text, { sourceType: 'unambiguous', plugins }), error: null };
  } catch (error) { return { ast: null, error: `${error.message} (${file})` }; }
}

function visit(ast, callback) {
  const stack = [{ node: ast, ancestors: [] }];
  while (stack.length) {
    const { node, ancestors } = stack.pop();
    if (!node || typeof node.type !== 'string') continue;
    callback(node, ancestors);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'extra', 'comments', 'tokens', 'errors'].includes(key)) continue;
      const children = Array.isArray(value) ? value : [value];
      for (const child of children) if (child && typeof child.type === 'string') stack.push({ node: child, ancestors: [...ancestors, node] });
    }
  }
}

function literal(node) {
  if (node?.type === 'StringLiteral') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0]?.value.cooked;
  return null;
}

function property(node) {
  return node?.type === 'Identifier' ? node.name : literal(node);
}

function memberName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression' && node?.type !== 'OptionalMemberExpression') return null;
  const left = memberName(node.object), right = property(node.property);
  return left && right ? `${left}.${right}` : null;
}

function requireBindings(node, ancestors) {
  const parent = ancestors.at(-1);
  if (parent?.type === 'MemberExpression' && parent.object === node) return [{ imported: property(parent.property), local: null }];
  if (parent?.type !== 'VariableDeclarator') return [];
  if (parent.id.type === 'Identifier') return [{ imported: '*', local: parent.id.name }];
  if (parent.id.type === 'ObjectPattern') return parent.id.properties.filter(p => p.type === 'ObjectProperty').map(p => ({ imported: property(p.key), local: property(p.value) }));
  return [{ imported: '*', local: null, unresolved: true }];
}

function declaredNames(declaration) {
  if (!declaration) return [];
  if (declaration.id?.name) return [declaration.id.name];
  if (declaration.type === 'VariableDeclaration') return declaration.declarations.flatMap(d => d.id.type === 'Identifier' ? [d.id.name] : []);
  return [];
}

function resolveModule(root, source, specifier) {
  if (builtinModules.includes(specifier) || specifier.startsWith('node:')) return { resolution: 'BUILTIN' };
  if (!specifier.startsWith('.') && !path.isAbsolute(specifier)) return { resolution: 'EXTERNAL_OR_ALIAS' };
  const base = path.resolve(root, path.dirname(source), specifier);
  const candidates = [base, ...[...SOURCE_EXTENSIONS, '.json'].map(ext => base + ext), ...[...SOURCE_EXTENSIONS, '.json'].map(ext => path.join(base, 'index' + ext))];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return { target: isWithin(root, candidate) ? relative(root, candidate) : candidate, resolution: isWithin(root, candidate) ? 'RESOLVED' : 'OUTSIDE_ROOT' };
  }
  return { target: relative(root, base), resolution: 'UNRESOLVED_LOCAL' };
}

function analyzeSource(root, file, parser = parserInfo()) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const parsed = parseSource(text, file, parser);
  const imports = [], exports = [], calls = [], dynamicEdges = [], switches = [];
  if (!parsed.ast) return { path: file, parseStatus: 'UNAVAILABLE_OR_ERROR', error: parsed.error, imports, exports, calls, dynamicEdges, switches };
  const addImport = (specifier, node, kind, bindings = []) => {
    if (specifier === null) { dynamicEdges.push({ kind, line: node.loc?.start.line, expression: text.slice(node.start, node.end).slice(0, 200) }); return; }
    imports.push({ specifier, kind, line: node.loc?.start.line, bindings, ...resolveModule(root, file, specifier) });
  };
  visit(parsed.ast, (node, ancestors) => {
    if (node.type === 'ImportDeclaration') addImport(node.source.value, node, 'esm', node.specifiers.map(s => ({ imported: s.type === 'ImportNamespaceSpecifier' ? '*' : s.type === 'ImportDefaultSpecifier' ? 'default' : property(s.imported), local: s.local.name })));
    if (node.type === 'ExportNamedDeclaration') {
      exports.push(...declaredNames(node.declaration), ...node.specifiers.map(s => property(s.exported)));
      if (node.source) addImport(node.source.value, node, 'reexport');
    }
    if (node.type === 'ExportDefaultDeclaration') exports.push('default');
    if (node.type === 'ExportAllDeclaration') { exports.push('*REEXPORT'); addImport(node.source.value, node, 'reexport-all'); }
    if (node.type === 'AssignmentExpression') {
      const name = memberName(node.left);
      if (name === 'module.exports') {
        if (node.right.type === 'ObjectExpression') for (const p of node.right.properties) exports.push(p.type === 'SpreadElement' ? '*DYNAMIC_SPREAD' : property(p.key));
        else exports.push('*ASSIGNED_VALUE');
      } else if (name?.startsWith('module.exports.') || name?.startsWith('exports.')) exports.push(name.split('.').at(-1));
    }
    if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const callee = memberName(node.callee);
      calls.push({ callee: callee || '<computed>', line: node.loc?.start.line });
      if (callee === 'require') addImport(literal(node.arguments[0]), node, 'require', requireBindings(node, ancestors));
      if (node.callee.type === 'Import') addImport(literal(node.arguments[0]), node, 'dynamic-import');
    }
    if (node.type === 'ImportExpression') addImport(literal(node.source), node, 'dynamic-import');
    if (node.type === 'SwitchStatement') switches.push({ expression: text.slice(node.discriminant.start, node.discriminant.end), line: node.loc.start.line, cases: node.cases.map(c => ({ value: c.test ? literal(c.test) ?? text.slice(c.test.start, c.test.end) : '<default>', line: c.loc.start.line })) });
  });
  return { path: file, parseStatus: 'PARSED', deprecatedDeclaration: /@deprecated\b/.test(text.slice(0, 1200)), imports, exports: [...new Set(exports.filter(Boolean))].sort(), calls, dynamicEdges, switches };
}

module.exports = { parserInfo, parseSource, visit, literal, property, memberName, resolveModule, analyzeSource };
