'use strict';
/**
 * scripts/lib/local_rag_search.js
 * Advanced Local RAG & Gemini Notebook Search Engine across scraped HPE product catalogs, rules, SKUs, and Knowledge Deltas.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const KNOWLEDGE_FILE = path.join(OUTPUTS_DIR, 'history', 'master_knowledge_registry.json');

const STOP_WORDS = new Set([
  'list', 'the', 'having', 'equal', 'more', 'than', 'less', 'with', 'what', 'are', 'is', 'for', 'and', 'or', 'to', 'in', 'of', 'on', 'a', 'an', 'show', 'get', 'find', 'all'
]);

function queryLocalKnowledgeBase(query, chassisName = '') {
  const citations = [];
  const matches = [];

  const cleanQuery = (query || '').toLowerCase();
  const rawWords = cleanQuery.split(/[\s,;.!?'"()[\]{}]+/).filter(w => w.length > 0);
  const searchTerms = rawWords.filter(w => !STOP_WORDS.has(w) && w.length >= 2);

  // Check if query is asking for cores threshold (e.g., "64 cores", "equal to or more than 64", ">= 64")
  let minCores = null;
  const coreMatch = cleanQuery.match(/(\d+)\s*(-|\s*)core/i) || cleanQuery.match(/(?:more than|equal to|at least|\>=)\s*(\d+)/i) || cleanQuery.match(/(\d+)\s*cores/i);
  if (coreMatch) {
    minCores = parseInt(coreMatch[1], 10);
  }

  const isProcessorQuery = cleanQuery.includes('processor') || cleanQuery.includes('cpu') || cleanQuery.includes('core') || minCores !== null;

  // 1. Search Knowledge Deltas
  if (fs.existsSync(KNOWLEDGE_FILE)) {
    try {
      const registry = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
      const rules = registry.chassisSpecificRules || [];
      for (const rule of rules) {
        const raw = (rule.rawMessage || '' ).toLowerCase();
        const update = (rule.ruleUpdate || '').toLowerCase();
        const affected = (rule.affectedSku || '').toLowerCase();

        if (searchTerms.length > 0 && searchTerms.some(term => raw.includes(term) || update.includes(term) || affected.includes(term))) {
          matches.push(`• [Knowledge Delta - ${rule.chassis}] ${rule.rawMessage || rule.ruleUpdate}`);
          citations.push({
            title: `Master Knowledge Registry (${rule.deltaId})`,
            snippet: rule.rawMessage || rule.ruleUpdate,
            url: `/artifacts/history/master_knowledge_registry.json`
          });
        }
      }
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'local_rag_search.js', e); }
  }

  // 2. Search Catalogs dynamically across outputs directory
  const { listAllCatalogs } = require('./catalog_discovery');
  const catalogPaths = listAllCatalogs().map(c => c.catalogDir);

  const matchedProcessorSkus = [];

  let filteredCatalogPaths = catalogPaths;
  if (chassisName) {
    const normChassis = chassisName.toLowerCase().replace(/[^a-z0-9]/g, '');
    filteredCatalogPaths = catalogPaths.filter(cDir => {
      const folderName = path.basename(cDir);
      const normFolder = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normChassis.includes(normFolder) || normFolder.includes(normChassis) || normChassis.includes(normFolder.replace('sff', ''));
    });
    // Fallback if no match found (e.g. name mismatch)
    if (filteredCatalogPaths.length === 0) {
      filteredCatalogPaths = catalogPaths;
    }
  }

  for (const cDir of filteredCatalogPaths) {
    if (!fs.existsSync(cDir)) continue;

    const folderName = path.basename(cDir);
    const rulesCsv = path.join(cDir, `${folderName}_Catalog_Rules.csv`);
    const catalogJson = path.join(cDir, `${folderName}_Catalog.json`);

    // Search Catalog JSON
    if (fs.existsSync(catalogJson)) {
      try {
        const catData = JSON.parse(fs.readFileSync(catalogJson, 'utf-8'));
        const entries = catData.entries || [];

        for (const entry of entries) {
          const parentCat = (entry.parentCategory || '').toLowerCase();
          const subCat = (entry.subCategory || '').toLowerCase();
          const catStr = `${parentCat} ${subCat}`;

          if (isProcessorQuery && (parentCat.includes('processor') || subCat.includes('processor') || subCat.includes('intel') || subCat.includes('amd'))) {
            const skus = entry.skus || [];
            for (const s of skus) {
              const desc = s.description || '';
              const descLower = desc.toLowerCase();

              const coresInSkuMatch = descLower.match(/(\d+)\s*-?\s*core/);
              const coresInSku = coresInSkuMatch ? parseInt(coresInSkuMatch[1], 10) : null;

              if (minCores !== null) {
                if (coresInSku !== null && coresInSku >= minCores) {
                  matchedProcessorSkus.push({
                    chassis: folderName,
                    sku: s.sku,
                    description: desc,
                    cores: coresInSku,
                    price: s.listPriceFormatted || `$${s.listPrice}`,
                    catalogPath: catalogJson
                  });
                }
              } else if (searchTerms.length === 0 || searchTerms.some(term => descLower.includes(term))) {
                matchedProcessorSkus.push({
                  chassis: folderName,
                  sku: s.sku,
                  description: desc,
                  cores: coresInSku,
                  price: s.listPriceFormatted || `$${s.listPrice}`,
                  catalogPath: catalogJson
                });
              }
            }
          } else if (!isProcessorQuery && searchTerms.length > 0) {
            const isCatMatch = searchTerms.some(term => catStr.includes(term));
            
            // Search inside the SKUs as well
            let matchedSkusInCat = [];
            for (const s of (entry.skus || [])) {
               const sLower = (s.sku || '').toLowerCase();
               const descLower = (s.description || '').toLowerCase();
               if (searchTerms.some(term => sLower.includes(term) || descLower.includes(term))) {
                  matchedSkusInCat.push(s);
               }
            }

            if (isCatMatch || matchedSkusInCat.length > 0) {
              const skusToDisplay = matchedSkusInCat.length > 0 ? matchedSkusInCat : (entry.skus || []);
              const skuList = skusToDisplay.slice(0, 4).map(s => `${s.sku} (${s.description}) - ${s.listPriceFormatted || '$' + s.listPrice}`).join('; ');
              if (skuList) {
                matches.push(`• [${folderName} Hardware SKUs] ${entry.parentCategory} > ${entry.subCategory}: ${skuList}`);
                citations.push({
                  title: `${folderName} ${entry.subCategory} SKUs`,
                  snippet: skuList,
                  url: `/artifacts/${path.relative(OUTPUTS_DIR, catalogJson)}`
                });
              }
            }
          }
        }
        
        // Search base variants
        const baseVariants = catData.chassisBaseVariants || catData.baseVariants || [];
        for (const variant of baseVariants) {
          const skuLower = (variant.sku || '').toLowerCase();
          const descLower = (variant.description || variant.desc || '').toLowerCase();
          if (searchTerms.some(term => skuLower.includes(term) || descLower.includes(term))) {
            const priceStr = variant.price || variant.listPriceFormatted || `$${variant.listPrice || variant.priceNum || 0}`;
            matches.push(`• [${folderName} Base Chassis] ${variant.sku}: ${variant.description || variant.desc} - ${priceStr}`);
            citations.push({
              title: `${folderName} Base Chassis SKUs`,
              snippet: `${variant.sku}: ${variant.description || variant.desc}`,
              url: `/artifacts/${path.relative(OUTPUTS_DIR, catalogJson)}`
            });
          }
        }
      } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'local_rag_search.js', e); }
    }

    // Search Rules CSV
    if (fs.existsSync(rulesCsv) && !isProcessorQuery) {
      const csvLines = fs.readFileSync(rulesCsv, 'utf-8').split(/\r?\n/);
      for (let i = 1; i < csvLines.length; i++) {
        const line = csvLines[i];
        if (!line) continue;
        const lineLower = line.toLowerCase();

        if (searchTerms.length > 0 && searchTerms.some(term => lineLower.includes(term))) {
          const parts = line.split(',');
          const mainCat = parts[0] || '';
          const subCat = parts[1] || '';
          const constraint = parts[2] || '';
          const ruleText = parts[4] || line;

          matches.push(`• [${folderName} Catalog Rule] Category: ${mainCat} > ${subCat} | Constraint: ${constraint} (${ruleText})`);
          citations.push({
            title: `${folderName} Catalog Rules`,
            snippet: `${mainCat} > ${subCat}: ${ruleText}`,
            url: `/artifacts/${path.relative(OUTPUTS_DIR, rulesCsv)}`
          });
          if (matches.length >= 12) break;
        }
      }
    }
  }

  if (matchedProcessorSkus.length > 0) {
    matchedProcessorSkus.sort((a, b) => (b.cores || 0) - (a.cores || 0));

    const procLines = matchedProcessorSkus.map(p =>
      `• **${p.sku}** (${p.chassis}): ${p.description} — **${p.price}** [Cores: ${p.cores || 'N/A'}]`
    );

    const heading = minCores !== null
      ? `### Processors with ${minCores}+ Cores (HPE QuickSpecs Catalog)\n\nFound **${matchedProcessorSkus.length}** processors meeting or exceeding **${minCores} cores**:`
      : `### Matching Processor SKUs (HPE QuickSpecs Catalog)\n\nFound **${matchedProcessorSkus.length}** matching processors:`;

    for (const p of matchedProcessorSkus.slice(0, 5)) {
      citations.push({
        title: `${p.chassis} Processor Catalog`,
        snippet: `${p.sku}: ${p.description} (${p.price})`,
        url: `/artifacts/${path.relative(OUTPUTS_DIR, p.catalogPath)}`
      });
    }

    matches.unshift(`${heading}\n\n${procLines.join('\n')}`);
  }

  const uniqueCitations = [];
  const seenTitles = new Set();
  for (const c of citations) {
    if (!seenTitles.has(c.title)) {
      seenTitles.add(c.title);
      uniqueCitations.push(c);
    }
  }

  let formattedAnswer = '';
  if (matches.length > 0) {
    formattedAnswer = matches.join('\n\n');
  } else {
    formattedAnswer = `### Local RAG Engine Response\n\nNo specific catalog items or rules found matching query '${query}' for ${chassisName || 'the selected chassis'}.`;
  }

  return {
    query,
    answer: formattedAnswer,
    citations: uniqueCitations,
    source: 'LOCAL_CATALOG_RAG'
  };
}

async function queryLocalKnowledgeBaseAsync(query, chassisName = '', notebookId = '') {
  let resolvedChassis = chassisName;
  if (!resolvedChassis && notebookId) {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'notebooks.json'), 'utf-8'));
      if (config.notebooks) {
        for (const [chassis, nid] of Object.entries(config.notebooks)) {
          if (nid === notebookId) {
            resolvedChassis = chassis;
            break;
          }
        }
      }
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'local_rag_search.js', e); }
  }
  const localRes = queryLocalKnowledgeBase(query, resolvedChassis);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return localRes;
  }

  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are the official Gemini NotebookLM RAG Assistant for HPE Solution Configurator (Notebook ID: ${notebookId || 'Mapped Notebook'}).
User Query: "${query}"

Grounded Context & Ingested Notebook Data:
${localRes.answer}

Instructions:
1. Answer the query thoroughly, directly, and accurately using the grounded notebook and catalog data above.
2. Maintain clean markdown formatting with bolding for SKUs, bullet points, core counts, and prices.
3. Keep the citations accurate and professional.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });

    if (response && response.text) {
      return {
        query,
        answer: response.text.trim(),
        citations: localRes.citations,
        source: 'GEMINI_NOTEBOOK_RAG'
      };
    }
  } catch (err) {
    console.error('Gemini API query error:', err.message);
  }

  return localRes;
}

module.exports = { queryLocalKnowledgeBase, queryLocalKnowledgeBaseAsync };
