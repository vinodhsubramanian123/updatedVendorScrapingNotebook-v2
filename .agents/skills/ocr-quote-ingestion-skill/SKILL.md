---
name: ocr-quote-ingestion-skill
description: Use this skill to ingest and parse unstructured or image-based customer quotes, scanned PDF tenders, configuration screenshots, or image files (PNG, JPG, JPEG, WEBP, TIFF, GIF) up to 25MB. Leverages Gemini Vision Multimodal OCR with smart FIFO key rotation to extract structured tables containing part numbers, descriptions, quantities, and prices.
---

# Unstructured Document OCR & Scanned Quote Ingestion Skill (`ocr-quote-ingestion-skill`)

**Purpose**: Customer quotes and tenders frequently arrive in non-digital formats: scanned PDFs, mobile photos of physical printouts, screenshots of vendor partner portals, or flattened image tables where standard text extractors fail completely. This skill provides an autonomous multimodal optical character recognition (OCR) pathway to ingest image documents up to 25MB, extract clean tabular SKU lines, normalize part numbers, and pipe them directly into the BOQ evaluation engine.

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill whenever the customer inquiry includes:
1. **Image File Attachments**: Files ending in `.png`, `.jpg`, `.jpeg`, `.webp`, `.tiff`, `.gif`, or `.bmp`.
2. **Scanned / Rasterized PDF Quotes**: PDF documents where `pdftotext` or standard text extraction returns empty strings or garbled characters due to rasterization.
3. **Portal Screenshots**: Screenshots of HPE OCA, Cisco CCW, Dell Solutions Configurator, or tender tables pasted by the user.
4. **Obfuscated / Degraded Document Tables**: Scanned tenders with skewed rows, phone camera watermarks, or fax headers.

---

## 📍 Where This Fits in the Presales Process

- **Execution Phase**: **Phase 0 (Intake & Pre-Processing)**.
- **Upstream Trigger**: User supplies an image or scanned document file.
- **Downstream Handoff**: Converts visual document into a normalized tabular array of `{ sku, description, quantity, unitPriceUsd }` and hands off to [`presales-query-router`](../presales-query-router/SKILL.md) or [`boq-eval-skill`](../boq-eval-skill/SKILL.md).

---

## ⚙️ Core Multimodal Vision Pipeline (`ocr_service.js`)

The OCR engine operates through 4 robust stages:

### 1. File Validation & Size Enforcement
- Enforces strict 25MB maximum payload limit (`MAX_IMAGE_SIZE_BYTES`).
- Validates mime-types (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`).

### 2. Multimodal Gemini Vision Prompting & FIFO Key Rotation
- Dispatches image payload to Gemini Vision (`gemini-3.6-flash` or `gemini-3.7-flash`).
- Managed by `gemini_rotator.js`: if active API key hits rate limits (429 / RESOURCE_EXHAUSTED), the request automatically demotes the key to the bottom of the queue and rotates to the next active key seamlessly.
- Uses specialized OCR system prompt instructing the vision model to:
  - Isolate tabular boundaries.
  - Separate SKU column from Description column.
  - Parse lifecycle status tags (`OB`, `DS`, `90`) into separate metadata fields.
  - Return clean JSON array or standardized TSV rows.

### 3. SKU Regex Sanitization & Cleaning
- Raw OCR text passes through `cleanBaseSKU()` and `isValidHpeSKU()` to fix typical OCR character confusions:
  - `O` (letter O) vs `0` (zero)
  - `I` (capital i) vs `1` (one)
  - Strips leading/trailing punctuation or bracketed prefixes.

### 4. Direct Handoff into BOQ Evaluator
- Emits temporary `.csv` or `.xlsx` file into `outputs/temp/ocr_extracted_{timestamp}.csv` or directly returns `items` array for in-memory evaluation.

---

## 💻 CLI Commands & Direct Execution

### 1. Ingest & Extract Tabular SKUs from an Image or Scanned PDF
```bash
node -e "
const { performGeminiOcr } = require('./scripts/lib/ocr/ocr_service.js');
async function run() {
  const result = await performGeminiOcr('path/to/scanned_quote.png');
  console.log('Detected SKUs:', result.detectedSkus);
  console.log('Extracted Line Count:', result.lineCount);
  console.log('OCR Output:\n', result.text.slice(0, 500));
}
run();
"
```

### 2. End-to-End Evaluation of a Scanned Quote File
```bash
# Directly routes scanned quote through evaluation engine
npm run eval:boq -- path/to/scanned_quote.pdf --json
```

---

## 📋 Standardized Output Contract (What to Report)

When completing an OCR quote ingestion, the agent MUST present:
1. **OCR Ingestion Badge**:
   `[📸 Gemini Vision Multimodal OCR: Extracted N Line Items from <filename>]`
2. **Detected Base Chassis & Key Components**:
   - Primary Chassis Model identified (e.g., `DL380 Gen12 8SFF`)
   - CPU Sockets & Model (e.g., `2x Intel Xeon 6730P`)
   - Total Memory Capacity (e.g., `16x 64GB = 1024GB RAM`)
   - Controller & Drives (e.g., `1x MR416i-p, 8x 3.84TB NVMe SSDs`)
3. **OCR Quality Assessment**:
   - Confidence score of text extraction (e.g., `98.5% confidence`)
   - Any blurred or ambiguous part numbers that were auto-corrected or flagged for human review.
