'use strict';
/**
 * scripts/config/reasoning_workflow_learnings.js
 *
 * Engineering & workflow advisories for Closed-Loop Counterfactual Correction,
 * Epistemic Tier Integrity, and Append-Only Knowledge Retraction (INV-231).
 *
 * These rules represent verified epistemic and architectural practices;
 * they are NOT ungrounded hardware compatibility claims.
 */

module.exports = [
  {
    deltaId: 'LEARN_REASONING_COUNTERFACTUAL_HYPOTHESIS_SEMANTICS_20261108',
    ruleType: 'WORKFLOW_HYPOTHESIS_SEMANTICS_ADVISORY',
    rawMessage: 'Hardware repair proposals generated during counterfactual repair are unvalidated delta hypotheses (PROPOSED_UNVALIDATED), never certifications of 100% buildability prior to whole-candidate re-evaluation across physical, topological, customer-intent, and vendor portal acceptance gates (INV-231).'
  },
  {
    deltaId: 'LEARN_REASONING_ARITHMETIC_PREDICATE_INFEASIBILITY_20261108',
    ruleType: 'WORKFLOW_PREDICATE_INFEASIBILITY_ADVISORY',
    rawMessage: 'When physical demand exceeds available catalog capacity (e.g. required wattage exceeds maximum rated PSU candidate, or socket TDP exceeds available heatsink rating), the engine must emit REPAIR_INFEASIBLE with remaining deficits quantitatively disclosed, rather than fabricating out-of-catalog hardware quantities or assuming unevidenced vendor support (INV-231).'
  },
  {
    deltaId: 'LEARN_REASONING_EXACT_CATALOG_SCOPED_DISCOVERY_20261108',
    ruleType: 'WORKFLOW_CATALOG_SCOPED_DISCOVERY_ADVISORY',
    rawMessage: 'Repair discovery must select options exclusively from the verified target product catalog snapshot. Input electrical conditions (AC vs -48VDC) and customer SLA/duration requirements must be preserved, defaulting to product-qualified 3-year Basic support only when customer requirements leave support unspecified (INV-231).'
  },
  {
    deltaId: 'LEARN_REASONING_EVIDENCE_VS_HARDWARE_DECOUPLING_20261108',
    ruleType: 'WORKFLOW_EVIDENCE_DECOUPLING_ADVISORY',
    rawMessage: 'Acceptance blockers regarding evidence deficits (missing document grounding, citations, or portal session receipts) must evaluate to ACTION_REQUIRED_EVIDENCE_PROBE with zero hardware deltas, and must never invent fake hardware SKUs or convert evidence failures into hardware additions (INV-231).'
  },
  {
    deltaId: 'LEARN_REASONING_CRYPTOGRAPHIC_TIER3_RECEIPT_VERIFICATION_20261108',
    ruleType: 'WORKFLOW_TIER3_RECEIPT_VERIFICATION_ADVISORY',
    rawMessage: 'Tier 3 Official Vendor Acceptance strictly requires an authentic cryptographic session receipt re-verified from disk matching the exact candidate manifest, scope, and fresh timestamp (<24h). Truthy boolean flags or bare IDs evaluate to Tier 0 or Tier 1 (INV-201, Gate B19, INV-231).'
  },
  {
    deltaId: 'LEARN_REASONING_APPEND_ONLY_KNOWLEDGE_RETRACTION_20261108',
    ruleType: 'WORKFLOW_APPEND_ONLY_RETRACTION_ADVISORY',
    rawMessage: 'Falsified, erroneous, or superseded learned rules must be deactivated across all registry arrays (chassis deltas, wrapped rules, master registries) with an append-only decision audit trail (active: false, decision: RETRACTED or SUPERSEDED) without deleting historical evidence records (INV-231).'
  }
];
