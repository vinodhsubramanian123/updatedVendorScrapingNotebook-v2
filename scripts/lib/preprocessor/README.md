# Preprocessor Subsystem

CTO (Configure-to-Order) input normalization and variation analysis layer. This subsystem sits between raw BOQ parsing and the evaluation engine, transforming heterogeneous customer inputs into canonical forms.

## Modules

| Module | Purpose |
|--------|---------|
| `cto_normalizer.js` | Normalizes CTO part numbers, variant suffixes, and multi-chassis configuration strings into canonical SKU identifiers for downstream matching |
| `variation_clusterer.js` | Groups related CTO variants by base SKU family, detects duplicate/near-duplicate line items, and merges quantity rolls across split entries |
| `feedback_persister.js` | Persists HITL feedback annotations back into the preprocessor's normalization cache, enabling learning from user corrections across sessions |

## Usage

```js
const { preprocessor } = require('../lib');
const normalized = preprocessor.ctoNormalizer.normalize(rawSkuString);
const clusters = preprocessor.variationClusterer.cluster(lineItems);
```

## Dependencies

- **Upstream**: `scripts/lib/boq/boq_parser.js` (raw parsed line items)
- **Downstream**: `scripts/lib/boq/boq_evaluator.js` (normalized items for evaluation)
- **Feedback**: `scripts/lib/feedback/feedback_loop.js` (correction signals)
