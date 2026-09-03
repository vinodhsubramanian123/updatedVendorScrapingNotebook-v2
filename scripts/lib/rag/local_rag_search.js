'use strict';
/**
 * scripts/lib/local_rag_search.js
 * Advanced Local RAG & Gemini Notebook Search Engine across scraped HPE product catalogs, rules, SKUs, and Knowledge Deltas.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const KNOWLEDGE_FILE = path.join(OUTPUTS_DIR, 'history', 'master_knowledge_registry.json');

const STOP_WORDS = new Set([
  'list', 'the', 'having', 'equal', 'more', 'than', 'less', 'with', 'what', 'are', 'is', 'for', 'and', 'or', 'to', 'in', 'of', 'on', 'a', 'an', 'show', 'get', 'find', 'all'
]);

const SYNONYM_MAP = {
  'high speed ram': ['ddr5'],
  'ram': ['memory', 'ddr4', 'ddr5'],
  'redundant power': ['rps', 'power supply', 'redundant'],
  'nvme read intensive': ['ssd', 'nvme', 'read intensive', 'ri'],
  'nic': ['network adapter', 'ethernet', 'ocp', 'networking'],
  'cpu': ['processor', 'xeon', 'epyc'],
  'disk': ['drive', 'hdd', 'ssd', 'storage']
};

function queryLocalKnowledgeBase(query, chassisName = '') {
  const citations = [];
  const rawMatches = [];

  const rawQueryStr = typeof query === 'string'
    ? query
    : (query?.query || query?.text || (typeof query === 'object' && query !== null ? JSON.stringify(query) : ''));
  const cleanQuery = (rawQueryStr || '').toLowerCase();
  const rawWords = cleanQuery.split(/[\s,;.!?'"()[\]{}]+/).filter(w => w.length > 0);
  const searchTerms = rawWords.filter(w => !STOP_WORDS.has(w) && w.length >= 2);

  let expandedSearchTerms = [...searchTerms];
  for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (cleanQuery.includes(key)) {
      expandedSearchTerms.push(...synonyms);
    }
  }

  const CHASSIS_NOISE_WORDS = new Set(['dl380', 'gen12', 'gen11', 'proliant', 'hpe', 'compute', 'server', 'sff', 'lff', 'edsff']);
  const specificTerms = expandedSearchTerms.filter(w => !CHASSIS_NOISE_WORDS.has(w));
  const activeTerms = specificTerms.length > 0 ? specificTerms : expandedSearchTerms;

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
      const normChassisTarget = (chassisName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      for (const rule of rules) {
        // INV-48: Strict Generation & Chassis Firewall
        if (normChassisTarget) {
          const ruleChassisNorm = (rule.chassis || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const isUniversal = rule.scope === 'UNIVERSAL_VENDOR';
          const isChassisMatch = ruleChassisNorm && (normChassisTarget.includes(ruleChassisNorm) || ruleChassisNorm.includes(normChassisTarget));
          const hasGen12Target = normChassisTarget.includes('gen12') || normChassisTarget.includes('g12');
          const hasGen11Target = normChassisTarget.includes('gen11') || normChassisTarget.includes('g11');
          const hasGen12Rule = ruleChassisNorm.includes('gen12') || ruleChassisNorm.includes('g12');
          const hasGen11Rule = ruleChassisNorm.includes('gen11') || ruleChassisNorm.includes('g11');

          if (!isUniversal) {
            if (hasGen12Target && hasGen11Rule) continue;
            if (hasGen11Target && hasGen12Rule) continue;
            if (!isChassisMatch) continue;
          }
        }

        const raw = (rule.rawMessage || '' ).toLowerCase();
        const update = (rule.ruleUpdate || '').toLowerCase();
        const affected = (rule.affectedSku || '').toLowerCase();

        let score = 0;
        if (activeTerms.length > 0) {
          activeTerms.forEach(term => {
             if (raw.includes(term) || update.includes(term) || affected.includes(term)) score += 1;
          });
        }

        if (score > 0) {
          rawMatches.push({
            score,
            text: `• [Knowledge Delta - ${rule.chassis}] ${rule.rawMessage || rule.ruleUpdate}`,
            citation: {
              title: `Master Knowledge Registry (${rule.deltaId})`,
              snippet: rule.rawMessage || rule.ruleUpdate,
              url: `/artifacts/history/master_knowledge_registry.json`
            }
          });
        }
      }
    } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'local_rag_search.js', e); }
  }

  // 2. Search Catalogs dynamically across outputs directory
  const { listAllCatalogs } = require('../catalog/catalog_discovery.js');
  const catalogPaths = listAllCatalogs().map(c => c.catalogDir);

  const matchedProcessorSkus = [];

  let filteredCatalogPaths = catalogPaths;
  if (chassisName) {
    const normChassis = chassisName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasGen12Target = normChassis.includes('gen12') || normChassis.includes('g12');
    const hasGen11Target = normChassis.includes('gen11') || normChassis.includes('g11');

    filteredCatalogPaths = catalogPaths.filter(cDir => {
      const folderName = path.basename(cDir);
      const normFolder = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const hasGen12Folder = normFolder.includes('gen12') || normFolder.includes('g12');
      const hasGen11Folder = normFolder.includes('gen11') || normFolder.includes('g11');

      // INV-48: Never match across generations
      if (hasGen12Target && !hasGen12Folder) return false;
      if (hasGen11Target && !hasGen11Folder) return false;

      return normChassis.includes(normFolder) || normFolder.includes(normChassis) || normChassis.includes(normFolder.replace('sff', ''));
    });
    // INV-48: Strict isolation — zero cross-catalog fallback when a specific chassis is requested
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
              const skuPn = s.sku || s['Product #'] || s['SKU'] || '';
              const desc = s.description || s['Description'] || '';
              const price = s.listPriceFormatted || (s['Unit Price (USD)'] ? `$${s['Unit Price (USD)']}` : (s.listPrice ? `$${s.listPrice}` : '$0.00'));
              const descLower = desc.toLowerCase();

              const coresInSkuMatch = descLower.match(/(\d+)\s*-?\s*core/);
              const coresInSku = coresInSkuMatch ? parseInt(coresInSkuMatch[1], 10) : null;
              const isActualCpu = descLower.includes('processor') || descLower.includes('xeon') || descLower.includes('epyc') || coresInSku !== null;

              if (isActualCpu) {
                if (minCores !== null) {
                  if (coresInSku !== null && coresInSku >= minCores) {
                    matchedProcessorSkus.push({
                      chassis: folderName,
                      sku: skuPn,
                      description: desc,
                      cores: coresInSku,
                      price,
                      catalogPath: catalogJson
                    });
                  }
                } else if (searchTerms.length === 0 || searchTerms.some(term => descLower.includes(term))) {
                  matchedProcessorSkus.push({
                    chassis: folderName,
                    sku: skuPn,
                    description: desc,
                    cores: coresInSku,
                    price,
                    catalogPath: catalogJson
                  });
                }
              }
            }
          } else if (!isProcessorQuery && activeTerms.length > 0) {
            const isCatMatch = activeTerms.some(term => catStr.includes(term));
            
            // Search inside the SKUs as well
            let matchedSkusInCat = [];
            for (const s of (entry.skus || [])) {
               const skuPn = s.sku || s['Product #'] || s['SKU'] || '';
               const desc = s.description || s['Description'] || '';
               const sLower = skuPn.toLowerCase();
               const descLower = desc.toLowerCase();
               if (activeTerms.some(term => {
                 if (term.length <= 2) {
                   return new RegExp(`\\b${term}\\b`, 'i').test(descLower) || new RegExp(`\\b${term}\\b`, 'i').test(sLower);
                 }
                 return sLower.includes(term) || descLower.includes(term);
               })) {
                  matchedSkusInCat.push(s);
               }
            }

            let catScore = isCatMatch ? 1 : 0;
            if (activeTerms.length > 0) {
               activeTerms.forEach(term => {
                  if (term.length <= 2) {
                    try {
                      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      if (new RegExp(`\\b${escapedTerm}\\b`, 'i').test(catStr)) catScore += 2;
                    } catch (_) {
                      if (catStr.includes(term)) catScore += 1;
                    }
                  } else if (catStr.includes(term)) {
                    catScore += 2;
                  }
               });
            }

            if (catScore > 0 || matchedSkusInCat.length > 0) {
              const finalScore = catScore + (matchedSkusInCat.length * 3);
              const skusToDisplay = matchedSkusInCat.length > 0 ? matchedSkusInCat : (entry.skus || []);
              const skuList = skusToDisplay.slice(0, 4).map(s => {
                const skuPn = s.sku || s['Product #'] || s['SKU'] || '';
                const desc = s.description || s['Description'] || '';
                const price = s.listPriceFormatted || (s['Unit Price (USD)'] ? `$${s['Unit Price (USD)']}` : (s.listPrice ? `$${s.listPrice}` : '$0.00'));
                return `${skuPn} (${desc}) - ${price}`;
              }).join('; ');
              if (skuList) {
                rawMatches.push({
                  score: finalScore,
                  text: `• [${folderName} Hardware SKUs] ${entry.parentCategory} > ${entry.subCategory}: ${skuList}`,
                  citation: {
                    title: `${folderName} ${entry.subCategory} SKUs`,
                    snippet: skuList,
                    url: `/artifacts/${path.relative(OUTPUTS_DIR, catalogJson)}`
                  }
                });
              }
            }
          }
        }
        
        // Search base variants
        const baseVariants = catData.chassisVariants || catData.chassisBaseVariants || catData.baseVariants || [];
        const isChassisQuery = cleanQuery.includes('chassis') || cleanQuery.includes('variant') || cleanQuery.includes('base') || cleanQuery.includes('cto');
        
        for (const variant of baseVariants) {
          const skuLower = (variant.sku || variant['Product #'] || '').toLowerCase();
          const descLower = (variant.description || variant['Description'] || variant.desc || '').toLowerCase();

          let varScore = 0;
          if (isChassisQuery) varScore += 1;
          activeTerms.forEach(term => {
             if (skuLower.includes(term) || descLower.includes(term)) varScore += 1;
          });

          if (varScore > 0) {
            const skuPn = variant.sku || variant['Product #'] || '';
            const desc = variant.description || variant['Description'] || variant.desc || '';
            const priceStr = variant.listPriceFormatted || (variant['Unit Price (USD)'] ? `$${variant['Unit Price (USD)']}` : (variant.listPrice ? `$${variant.listPrice}` : '$0.00'));
            rawMatches.push({
              score: varScore,
              text: `• [${folderName} Base Chassis CTO Variant] ${skuPn}: ${desc} — ${priceStr}`,
              citation: {
                title: `${folderName} Base Chassis CTO (${skuPn})`,
                snippet: `${skuPn}: ${desc} (${priceStr})`,
                url: `/artifacts/${path.relative(OUTPUTS_DIR, catalogJson)}`
              }
            });
          }
        }
      } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'local_rag_search.js', e); }
    }

    // Search Rules JSON/CSV
    const rulesJson = path.join(cDir, `${folderName}_Catalog_Rules.json`);

    if (fs.existsSync(rulesJson) && !isProcessorQuery) {
      try {
        const rulesData = JSON.parse(fs.readFileSync(rulesJson, 'utf-8'));
        const rulesArray = Array.isArray(rulesData) ? rulesData : (rulesData.rules || rulesData.entries || []);

        for (const rule of rulesArray) {
          const mainCat = rule.category || rule.parentCategory || '';
          const subCat = rule.subCategory || '';
          const constraint = rule.constraint || rule.ruleType || '';
          const ruleText = rule.description || rule.rule || rule.ruleText || JSON.stringify(rule);

          const ruleStringLower = `${mainCat} ${subCat} ${constraint} ${ruleText}`.toLowerCase();

          let ruleScore = 0;
          if (activeTerms.length > 0) {
             activeTerms.forEach(term => {
                if (ruleStringLower.includes(term)) ruleScore += 2;
             });
          }

          const isRuleQuery = cleanQuery.includes('rule') || cleanQuery.includes('constraint') || cleanQuery.includes('require') || cleanQuery.includes('compatibility');
          if (ruleScore > 0 && isRuleQuery) {
            ruleScore += 10;
          }

          if (ruleScore > 0) {
            rawMatches.push({
              score: ruleScore,
              text: `• [${folderName} Catalog Rule] Category: ${mainCat} > ${subCat} | Constraint: ${constraint} (${ruleText})`,
              citation: {
                title: `${folderName} Catalog Rules`,
                snippet: `${mainCat} > ${subCat}: ${ruleText}`,
                url: `/artifacts/${path.relative(OUTPUTS_DIR, rulesJson)}`
              }
            });
          }
        }
      } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'local_rag_search.js processing rules.json', e); }
    } else if (fs.existsSync(rulesCsv) && !isProcessorQuery) {
      const csvLines = fs.readFileSync(rulesCsv, 'utf-8').split(/\r?\n/);
      for (let i = 1; i < csvLines.length; i++) {
        const line = csvLines[i];
        if (!line) continue;
        const lineLower = line.toLowerCase();

        let ruleScore = 0;
        if (activeTerms.length > 0) {
           activeTerms.forEach(term => {
              if (lineLower.includes(term)) ruleScore += 2;
           });
        }

        const isRuleQuery = cleanQuery.includes('rule') || cleanQuery.includes('constraint') || cleanQuery.includes('require') || cleanQuery.includes('compatibility');
        if (ruleScore > 0 && isRuleQuery) {
          ruleScore += 10;
        }

        if (ruleScore > 0) {
          const parts = line.split(',');
          const mainCat = parts[0] || '';
          const subCat = parts[1] || '';
          const constraint = parts[2] || '';
          const ruleText = parts[4] || line;

          rawMatches.push({
            score: ruleScore,
            text: `• [${folderName} Catalog Rule] Category: ${mainCat} > ${subCat} | Constraint: ${constraint} (${ruleText})`,
            citation: {
              title: `${folderName} Catalog Rules`,
              snippet: `${mainCat} > ${subCat}: ${ruleText}`,
              url: `/artifacts/${path.relative(OUTPUTS_DIR, rulesCsv)}`
            }
          });
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

    rawMatches.push({
      score: matchedProcessorSkus.length * 2,
      text: `${heading}\n\n${procLines.join('\n')}`,
      isProcMatch: true
    });
  }

  // Rank matches by score (descending)
  rawMatches.sort((a, b) => b.score - a.score);

  // Take top 15 matches to avoid context overload
  const topKMatches = rawMatches.slice(0, 15);

  const matches = [];
  topKMatches.forEach(rm => {
     matches.push(rm.text);
     if (rm.citation) citations.push(rm.citation);
  });

  let maxScore = topKMatches.length > 0 ? topKMatches[0].score : 0;
  let confidenceScore = maxScore > 0 ? Math.min(0.95, (maxScore / 10) + 0.5) : 0.0;

  if (topKMatches.some(m => m.isProcMatch)) {
      // Put processor text at the top
      const procMatchIndex = matches.findIndex(m => m.includes('Matching Processor SKUs') || m.includes('Processors with'));
      if (procMatchIndex > 0) {
         const pMatch = matches.splice(procMatchIndex, 1)[0];
         matches.unshift(pMatch);
      }
      confidenceScore = 0.95;
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
    confidenceScore: confidenceScore,
    source: 'LOCAL_CATALOG_RAG'
  };
}

async function queryLocalKnowledgeBaseAsync(query, chassisName = '', notebookId = '') {
  let resolvedChassis = chassisName;
  if (!resolvedChassis && notebookId) {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'notebooks.json'), 'utf-8'));
      if (config.notebooks) {
        for (const [chassis, nid] of Object.entries(config.notebooks)) {
          if (nid === notebookId) {
            resolvedChassis = chassis;
            break;
          }
        }
      }
    } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'local_rag_search.js', e); }
  }
  const localRes = queryLocalKnowledgeBase(query, resolvedChassis);

  const geminiRotator = require('../system/gemini_rotator.js');
  const activeKeyInfo = geminiRotator.getActiveKey();
  if (!activeKeyInfo || !activeKeyInfo.apiKey) {
    return localRes;
  }

  try {
    const prompt = `You are the official Gemini NotebookLM RAG Assistant for HPE Solution Configurator (Notebook ID: ${notebookId || 'Mapped Notebook'}).
User Query: "${query}"

Grounded Context & Ingested Notebook Data:
${localRes.answer}

Instructions:
1. Answer the query thoroughly, directly, and accurately using the grounded notebook and catalog data above.
2. Maintain clean markdown formatting with bolding for SKUs, bullet points, core counts, and prices.
3. Keep the citations accurate and professional.`;

    const response = await geminiRotator.executeWithSmartRotation(async ({ ai }) => {
      return await ai.models.generateContent({
        model: process.env.GEMINI_MODEL_NAME || 'gemini-3.6-flash',
        contents: prompt
      });
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
