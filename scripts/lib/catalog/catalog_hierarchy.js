'use strict';

function resolveOwnedCatalogPath(productId, notebooks) {
  const path = [];
  const seen = new Set();
  for (let id = productId; id;) {
    if (seen.has(id)) throw new Error(`CATALOG_OWNERSHIP_CYCLE: ${[...seen, id].join(' -> ')}`);
    seen.add(id);
    const entry = notebooks[id];
    if (!entry) throw new Error(`CATALOG_PARENT_UNREGISTERED: ${id}`);
    if (!entry.baseSku) throw new Error(`CATALOG_OWNER_BASE_MISSING: ${id}`);
    if (entry.captureViaParent && !entry.parentProductId) throw new Error(`CATALOG_OWNER_PARENT_MISSING: ${id}`);
    path.unshift({ ...entry, productId: id });
    id = entry.captureViaParent ? entry.parentProductId : null;
  }
  if (new Set(path.map(entry => String(entry.vendor || 'HPE').toUpperCase())).size > 1) throw new Error('CATALOG_CROSS_VENDOR_OWNERSHIP');
  return path;
}

function matchesOwnedCatalogPath(expected, observed) {
  return Array.isArray(observed) && expected.length === observed.length && expected.every((entry, index) => {
    const step = observed[index];
    return step?.productId === entry.productId && step.baseSku === entry.baseSku && Boolean(step.ownerConfiguration);
  });
}

function collectDeclaredCatalogScopes(groups) {
  const scopes = new Map();
  function visit(children, parent, ancestors) {
    for (const child of children || []) {
      const id = child.productId || parent.productId;
      const previous = scopes.get(id);
      if (!child.productId || ancestors.has(id) || (previous && (previous.parentProductId !== parent.productId || previous.baseSku !== child.baseSku))) {
        scopes.set(id, { ...(previous || parent), declarationIssue: 'INVALID_OR_CONFLICTING_OWNED_SCOPE' });
        continue;
      }
      const scope = { ...child, family: child.family || parent.family, generation: child.generation || parent.generation, parentProductId: parent.productId };
      scopes.set(id, scope);
      visit(child.ownedCatalogs, scope, new Set([...ancestors, id]));
    }
  }
  for (const group of Object.values(groups || {})) {
    const root = { productId: group.catalogProductId, family: group.family, generation: group.gen };
    if (root.productId) visit(group.ownedCatalogs, root, new Set([root.productId]));
  }
  return scopes;
}

function registeredOwnedMenuMatches(entry, heading) {
  const text = String(heading || '').trim();
  if (entry.ocaMenuName) {
    return text.replace(/^\s*[A-Z0-9-]+\s+-\s+/i, '').replace(/\s*\[[A-Z0-9-]+\]$/i, '').trim().toLowerCase() === entry.ocaMenuName.trim().toLowerCase();
  }
  return require('./product_meta').parseProductMeta(text).cleanName === entry.productId &&
    !/\b(?:support|service|license|cable|transceiver|kit)\b/i.test(text);
}

module.exports = { resolveOwnedCatalogPath, matchesOwnedCatalogPath, collectDeclaredCatalogScopes, registeredOwnedMenuMatches };
