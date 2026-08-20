import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, FileText, CheckCircle2, AlertTriangle, RefreshCw, 
  XCircle, Terminal, Sliders, Layers, Check, 
  ShieldCheck, Calculator, HelpCircle, ArrowRight, Award, Wrench,
  Activity
} from 'lucide-react';

const EVAL_PIPELINE_STEPS = [
  { id: 1, title: 'Workload DNA & Intake', subtitle: 'Extract hardware SKU lines, multi-sheet BOM & CTO multipliers' },
  { id: 2, title: 'Chassis Auto-Detection', subtitle: 'Identify target chassis variant, generation & form factor' },
  { id: 3, title: 'Catalog Rules Engine', subtitle: 'Load multi-tiered scraped rules & mandatory dependencies' },
  { id: 4, title: '6-Aspect Physical Math', subtitle: 'Compute/Thermal, Memory, Storage, PCIe, Power, Support checks' },
  { id: 5, title: '5-Tier Strategy Matrix', subtitle: 'Synthesize Rank 1 (Intent) through Rank 5 (Budget Minimized)' },
  { id: 6, title: 'Quantitative Confidence', subtitle: 'Calculate deterministic reliability & conflict graph score' },
  { id: 7, title: 'CapEx Budget Optimizer', subtitle: 'Evaluate budget limits, upgrade paths & pricing baseline' },
  { id: 8, title: 'Agentic Guardrail Loop', subtitle: 'Autonomous conflict resolution & fallback safety checks' },
  { id: 9, title: 'NotebookLM RAG Grounding', subtitle: 'QuickSpecs document verification & grounding payload' },
  { id: 10, title: 'Solution Report & Audit', subtitle: 'Compile telemetry ledger, exportable BOM & actionable fixes' }
];

