'use strict';
/**
 * scripts/lib/ocr_service.js — Multimodal Gemini Vision OCR & Image Document Extraction Engine
 *
 * Supports PNG, JPG, JPEG, WEBP, TIFF, GIF, and scanned PDF image BOQ/BOM extraction.
 * Extracts line-item tables with HPE SKU numbers, product descriptions, quantities, unit prices,
 * and base chassis CTO configuration multipliers.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { GoogleGenAI } = require('@google/genai');

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.pdf'];

/**
 * Check if a file path is an image or image-based PDF requiring OCR.
 * @param {string} filePath 
 * @returns {boolean}
 */
function isImageFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max

/**
 * Perform Multimodal Gemini Vision OCR on an image file or buffer.
 * Extracts clean tabular text containing line items, SKUs, descriptions, quantities, and pricing.
 * @param {string} filePath Path to image file
 * @param {object} [options] Optional parameters
 * @returns {Promise<{ text: string, lineCount: number, detectedSkus: string[], isOcrProcessed: boolean, logs: string[] }>}
 */
async function performGeminiOcr(filePath, options = {}) {
  const logger = require('../system/pipeline_logger.js');
  const logs = [];
  const log = (msg) => {
    const entry = `📸 [OCR_SERVICE] ${msg}`;
    logs.push(entry);
    logger.info('OCR_SERVICE', msg);
  };

  const resolvedPath = path.resolve(filePath);
  log(`Initiating Multimodal OCR pre-processing for: ${path.basename(resolvedPath)}`);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`OCR Target file not found: ${resolvedPath}`);
  }

  const fileStats = fs.statSync(resolvedPath);
  if (fileStats.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`OCR Target file exceeds maximum allowed size of 25MB (Current size: ${(fileStats.size / (1024 * 1024)).toFixed(2)}MB)`);
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  let mimeType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.pdf') mimeType = 'application/pdf';
  else if (ext === '.tiff' || ext === '.tif') mimeType = 'image/tiff';
  else if (ext === '.gif') mimeType = 'image/gif';
  else if (ext === '.bmp') mimeType = 'image/bmp';

  const geminiRotator = require('../system/gemini_rotator.js');
  const activeKeyInfo = geminiRotator.getActiveKey();
  if (!activeKeyInfo || !activeKeyInfo.apiKey) {
    log('⚠️ GEMINI_API_KEY environment variable is absent. Serving image metadata fallback notice.');
    return {
      text: `[OCR_NOTICE] Image file '${path.basename(resolvedPath)}' uploaded. Gemini API Key is required for image OCR parsing. Please configure GEMINI_API_KEY or paste BOM text directly.`,
      lineCount: 1,
      detectedSkus: [],
      ocrStatus: 'KEY_REQUIRED',
      remediationAction: 'Configure GEMINI_API_KEY or upload CSV/XLSX text BOM.',
      isOcrProcessed: false,
      logs
    };
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const modelUsed = process.env.GEMINI_MODEL_NAME || 'gemini-3.6-flash';

    log(`Reading ${Math.round(fileBuffer.length / 1024)} KB image payload for multimodal model analysis...`);

    const prompt = `You are a precision enterprise hardware BOM & BOQ OCR extraction system for HPE, Cisco, Dell, and server vendor quote sheets.
Analyze this document image carefully and extract all tabular item lines.

For each item line found in the document image, output line-by-line formatted text in clean CSV/TSV format:
Line#, SKU / Product Number, Description, Quantity, Unit Price, Total Price

CRITICAL EXTRACTION RULES:
1. Extract exact HPE/vendor Part Numbers & SKUs (e.g. P76706-B21, P48820-B21, P74792-B21, P36877-B21, P01366-B21).
2. Look for Configure-to-Order (CTO) Server Chassis lines (e.g., "HPE ProLiant Compute DL380a Gen12 Configure-to-order Server") and capture the base chassis quantity (e.g., 1 Unit, 5 Units).
3. Capture child option quantities (CPUs, RAM DIMMs, Drives, PSUs, Cables) exactly as shown in the quote.
4. If prices are visible, include Unit Price and Total Price.
5. Return ONLY the extracted text lines/table. Do not add conversational markdown wrapping or explanations outside the structured data.`;

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data
      }
    };

    const textPart = { text: prompt };

    log(`Transmitting image payload to Gemini (${modelUsed}) with smart key rotation...`);
    const response = await geminiRotator.executeWithSmartRotation(async ({ ai }) => {
      return await ai.models.generateContent({
        model: modelUsed,
        contents: { parts: [imagePart, textPart] }
      });
    }, {
      clientOptions: {
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      }
    });

    const extractedText = response.text ? response.text.trim() : '';
    const lines = extractedText.split('\n').filter(l => l.trim().length > 0);

    // Extract all valid SKUs detected in extracted OCR text
    const skuMatches = Array.from(extractedText.matchAll(/([A-Z0-9]{5,6}-[A-Z0-9]{2,3})/g)).map(m => m[1]);
    const detectedSkus = Array.from(new Set(skuMatches));

    log(`✅ Successfully extracted ${lines.length} lines and ${detectedSkus.length} unique SKU(s) via Gemini OCR.`);

    return {
      text: extractedText,
      lineCount: lines.length,
      detectedSkus,
      modelUsed,
      ocrStatus: 'SUCCESS',
      isOcrProcessed: true,
      logs
    };

  } catch (err) {
    log(`❌ Gemini OCR failed: ${err.message}. Falling back to structured error notification.`);
    return {
      text: `[OCR_ERROR] Failed to extract text from image ${path.basename(filePath)}: ${err.message}`,
      lineCount: 0,
      detectedSkus: [],
      ocrStatus: 'FAILED',
      rawError: err.message,
      remediationAction: 'Check Gemini API Key quota or upload high-resolution image / CSV BOM.',
      isOcrProcessed: false,
      logs
    };
  }
}

module.exports = {
  isImageFile,
  performGeminiOcr
};
