import React from 'react';
import { Sparkles } from 'lucide-react';

export default function OcrAuditLedger({ ocrLogs = [] }) {
  return (
    <div className="mt-8">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-600 stroke-[2.25px]" /> Gemini Multimodal Vision OCR Extraction Audit Ledger
      </h3>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Timestamp</th>
              <th className="px-4 py-2.5">Image File</th>
              <th className="px-4 py-2.5">File Size</th>
              <th className="px-4 py-2.5">Extracted Characters</th>
              <th className="px-4 py-2.5">Extracted SKUs</th>
              <th className="px-4 py-2.5">OCR Vision Model</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ocrLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No document image OCR extractions logged yet. Upload an image quote or screenshot to test vision OCR.
                </td>
              </tr>
            ) : (
              ocrLogs.slice(0, 10).map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-semibold text-slate-800">{log.fileName}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">{(log.fileSizeBytes / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-2 text-slate-700 font-mono">{log.charLength} chars</td>
                  <td className="px-4 py-2 font-bold text-indigo-700">{log.extractedSkusCount} SKUs</td>
                  <td className="px-4 py-2">
                    <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {log.modelUsed}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
