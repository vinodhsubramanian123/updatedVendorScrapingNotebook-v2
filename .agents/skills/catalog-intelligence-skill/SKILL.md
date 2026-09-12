---
name: catalog-intelligence-skill
description: Use this skill to explore catalog pricing history, price trends, SKU lifecycle state changes (Obsolete, Direct Ship, 90-Day Warning, EOL), and newly added hardware options across product generations.
---

# Catalog Intelligence, Price Trails & Lifecycle State Skill (`catalog-intelligence-skill`)

This skill guides the agent in querying, analyzing, and explaining catalog updates, pricing drift, obsolescence notifications, and generational option differences across HPE ProLiant, Synergy, Alletra, StoreEver, and Cray platforms.

---

## 📈 Price Trails & Anomaly Detection

### 1. Certified Price History & Trail Deduplication (`INV-1`, `INV-33`)
- Historical prices are stored in `outputs/{Family}/{Gen}/{Model}/history/price_history.json`.
- Each SKU maintains a timestamped trail of price observations:
  - `BASELINE`: First scraped Global List Price (GPL).
  - `UNCHANGED`: Confirmed identical price on subsequent scrape date.
  - `PRICE_CHANGED`: Price increased or decreased.
  - `ANOMALY`: Isolated $\ge 10\times$ spikes quarantined to protect baseline integrity.
- **Deduplication Invariant (`INV-1`)**: Same-day reruns deduplicate by `date` only using a priority table; ghost duplicate entries are forbidden.

### 2. Resolving SKU Prices
- Always query prices via `getHistoricalSkuPrice(sku, targetDir)` from [`scripts/lib/catalog/sku_versioning.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/catalog/sku_versioning.js).
- Never use hardcoded price dictionaries or fabricated mock numbers (`INV-33`).
- If a price is unavailable, flag as `(INCOMPLETE — N SKU(s) unresolved)` rather than fabricating a $0.00 total.

---

## 🛑 Lifecycle Status & Obsolete SKU Management

### 1. Delimited Lifecycle Badges (`INV-21`, `INV-62`)
- SKUs carry structured lifecycle indicators:
  - `OB`: Obsolete — component discontinued and no longer orderable.
  - `DS`: Direct Ship / Discontinued — limited factory fulfillment only.
  - `90`: 90-Day Warning — impending retirement within one fiscal quarter.
  - `EOL`: End of Life — platform or option fully retired.
- Delimiters prevent false positives: SKUs starting with "90" (e.g. `900000-B21`) are never misclassified as 90-day warnings.

### 2. Discontinued SKU Registry
- Discontinued parts are archived into `outputs/{Family}/{Gen}/{Model}/history/discontinued_skus.json`.
- The catalog diff engine (`diff_catalog.js`) reconciles hardware and services before declaring a SKU removed (`CATEGORY_MIGRATED`).

---

## 🔄 Multi-Generation Component Mapping (Gen11 $\longleftrightarrow$ Gen12)

When migrating customer infrastructure from DL380 Gen11 to DL380 Gen12:

| Component Role | DL380 Gen11 (Intel 4th/5th Gen) | DL380 Gen12 (Intel 5th/6th Gen) | Architectural Note |
| :--- | :--- | :--- | :--- |
| **2nd CPU Heatsink** | `P74792-B21` | `P48818-B21` | Gen-specific heatsink mounting (`INV-61`) |
| **High-Perf Fan Kit**| `P48820-B21` | `P48820-B21` | Cross-generation fan form-factor |
| **Tri-Mode Controller**| `MR416i-p Gen11` (`P47777-B21`) | `MR416i-p Gen11` (`P47777-B21`) | PCIe Gen4 x16 controller |
| **Controller Cable** | `P56073-B21` / `P56074-B21` | `P76453-B21` / `P48832-B21` | Gen12 backplane cabling revision |
| **Memory DIMMs** | DDR5-4800 / DDR5-5600 | DDR5-5600 / DDR5-6400 | Gen12 supports higher transfer MT/s |
| **Power Supplies** | 800W / 1600W Flex Slot | 1000W / 1800W / 2200W Titanium | Higher TDP headroom for 350W CPUs |

---

## 💻 CLI Tools & Verification Queries

```bash
# Query historical price of a SKU
node -e "
  const { getHistoricalSkuPrice } = require('./scripts/lib/catalog/sku_versioning.js');
  console.log(getHistoricalSkuPrice('P73299-B21', 'outputs/ProLiant/Gen12/DL380_Gen12'));
"

# Run catalog diff against previous snapshot to view additions & price changes
node scripts/catalogs/diff_catalog.js outputs/ProLiant/Gen12/DL380_Gen12

# Sync Master Scraped Catalog Registry
npm run registry:sync
```
