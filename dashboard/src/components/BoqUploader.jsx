import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, RefreshCw, XCircle, Terminal, Sliders, Layers, GitCompare, Check, ShieldCheck, Calculator, HelpCircle } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function BoqUploader({ onEvaluateBoq, evalResults, logStream, chassisDir }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [evalError, setEvalError] = useState(null);
  
  // Manual Pre-processing & Categorization state
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preflightData, setPreflightData] = useState(null);
  const [confirmedConfigSplits, setConfirmedConfigSplits] = useState(new Set());
  const logsEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (loading && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logStream, loading]);

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
  const handlePreprocess = async () => {
    if (!file && !rawText.trim()) return;
    setIsPreprocessing(true);
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
        filepath = uploadData.filepath;
      }

      const res = await fetch('/api/preprocess-boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath, rawText, chassisDir })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setPreflightData(data.preflightData);
      } else {
        setEvalError(data.error || 'Failed to preprocess BOQ');
      }
    } catch (err) {
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
    if (!file && !rawText.trim()) return;
    setLoading(true);
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
        filepath = uploadData.filepath;
      }

      const res = await onEvaluateBoq({ filepath, rawText });
      if (res?.error) {
        setEvalError(res.error);
      }
    } catch (err) {
      setEvalError(err.message || 'Failed to evaluate BOQ quote');
    }
    setLoading(false);
  };

  const lowConfidence = evalResults?.requiresUserChassisConfirmation || (evalResults?.chassisConfidence < 0.75);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            BOQ Quote Upload &amp; Text Paste
          </h2>
          <p className="text-xs text-slate-500">
            Upload customer Excel quotes (.xlsx, .csv, .json) or paste raw BOM text for real-time multi-aspect evaluation.
          </p>
        </div>

        <button
          onClick={handlePreprocess}
          disabled={isPreprocessing || (!file && !rawText.trim())}
          className="btn-secondary text-xs flex items-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          {isPreprocessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Sliders className="w-3.5 h-3.5 text-blue-600" />}
          Pre-process &amp; Categorize
        </button>
      </div>

      {/* Evaluation Error Alert */}
      {evalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">BOQ Preprocessing / Evaluation Failed</p>
            <p className="text-[11px] text-rose-800 mt-0.5">{evalError}</p>
          </div>
        </div>
      )}

      {/* Manual Pre-Processing Preview Panel */}
      {preflightData && (
        <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs text-slate-900">
                Manual Pre-Processing &amp; Variant Categorization
              </h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                {preflightData.variations.length} Variation(s) Identified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold">Confidence Score:</span>
              <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${
                preflightData.preprocessingConfidence >= 0.85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {Math.round(preflightData.preprocessingConfidence * 100)}%
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
                    5-Stage Validation Cleansing &amp; Math Guardrails Workflow
                  </h4>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  {preflightData.preflightPipeline.stages.filter(s => s.passed).length}/5 Stages Cleared
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {preflightData.preflightPipeline.stages.map((stg) => (
                  <div
                    key={stg.id}
                    className={`p-2.5 rounded-lg border text-left space-y-1 transition-all ${
                      stg.passed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/80 border-amber-300 text-amber-950'
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
                        Fractional CTO Multiplier Anomaly Detected
                      </h5>
                      <p className="text-[11px] text-rose-800 mt-0.5">
                        Child items are not integer multiples of base chassis count ({preflightData.preflightPipeline.baseChassisQty} units). Select a Human-In-The-Loop resolution action:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 pl-6">
                    <button
                      type="button"
                      onClick={() => alert('Option Selected: Treat fractional items as unattached spare parts in order.')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded border border-rose-300 shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" /> Treat Remainder as Spare Parts
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Option Selected: Rounded per-unit quantity to nearest integer.')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded border border-rose-300 shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Calculator className="w-3 h-3 text-blue-600" /> Round to Nearest Integer
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {preflightData.variations.map((v, i) => (
              <div key={v.configId} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{v.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{v.items.length} SKUs</span>
                </div>
                
                <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                  <div>• <span className="font-semibold text-slate-700">CPU:</span> {v.profile.cpus} ({v.profile.maxTdpWatts}W)</div>
                  <div>• <span className="font-semibold text-slate-700">RAM:</span> {v.profile.totalRamGb}GB ({v.profile.dimmCount} DIMMs)</div>
                  <div>• <span className="font-semibold text-slate-700">Storage:</span> {v.profile.driveCount}x {v.profile.driveMedia}</div>
                  <div>• <span className="font-semibold text-slate-700">Power Feed:</span> {v.profile.psuType}</div>
                </div>

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

                {v.businessRationale && (
                  <p className="text-[10px] text-slate-500 italic bg-amber-50/50 p-1.5 rounded border border-amber-100">
                    "{v.businessRationale}"
                  </p>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => handleConfirmSplit(v.configId, v.splitReasons[0] || 'WORKLOAD_NODE_PURPOSE')}
                    disabled={confirmedConfigSplits.has(v.configId)}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
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

          {/* Differential Analysis Matrix Table */}
          {preflightData.diffSummary?.differences?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <GitCompare className="w-3.5 h-3.5 text-indigo-600" /> Variant Differential Analysis
              </h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Hardware Aspect</th>
                      <th className="p-2">{preflightData.diffSummary.comparedConfigs[0] || 'Config 1'}</th>
                      <th className="p-2">{preflightData.diffSummary.comparedConfigs[1] || 'Config 2'}</th>
                      <th className="p-2">Technical / Rule Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {preflightData.diffSummary.differences.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-800">{d.aspect}</td>
                        <td className="p-2 font-mono text-slate-600">{d.config1}</td>
                        <td className="p-2 font-mono text-slate-600">{d.config2}</td>
                        <td className="p-2 text-indigo-900 bg-indigo-50/50 font-medium">{d.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Low-Confidence Chassis Prompt */}
      {lowConfidence && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Low Chassis Auto-Detection Confidence ({Math.round((evalResults?.chassisConfidence || 0.6) * 100)}%)</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              The evaluator inferred chassis: <span className="font-bold">{evalResults?.chassis || 'Selected Catalog'}</span>. Select a different chassis in the header dropdown if this is incorrect.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Upload Controls */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Or paste raw SKU text BOM:
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                <button
                  type="button"
                  onClick={() => setRawText('1x P49057-B21 (Intel Xeon 8580), 16x P69728-B21 (64GB DDR5), 2x P47777-B21 (800W PSU)')}
                  className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200 transition-colors"
                >
                  DL380 Gen12
                </button>
                <button
                  type="button"
                  onClick={() => setRawText('1x Alletra 9000 Base Enclosure, 24x 1.92TB NVMe SSD Media Pack, 2x 100Gb F32 Interconnect')}
                  className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded border border-indigo-200 transition-colors"
                >
                  Alletra
                </button>
                <button
                  type="button"
                  onClick={() => setRawText('1x P52560-B21 (Intel Xeon 6430), 8x P38620-B21 (32GB DDR5), 2x P38620-B21')}
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
            disabled={loading || (!file && !rawText.trim())}
            className="w-full btn-primary justify-center text-xs disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Run Aspect Math &amp; Pre-Flight BOQ Check
          </button>
        </div>

        {/* Right Side: SSE Log Output */}
        <div className="flex flex-col h-full min-h-[250px] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-[11px] text-slate-200 flex items-center gap-2 uppercase tracking-widest">
              <Terminal className="w-3.5 h-3.5 text-blue-400" /> Live Evaluator Logs
            </h3>
            {loading && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
          </div>
          <div className="p-3 text-[10px] font-mono leading-relaxed h-full overflow-y-auto">
            {(!logStream || logStream.length === 0) ? (
              <div className="text-slate-600 italic mt-2 text-center h-full flex items-center justify-center">
                Awaiting evaluation task...
              </div>
            ) : (
              logStream.map((log, i) => (
                <div key={i} className={log.stream === 'stderr' ? 'text-blue-300' : 'text-emerald-400'}>
                  {log.text}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Live Evaluator Output Log & Progress Indicator */}
    </div>
  );
}
