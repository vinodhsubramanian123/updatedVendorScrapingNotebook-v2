import React, { useState, useEffect } from 'react';
import { Download, FileDown, Settings, Server, FileText } from 'lucide-react';

export default function ExportHistoryCard() {
  const [exportsList, setExportsList] = useState([]);
  const [limit, setLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const fetchExports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history/exports?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setExportsList(data);
      }
    } catch (e) {
      console.error('Failed to fetch exports history', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
    
    // Auto-refresh periodically to show new exports
    const interval = setInterval(fetchExports, 15000);
    return () => clearInterval(interval);
  }, [limit]);

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setIsConfigOpen(false);
  };

  return (
    <div className="glass-card p-6 mt-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileDown className="w-5 h-5 text-blue-600" />
          Workflow Exports History
        </h3>
        <div className="flex items-center gap-3 relative">
          <span className="mono text-[11px] text-slate-400">Showing {exportsList.length} of {limit}</span>
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            title="Configure limit"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          {isConfigOpen && (
            <div className="absolute top-8 right-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10 min-w-[120px]">
              <div className="text-[10px] font-bold text-slate-500 mb-2 px-2 uppercase">Display Limit</div>
              {[5, 10, 20, 50].map(val => (
                <button
                  key={val}
                  onClick={() => handleLimitChange(val)}
                  className={`block w-full text-left px-3 py-1.5 text-xs rounded-md ${limit === val ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {val} Exports
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Timestamp</th>
              <th className="px-4 py-2.5">Chassis Context</th>
              <th className="px-4 py-2.5">Solution Rank</th>
              <th className="px-4 py-2.5">Total Budget</th>
              <th className="px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && exportsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading exports history...</span>
                  </div>
                </td>
              </tr>
            ) : exportsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No BOQ Exports Found</p>
                  <p className="text-[11px] text-slate-400">Generate a buildable BOQ candidate and export it to see history here.</p>
                </td>
              </tr>
            ) : (
              exportsList.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                    {new Date(exp.exportedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      {exp.chassisId}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="badge badge-indigo flex items-center gap-1 max-w-[150px] truncate" title={exp.solutionName}>
                      Rank {exp.rank}: {exp.solutionName}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-emerald-700 font-bold">
                    ${(exp.estimatedCostUsd || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <a 
                      href={exp.downloadPath}
                      download={exp.filename}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 text-[11px] font-bold rounded-md shadow-sm transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Excel
                    </a>
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
