import React from 'react';
import { UploadCloud, FileText, RefreshCw, Layers, Calculator } from 'lucide-react';

export default function BoqInputZone({
  isDragging,
  setIsDragging,
  file,
  setFile,
  rawText,
  setRawText,
  onDrop,
  onFileChange,
  onPreprocess,
  isPreprocessing,
  onDirectEvaluate,
  isEvaluating,
  onLoadSampleBoq,
  localOnly = true,
  onLocalOnlyChange
}) {
  const isImageOrPdfFile = Boolean(file?.name && /\.(pdf|png|jpe?g|webp|tiff|gif|bmp)$/i.test(file.name));

  return (
    <div className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Intake Customer BOQ / Hardware Bill of Materials</h2>
          <p className="text-xs text-slate-500">Upload Excel quote, text paste, or select sample enterprise configuration.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLoadSampleBoq('standard')}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sample Standard BOM
          </button>
          <button
            type="button"
            onClick={() => onLoadSampleBoq('multi-config')}
            className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sample Multi-Variation BOM
          </button>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a BOQ file to upload"
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); document.getElementById('boq-file-input')?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50'
            : file
            ? 'border-slate-300 bg-slate-50'
            : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
        }`}
        onClick={() => document.getElementById('boq-file-input')?.click()}
      >
        <input
          id="boq-file-input"
          type="file"
          accept=".xlsx,.xls,.csv,.txt,.tsv,.json,.pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={onFileChange}
        />
        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        {file ? (
          <div>
            <p className="text-xs font-bold text-slate-800">{file.name}</p>
            <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB — Click or drag to replace</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-slate-700">Drop your Excel workbook, quote text, PDF or image here</p>
            <p className="text-[11px] text-slate-500 mt-0.5">PDF/images: up to 25MB for OCR. Other supported files: up to 50MB.</p>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Or Paste Raw SKU Lines / Table Text:
          </label>
          {rawText && (
            <button
              type="button"
              onClick={() => { setRawText(''); setFile(null); }}
              className="text-[11px] text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste quote lines e.g.:&#10;1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF CTO Server&#10;2x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor&#10;16x P64707-B21 HPE 64GB 2Rx4 DDR5-5600 Registered Memory"
          className="w-full text-xs border border-slate-300 rounded-xl p-3 h-24 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono resize-y"
        />
      </div>

      {localOnly && isImageOrPdfFile && (
        <div role="alert" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
          <strong>Local-only mode active:</strong> PDF and image files cannot be sent to cloud OCR while <em>Use local catalog only</em> is checked. Provide pasted text or upload CSV/XLSX, or uncheck local-only mode if cloud OCR is permitted.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={localOnly}
            onChange={(e) => onLocalOnlyChange && onLocalOnlyChange(e.target.checked)}
          />
          Use local catalog only
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPreprocess()}
            disabled={isPreprocessing || (!file && !rawText.trim())}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            {isPreprocessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5 text-slate-600" />}
            {isPreprocessing ? 'Analyzing Variations...' : 'Pre-flight Variation Analysis'}
          </button>

          <button
            type="button"
            onClick={onDirectEvaluate}
            disabled={isEvaluating || (!file && !rawText.trim())}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
          >
            {isEvaluating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
            {isEvaluating ? 'Evaluating Solution...' : 'Run 7-Aspect Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
}