export default function BoqUploader({ 
  onEvaluateBoq, 
  evalResults, 
  logStream = [], 
  chassisDir,
  isTaskRunning = false,
  onOpenMatrix,
  _onOpenReconciliation
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalError, setEvalError] = useState(null);
  
  // Manual Pre-processing & Categorization state
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preflightData, setPreflightData] = useState(null);
  const [confirmedConfigSplits, setConfirmedConfigSplits] = useState(new Set());
  const logsEndRef = useRef(null);

  // Safe evaluation check
  const isEvaluating = isSubmitting || (isTaskRunning && logStream.some(l => {
    const text = typeof l === 'string' ? l : (l?.text || l?.action || '');
    return text.includes('Step ') || text.includes('Evaluating') || text.includes('Extracting');
  }));

  // Derive current active evaluation step index (1..10)
  const currentStep = React.useMemo(() => {
    if (evalResults && evalResults.status !== 'ERROR') return 10;
    if (!isEvaluating) return 0;
    let highest = 1;
    for (const log of logStream) {
      if (typeof log === 'object' && log !== null && typeof log.step === 'number') {
        highest = Math.max(highest, log.step);
      }
      const text = typeof log === 'string' ? log : (log?.text || log?.action || '');
      const match = text.match(/Step\s+(\d+)\/10/i);
      if (match) {
        highest = Math.max(highest, parseInt(match[1], 10));
      }
    }
    return highest;
  }, [logStream, isEvaluating, evalResults]);

  // Auto-scroll logs
  useEffect(() => {
    if (isEvaluating && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logStream, isEvaluating]);

  // When evalResults changes and is not error, clear isSubmitting
  useEffect(() => {
    if (evalResults) {
      setIsSubmitting(false);
    }
  }, [evalResults]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Pre-process BOQ and analyze variations
  const handlePreprocess = async (overrideFile = null, overrideRawText = null) => {
    const isFileObject = (overrideFile instanceof File) || (overrideFile && typeof overrideFile.name === 'string' && typeof overrideFile.size === 'number');
    const currentFile = isFileObject ? overrideFile : file;
    const currentText = (typeof overrideRawText === 'string') ? overrideRawText : rawText;
    
    console.log('[BoqUploader] handlePreprocess triggered. currentFile:', currentFile?.name, 'size:', currentFile?.size, 'currentText length:', currentText?.trim()?.length);
    if (!currentFile && !currentText?.trim()) {
      console.log('[BoqUploader] Aborting handlePreprocess: no file and no text');
      return;
    }
    setIsPreprocessing(true);
    setEvalError(null);

    try {
      let filepath = null;
      if (currentFile) {
        console.log('[BoqUploader] Uploading file to /api/upload-boq...');
        const formData = new FormData();
        formData.append('boqFile', currentFile);
        const uploadRes = await fetch('/api/upload-boq', {
          method: 'POST',
          body: formData
        });
        console.log('[BoqUploader] uploadRes status:', uploadRes.status);
        const uploadData = await uploadRes.json();
        console.log('[BoqUploader] uploadData:', uploadData);
        filepath = uploadData.filepath;
      }

      console.log('[BoqUploader] Calling /api/preprocess-boq with filepath:', filepath, 'chassisDir:', chassisDir);
      const res = await fetch('/api/preprocess-boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath, rawText: currentText, chassisDir })
      });
      console.log('[BoqUploader] preprocess-boq res status:', res.status);
      const data = await res.json();
      console.log('[BoqUploader] preprocess-boq response:', data);
      if (data.status === 'SUCCESS') {
        console.log('[BoqUploader] Setting preflightData in state:', data.preflightData);
        setPreflightData(data.preflightData);
      } else {
        setEvalError(data.error || 'Failed to preprocess BOQ');
      }
    } catch (err) {
      console.error('[BoqUploader] preprocess error:', err);
      setEvalError(err.message || 'Failed to preprocess BOQ');
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleConfirmSplit = async (configId, splitReason) => {
    try {
      const res = await fetch('/api/confirm-preflight-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId, splitReason, notes: 'Confirmed by analyst in Pre-flight preview.' })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setConfirmedConfigSplits(prev => new Set([...prev, configId]));
      }
    } catch (err) {
      console.error('Failed to confirm split:', err);
    }
  };

  const handleSubmit = async () => {
    console.log('[BoqUploader] handleSubmit triggered. file:', file?.name, 'rawText length:', rawText.trim().length);
    if (!file && !rawText.trim()) return;
    setIsSubmitting(true);
    setEvalError(null);

    try {
      let filepath = null;
      if (file) {
        const formData = new FormData();
        formData.append('boqFile', file);
        const uploadRes = await fetch('/api/upload-boq', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        console.log('[BoqUploader] upload-boq response:', uploadData);
        filepath = uploadData.filepath;
      }

      console.log('[BoqUploader] calling onEvaluateBoq with filepath:', filepath);
      const res = await onEvaluateBoq({ filepath, rawText });
      console.log('[BoqUploader] onEvaluateBoq response:', res);
      if (res?.error) {
        setEvalError(res.error);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('[BoqUploader] eval error:', err);
      setEvalError(err.message || 'Failed to evaluate BOQ quote');
      setIsSubmitting(false);
    }
  };

  // 1-Click Fix SKU injector: appends fix SKU to text and triggers re-eval
  const handleInjectFixSku = (fixSku, desc) => {
    const current = rawText.trim();
    const addition = `1x ${fixSku} (${desc || 'Physical Fix'})`;
    const updated = current ? `${current}, ${addition}` : addition;
    setRawText(updated);
    onEvaluateBoq({ rawText: updated });
  };

  const confidenceScore = evalResults?.confidence?.score ?? (evalResults?.conflictGraph?.isWholeSolutionValid ? 1.0 : 0.55);
  const confidencePercent = Math.round(confidenceScore * 100);
  const aspectChecks = evalResults?.aspectChecks || [];
  const failedAspects = aspectChecks.filter(a => a.status === 'FAIL');
  const missingDeps = evalResults?.missingDependencies || [];

  return (
    <div className="glass-card p-6 space-y-6 animate-fade-in">
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            BOQ Quote Upload & Multi-Aspect Ingestion
          </h2>
          <p className="text-xs text-slate-500">
            Upload customer Excel quotes (.xlsx, .csv, .json) or paste raw BOM text for real-time 6-aspect physical evaluation.
          </p>
        </div>

        <button
          onClick={handlePreprocess}
          disabled={isPreprocessing || (!file && !rawText.trim()) || isEvaluating}
          className="btn-secondary text-xs flex items-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 transition-all active:scale-98"
        >
          {isPreprocessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Sliders className="w-3.5 h-3.5 text-blue-600" />}
          Pre-process & Categorize
        </button>
      </div>

      {/* Evaluation Error Alert */}
      {evalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2 animate-fade-in shadow-2xs">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">BOQ Preprocessing / Evaluation Failed</p>
            <p className="text-[11px] text-rose-800 mt-0.5">{evalError}</p>
          </div>
        </div>
      )}

      {/* Manual Pre-Processing Preview Panel */}
      {preflightData && (
        <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-4 shadow-2xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs text-slate-900">
                Manual Pre-Processing & Variant Categorization
              </h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                {preflightData.variations?.length || 0} Variation(s) Identified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold">Confidence Score:</span>
              <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${
                (preflightData.preprocessingConfidence || 0) >= 0.85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {Math.round((preflightData.preprocessingConfidence || 0) * 100)}%
              </span>
            </div>
          </div>

          {/* 5-Stage Cleansing & Pre-Validation Workflow Stepper */}
          {preflightData.preflightPipeline?.stages && (
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-700" />
                  <h4 className="font-bold text-xs text-slate-900">
                    5-Stage Validation Cleansing & Math Guardrails Workflow
                  </h4>
                </div>
                <span data-testid="stages-cleared-badge" className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  {preflightData.preflightPipeline.stages.filter(s => s.passed).length}/5 Stages Cleared
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {preflightData.preflightPipeline.stages.map((stg) => (
                  <div
                    key={stg.id}
                    className={`p-2.5 rounded-lg border text-left space-y-1 transition-all ${
                      stg.passed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 shadow-2xs'
                        : 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Stage {stg.stageNumber}
                      </span>
                      {stg.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="font-bold text-[11px] leading-tight text-slate-900">
                      {stg.title}
                    </p>
                    <p className="text-[10px] leading-snug text-slate-600 line-clamp-3">
                      {stg.detail}
                    </p>
                  </div>
                ))}
              </div>

              {/* Interactive Anomaly Resolution Callout for Fractional CTO Quantities */}
              {preflightData.preflightPipeline.hasNonInteger && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs text-rose-900">
                        Fractional CTO Multiplier Detected ({preflightData.preflightPipeline.fractionalDetails?.foundMultiplier || 'Non-Integer'}x)
                      </h5>
                      <p className="text-[11px] text-rose-700">
                        Some SKU quantities are not evenly divisible by the detected multiplier. Choose resolution:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleConfirmSplit(preflightData.variations[0]?.configId, 'ROUND_NEAREST_INTEGER')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded border border-rose-300 shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Calculator className="w-3 h-3 text-blue-600" /> Round to Nearest Integer
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Option Selected: Treat fractional items as unattached spare parts in order.')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded border border-rose-300 shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" /> Treat Remainder as Spare Parts
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Option Selected: Prompt customer to clarify potential typo.')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded border border-rose-300 shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3 text-amber-600" /> Ask Customer for Clarification
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuration Variations Grid */}
          {preflightData.variations && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {preflightData.variations.map((v) => (
                <div key={v.configId} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">{v.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{v.items?.length || 0} SKUs</span>
                  </div>
                  
                  {v.profile && (
                    <div data-testid="profile-summary" className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                      <div>• <span className="font-semibold text-slate-700">CPU:</span> {v.profile.cpus} ({v.profile.maxTdpWatts}W)</div>
                      <div>• <span className="font-semibold text-slate-700">RAM:</span> {v.profile.totalRamGb}GB ({v.profile.dimmCount} DIMMs)</div>
                      <div>• <span className="font-semibold text-slate-700">Storage:</span> {v.profile.driveCount}x {v.profile.driveMedia}</div>
                      <div>• <span className="font-semibold text-slate-700">Power Feed:</span> {v.profile.psuType}</div>
                    </div>
                  )}

                  {v.splitReasons && v.splitReasons.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Split Reason Taxonomy:</span>
                      <div className="flex flex-wrap gap-1">
                        {v.splitReasons.map(r => (
                          <span key={r} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleConfirmSplit(v.configId, v.splitReasons?.[0] || 'WORKLOAD_NODE_PURPOSE')}
                      disabled={confirmedConfigSplits.has(v.configId)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
                    >
                      {confirmedConfigSplits.has(v.configId) ? (
                        <><Check className="w-3 h-3 text-emerald-600" /> Categorization Confirmed</>
                      ) : (
                        <><ShieldCheck className="w-3 h-3 text-blue-600" /> Confirm Categorization</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Form: File Upload + Raw Text Paste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Side: Upload Controls */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
              isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
            }`}
          >
            <input
              type="file"
              id="boqFileInput"
              className="hidden"
              accept=".xlsx,.csv,.json,.txt"
              onChange={handleFileChange}
            />
            <label htmlFor="boqFileInput" className="cursor-pointer block">
              <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                {file ? file.name : 'Click to select or drag and drop BOQ quote file'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Supports .xlsx, .csv, .json, or .txt</p>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Or paste raw SKU text BOM:
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                <button
                  type="button"
                  onClick={() => setRawText('1x P73282-B21 (HPE ProLiant DL380 Gen12 SFF CTO Server), 2x P74573-B21 (Intel Xeon 6730P 250W), 16x P69728-B21 (64GB DDR5), 2x P03178-B21 (1000W PSU)')}
                  className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200 transition-colors"
                >
                  DL380 Gen12
                </button>
                <button
                  type="button"
                  onClick={() => setRawText('1x Alletra_Storage_System Base Enclosure, 24x 1.92TB NVMe SSD Media Pack, 2x 100Gb F32 Interconnect')}
                  className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded border border-indigo-200 transition-colors"
                >
                  Alletra
                </button>
                <button
                  type="button"
                  onClick={() => setRawText('1x P52560-B21 (HPE ProLiant DL380 Gen11 8SFF CTO Server), 2x P49057-B21 (Intel Xeon 8580), 8x P38620-B21 (32GB DDR5), 2x P48818-B21 (800W PSU)')}
                  className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-200 transition-colors"
                >
                  DL380 Gen11
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. 1x P49057-B21, 2x P38620-B21, 16x P00424-B21..."
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isEvaluating || (!file && !rawText.trim())}
            className="w-full btn-primary justify-center text-xs disabled:opacity-50 py-2.5 shadow-md shadow-blue-600/20 active:scale-98 transition-all"
          >
            {isEvaluating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Evaluating 6 Physical Aspects (Step {currentStep}/10)...</>
            ) : (
              <><FileText className="w-4 h-4" /> Run Aspect Math & Pre-Flight BOQ Check</>
            )}
          </button>
        </div>

        {/* Right Side: SSE Log Output */}
        <div className="flex flex-col h-full min-h-[260px] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-[11px] text-slate-200 flex items-center gap-2 uppercase tracking-widest">
              <Terminal className="w-3.5 h-3.5 text-blue-400" /> Live Evaluator Logs
            </h3>
            {isEvaluating && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
          </div>
          <div className="p-3 text-[10px] font-mono leading-relaxed h-full overflow-y-auto max-h-[280px]">
            {(!logStream || logStream.length === 0) ? (
              <div className="text-slate-600 italic mt-2 text-center h-full flex items-center justify-center">
                Awaiting evaluation task...
              </div>
            ) : (
              logStream.map((log, i) => {
                const text = typeof log === 'string' ? log : (log?.text || (log?.action ? `[Step ${log?.step || ''}/10] ${log.action}: ${log.detail || ''}` : ''));
                if (!text) return null;
                const isError = log?.stream === 'stderr' || text.includes('FAIL') || text.includes('❌') || log?.status === 'error';
                const isProgress = text.includes('Step ') || text.includes('🚀') || text.includes('▶');
                return (
                  <div key={i} className={isError ? 'text-amber-400 font-bold' : isProgress ? 'text-blue-300 font-semibold' : 'text-emerald-400'}>
                    {text}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* 2. TRANSPARENT 10-STEP VISUAL MOTION GRAPHICS PROGRESS TRACKER */}
      {(isEvaluating || (evalResults && evalResults.status !== 'ERROR')) && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-700/80 shadow-md space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isEvaluating ? 'text-blue-400 animate-pulse' : 'text-emerald-400'}`} />
              <h4 className="font-extrabold text-xs text-slate-100 tracking-wide uppercase">
                10-Step Evaluation & Aspect Math Verification Pipeline
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold">Progress:</span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                currentStep >= 10 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {currentStep >= 10 ? '10/10 (100%)' : `${currentStep}/10 (${Math.round((currentStep / 10) * 100)}%)`}
              </span>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out ${
                currentStep >= 10 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}
              style={{ width: `${Math.max(10, Math.min(100, currentStep * 10))}%` }}
            />
          </div>

          {/* 10-Step Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {EVAL_PIPELINE_STEPS.map((step) => {
              const isCompleted = currentStep > step.id || (currentStep >= 10 && evalResults);
              const isCurrent = currentStep === step.id && isEvaluating;

              return (
                <div
                  key={step.id}
                  className={`p-2 rounded-lg border text-left space-y-1 transition-all ${
                    isCompleted
                      ? 'bg-slate-800/80 border-emerald-500/30 text-slate-200'
                      : isCurrent
                      ? 'bg-blue-950/70 border-blue-500 text-blue-100 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold font-mono text-slate-400 uppercase">
                      Step {step.id}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                  </div>
                  <p className={`font-bold text-[10px] leading-tight ${isCurrent ? 'text-blue-200' : isCompleted ? 'text-slate-200' : 'text-slate-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-[9px] leading-snug text-slate-400 line-clamp-2">
                    {step.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EVALUATION RESULTS & TRANSPARENT ASPECT VIOLATION BREAKDOWN */}
      {evalResults && (
        <div className="space-y-4 pt-2 border-t border-slate-200 animate-fade-in">
          
          {/* Quantitative Confidence Gauge Banner */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
            confidencePercent >= 85 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-5 h-5 ${confidencePercent >= 85 ? 'text-emerald-600' : 'text-amber-600'}`} />
                <h3 className="font-extrabold text-sm">
                  {confidencePercent >= 85 ? 'Certified Buildable Configuration' : 'Physical Constraint Violations Flagged'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold border ${
                  confidencePercent >= 85 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  Confidence Score: {confidencePercent}%
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {evalResults?.confidence?.summary || (confidencePercent >= 85 ? 'All physical math aspects verified 100% buildable.' : 'Mandatory hardware fixes required before production deployment.')}
              </p>
            </div>

            {/* Quick Handoff Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {onOpenMatrix && (
                <button
                  onClick={onOpenMatrix}
                  className="btn-primary text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 shadow-sm transition-all active:scale-98"
                >
                  <Award className="w-4 h-4" /> View 5-Tier Strategy Matrix <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Inline Aspect Violations & Actionable Fixes (Zero Suppression) */}
          {(failedAspects.length > 0 || missingDeps.length > 0) && (
            <div className="space-y-3 p-4 bg-white border border-rose-200 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                <div className="flex items-center gap-2 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h4 className="font-bold text-xs">
                    Identified Physical Hardware Violations ({failedAspects.length + missingDeps.length})
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Action Required
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {failedAspects.map((asp) => (
                  <div key={asp.id} className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-900">{asp.name}</span>
                      <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                        Aspect #{asp.id} FAIL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700">{asp.detail}</p>
                  </div>
                ))}

                {missingDeps.map((dep, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-900">{dep.rule}</span>
                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                          Qty: {dep.quantity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-1 font-mono font-semibold">
                        SKU: <span className="text-blue-700">{dep.sku}</span> — {dep.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInjectFixSku(dep.sku, dep.description)}
                      className="w-full py-1 px-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                    >
                      <Wrench className="w-3.5 h-3.5" /> 1-Click Auto-Inject Fix SKU ({dep.sku})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
