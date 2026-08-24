'use strict';
/**
 * scripts/lib/schemas.js — Canonical Zod Schemas & Runtime Data Contracts
 *
 * Implements strict runtime validation and automatic repair/coercion for:
 * 1. Catalog Master Schema ({Model}_Catalog.json)
 * 2. BOQ Input & Parsed Items
 * 3. 6-Aspect Physical Math Results
 * 4. Conflict Graph & 5-Tier Strategy Resolution Matrix
 * 5. Master Knowledge Delta Schema
 */

const { z } = require('zod');

// ==========================================
// 1. Centralized Helper Validators
// ==========================================

const HpeSkuRegex = /^[A-Z0-9]{6,7}-B21$/i;
const SkuString = z.string().trim().min(1, 'SKU cannot be empty');
const CoercedNumber = z.union([z.number(), z.string()]).transform((val, ctx) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/[\$,\s]/g, '').trim().toUpperCase();
  if (!clean || clean === 'N/A' || clean === 'NA' || clean === '-' || clean === 'NONE' || clean === 'NULL') {
    return 0;
  }
  const num = Number(clean);
  if (isNaN(num)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid number: ${val}`
    });
    return 0;
  }
  return num;
});

// ==========================================
// 2. Catalog Master Schema
// ==========================================

const CatalogSkuItemSchema = z.object({
  sku: z.string().optional(),
  'Product #': z.string().optional(),
  Description: z.string().default(''),
  description: z.string().optional(),
  'Option Type': z.enum(['Standard', 'CTO', 'BTO', 'FIO', 'Service', 'Optional', '']).default('Standard'),
  'Current Qty': z.union([z.string(), z.number()]).default('1').transform(v => String(v)),
  'Unit Price (USD)': CoercedNumber.default(0),
  'Price (USD)': CoercedNumber.optional(),
  'Diff Status': z.enum(['UNCHANGED', 'ADDED', 'REMOVED', 'PRICE_CHANGED', 'ATTRIBUTE_CHANGED', 'REINSTATED', 'PRICE_AND_ATTRIBUTE_CHANGED', 'BASELINE']).default('UNCHANGED'),
  'Hierarchy Path': z.string().optional(),
  'Component Role': z.string().optional(),
  'Start Date': z.string().optional(),
  'Discontinued Date': z.string().optional(),
  'Price History Trail': z.string().optional()
}).passthrough().transform(data => {
  const resolvedSku = data.sku || data['Product #'] || '';
  return {
    ...data,
    sku: resolvedSku,
    'Product #': data['Product #'] || resolvedSku
  };
});

const CatalogEntrySchema = z.object({
  parentCategory: z.string().default('Uncategorized'),
  subCategory: z.string().default('General'),
  constraint: z.string().default(''),
  maxQty: z.union([z.number(), z.string()]).transform(v => {
    const num = Number(v);
    return isNaN(num) ? -1 : num;
  }).default(-1),
  rules: z.array(z.string()).default([]),
  headers: z.array(z.string()).default([]),
  skus: z.array(CatalogSkuItemSchema).default([])
});

const CatalogMetadataSchema = z.object({
  productFamily: z.string().default('ProLiant'),
  generation: z.string().default('Gen12'),
  model: z.string().default(''),
  chassis: z.string().optional(),
  chassisDir: z.string().default(''),
  scrapedAt: z.string().default(() => new Date().toISOString()),
  scrapeDate: z.string().optional(),
  totalUniqueSKUs: z.number().default(0),
  categoriesCount: z.number().default(0),
  diffSummary: z.object({
    unchanged: z.number().default(0),
    added: z.number().default(0),
    removed: z.number().default(0),
    priceChanged: z.number().default(0),
    attributeChanged: z.number().default(0),
    reinstated: z.number().default(0)
  }).default({})
}).passthrough();

const CatalogMasterSchema = z.object({
  metadata: CatalogMetadataSchema,
  entries: z.array(CatalogEntrySchema).default([])
});

// ==========================================
// 3. BOQ Item & Input Schemas
// ==========================================

const BOQItemSchema = z.object({
  sku: SkuString,
  description: z.string().default(''),
  quantity: z.union([z.number(), z.string()]).transform(v => Math.max(0, parseInt(String(v), 10) || 0)).default(1),
  unitPriceUsd: CoercedNumber.default(0),
  category: z.string().default('General'),
  componentRole: z.string().default('Other'),
  isFixInjected: z.boolean().default(false),
  reasoning: z.string().optional()
});

const BOQInputSchema = z.object({
  rawInput: z.string().optional(),
  fileName: z.string().optional(),
  items: z.array(BOQItemSchema).min(1, 'BOQ must contain at least 1 line item')
});

// ==========================================
// 4. Aspect Math Result Schemas
// ==========================================

const ThermalAspectSchema = z.object({
  status: z.enum(['PASS', 'WARN', 'FAIL']).default('PASS'),
  maxTdpW: z.number().default(0),
  heatsinkType: z.string().default('Standard'),
  fanKitSku: z.string().optional(),
  isHighPerfFanRequired: z.boolean().default(false),
  violations: z.array(z.string()).default([])
}).passthrough();

const PowerAspectSchema = z.object({
  status: z.enum(['PASS', 'WARN', 'FAIL']).default('PASS'),
  requiredWatts: z.number().default(0),
  suppliedWatts: z.number().default(0),
  redundancy: z.string().default('N+1'),
  dcLugKitRequired: z.boolean().default(false),
  dcLugSku: z.string().optional(),
  violations: z.array(z.string()).default([])
}).passthrough();

const MemoryAspectSchema = z.object({
  status: z.enum(['PASS', 'WARN', 'FAIL']).default('PASS'),
  totalDimms: z.number().default(0),
  channelsPerCpu: z.number().default(8),
  symmetry: z.string().default('Balanced'),
  totalMemoryGb: z.number().default(0),
  violations: z.array(z.string()).default([])
}).passthrough();

const PcieAspectSchema = z.object({
  status: z.enum(['PASS', 'WARN', 'FAIL']).default('PASS'),
  lanesRequired: z.number().default(0),
  lanesAvailable: z.number().default(0),
  riserRequired: z.boolean().default(false),
  violations: z.array(z.string()).default([])
}).passthrough();

const StorageAspectSchema = z.object({
  status: z.enum(['PASS', 'WARN', 'FAIL']).default('PASS'),
  controller: z.string().optional(),
  batteryRequired: z.boolean().default(false),
  batterySku: z.string().optional(),
  driveCount: z.number().default(0),
  violations: z.array(z.string()).default([])
}).passthrough();

const NetworkAspectSchema = z.object({
  status: z.enum(['PASS', 'WARN', 'FAIL']).default('PASS'),
  adapter: z.string().optional(),
  ocpOccupied: z.boolean().default(false),
  violations: z.array(z.string()).default([])
}).passthrough();

const AspectMathSchema = z.object({
  thermal: ThermalAspectSchema.default({}),
  power: PowerAspectSchema.default({}),
  memory: MemoryAspectSchema.default({}),
  pcie: PcieAspectSchema.default({}),
  storage: StorageAspectSchema.default({}),
  network: NetworkAspectSchema.default({})
});

// ==========================================
// 5. Conflict Graph & 5-Tier Strategy Matrix
// ==========================================

const RankedSolutionSchema = z.object({
  rank: z.number().int().min(1).max(5),
  name: z.string().min(1),
  score: z.number().min(0).max(1).default(1.0),
  estimatedCostUsd: CoercedNumber.default(0),
  budgetBreakdown: z.object({
    baseBomCost: CoercedNumber.default(0),
    fixCost: CoercedNumber.default(0),
    strategyAddonCost: CoercedNumber.default(0),
    totalBudgetUsd: CoercedNumber.default(0)
  }).default({}),
  skuPartsList: z.array(BOQItemSchema).default([]),
  tradeoffMetrics: z.object({
    intentAlignment: z.string().default('100%'),
    costDeltaUsd: z.string().default('$0'),
    capacityExpansion: z.string().default('Optimal')
  }).default({}),
  ragSecondOpinion: z.string().default('✅ Verified'),
  reasoning: z.string().default('')
});

const ConflictGraphSchema = z.object({
  unresolvedConflictsCount: z.number().default(0),
  resolvedFixes: z.array(z.object({
    sku: SkuString,
    reasoning: z.string().default('')
  })).default([]),
  rankedSolutions: z.array(RankedSolutionSchema).default([])
});

const BOQEvaluationResultSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'WARN']).default('PASS'),
  confidenceScore: z.number().min(0).max(1).default(1.0),
  boqName: z.string().default('Customer_BOQ'),
  chassisInfo: z.object({
    family: z.string().default('ProLiant'),
    gen: z.string().default('Gen12'),
    model: z.string().default(''),
    formFactor: z.string().default('SFF'),
    baseSku: z.string().optional(),
    chassisDir: z.string().default('')
  }).default({}),
  aspectMath: AspectMathSchema.default({}),
  workloadDna: z.object({
    primaryWorkload: z.string().default('General Purpose Compute'),
    computeTier: z.string().default('Standard'),
    memoryRatioGBPerCore: z.number().default(8.0),
    storageIopsTier: z.string().default('Standard IOPS')
  }).default({}),
  missingDependencies: z.array(z.object({
    key: z.string(),
    sku: SkuString,
    quantity: z.number().default(1),
    unitPriceUsd: CoercedNumber.default(0),
    reasoning: z.string().default('')
  })).default([]),
  conflictGraph: ConflictGraphSchema.default({})
});

// ==========================================
// 6. Master Knowledge Delta Schema
// ==========================================

const KnowledgeDeltaSchema = z.object({
  deltaId: z.string().default(() => `DELTA-${Date.now()}`),
  chassis: z.string().min(1, 'Chassis identifier is required'),
  affectedSku: SkuString,
  requiredDependencySku: SkuString,
  scope: z.enum(['UNIVERSAL_VENDOR', 'FAMILY_GEN', 'CHASSIS_SPECIFIC']).default('FAMILY_GEN'),
  scopeTaxonomy: z.enum(['UNIVERSAL_VENDOR_RULES', 'FAMILY_GEN_RULES', 'CHASSIS_SPECIFIC_RULES']).default('FAMILY_GEN_RULES'),
  errorType: z.string().default('MISSING_MANDATORY_DEPENDENCY'),
  ruleUpdate: z.string().min(1, 'Rule description is required'),
  humanReasoning: z.string().default(''),
  confidence: z.number().min(0).max(1).default(1.0),
  timestamp: z.string().default(() => new Date().toISOString())
});

// ==========================================
// 7. Safe Runtime Parsers with Error Recovery
// ==========================================

function safeParseCatalog(data) {
  const result = CatalogMasterSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error.format() };
}

function safeParseBOQ(data) {
  const result = BOQInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error.format() };
}

function safeParseEvalResult(data) {
  const result = BOQEvaluationResultSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error.format() };
}

function safeParseKnowledgeDelta(data) {
  const result = KnowledgeDeltaSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error.format() };
}

module.exports = {
  // Regex & Primitives
  HpeSkuRegex,
  CoercedNumber,
  
  // Zod Schemas
  CatalogSkuItemSchema,
  CatalogEntrySchema,
  CatalogMetadataSchema,
  CatalogMasterSchema,
  BOQItemSchema,
  BOQInputSchema,
  ThermalAspectSchema,
  PowerAspectSchema,
  MemoryAspectSchema,
  PcieAspectSchema,
  StorageAspectSchema,
  NetworkAspectSchema,
  AspectMathSchema,
  RankedSolutionSchema,
  ConflictGraphSchema,
  BOQEvaluationResultSchema,
  KnowledgeDeltaSchema,

  // Runtime Validation Helpers
  safeParseCatalog,
  safeParseBOQ,
  safeParseEvalResult,
  safeParseKnowledgeDelta
};
