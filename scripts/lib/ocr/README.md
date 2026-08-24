# Multimodal Vision OCR Subsystem (`scripts/lib/ocr/`)

## 1. Purpose & Scope
Provides multimodal Vision OCR parsing for scanned quotes, PDF proposals, and image snippets using Gemini Flash with smart API key rotation.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `ocr_service.js` | `extractTableFromImage()`, `parseQuotePdf()` | Sends base64 image or PDF buffer to Gemini Vision and returns structured tabular SKU arrays. |

## 3. Operational Guardrails
- **Max File Size**: 25 MB payload limit enforced prior to transmission.
- **Smart Rotation**: Uses FIFO key rotator (`scripts/lib/system/gemini_rotator.js`) to seamlessly cycle API keys upon 429 quota exhaustion.
- **Sanitization**: Output SKU strings are filtered through `isValidHpeSKU()`.
