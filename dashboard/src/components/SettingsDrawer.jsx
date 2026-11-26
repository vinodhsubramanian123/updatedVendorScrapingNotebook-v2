import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Save, Check, Loader, BookOpen, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { requestJson, postJson } from '../services/api.js';
import { useModalFocus } from '../hooks/useModalFocus.js';
import ModelRoutingPanel from './settings/ModelRoutingPanel.jsx';

function getNotebookIdString(val) {
  if (typeof val === 'object' && val !== null) return val.notebookId || val.id || '';
  return typeof val === 'string' ? val : '';
}

function NotebookMappingList({ config, onUpdateMapping, onRemoveMapping }) {
  return (
    <div className="space-y-2.5">
      {Object.entries(config.notebooks || {}).map(([chassis, nbId]) => (
        <div key={chassis} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-800 break-all" title={chassis}>{chassis}</span>
            <button
              onClick={() => onRemoveMapping(chassis)}
              className="shrink-0 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Remove mapping"
              aria-label={`Remove ${chassis} mapping`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={getNotebookIdString(nbId)}
            onChange={e => onUpdateMapping(chassis, e.target.value)}
            placeholder="Notebook ID"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      ))}
    </div>
  );
}

function NotebookRegistryTab({
  config, setConfig, newChassis, setNewChassis, newNotebookId, setNewNotebookId,
  saving, onAddMapping, onRemoveMapping, onUpdateMapping
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          Default NotebookLM Notebook ID
        </label>
        <input
          type="text"
          value={config.defaultNotebookId || ''}
          onChange={e => setConfig(prev => ({ ...prev, defaultNotebookId: e.target.value }))}
          placeholder="e.g. 1d190853-4e9c-48df-aa70-eae66c6f2c1f"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
          Chassis → NotebookLM ID Registry
        </h4>
        <NotebookMappingList config={config} onUpdateMapping={onUpdateMapping} onRemoveMapping={onRemoveMapping} />

        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Add New Mapping</p>
          <input
            type="text"
            value={newChassis}
            onChange={e => setNewChassis(e.target.value)}
            placeholder="Chassis folder name (e.g. DL360_Gen12_LFF)"
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            type="text"
            value={newNotebookId}
            onChange={e => setNewNotebookId(e.target.value)}
            placeholder="NotebookLM Notebook ID"
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={onAddMapping}
            disabled={!newChassis.trim() || !newNotebookId.trim() || saving}
            className="w-full btn-secondary justify-center text-xs disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Add Mapping
          </button>
        </div>
      </div>
    </div>
  );
}

function useNotebookSettings(isOpen) {
  const [config, setConfig] = useState({ defaultNotebookId: '', notebooks: {} });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const controller = new AbortController();
    setError(null);
    requestJson('/api/config/notebooks', { signal: controller.signal, timeoutMs: 10000 })
      .then(data => { if (!controller.signal.aborted) { setConfig(data); setLoadFailed(false); setLoading(false); } })
      .catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoadFailed(true); setLoading(false); } });
    return () => controller.abort();
  }, [isOpen, loadAttempt]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const data = await postJson('/api/config/notebooks', { ...config, replaceMappings: true });
      setConfig(data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return { config, setConfig, loading, loadFailed, retryLoad: () => setLoadAttempt(v => v + 1), saving, saved, error, handleSave };
}

export default function SettingsDrawer({ isOpen, onClose, theme = 'light', onThemeChange }) {
  const drawerRef = useModalFocus(isOpen, onClose);
  const [activeTab, setActiveTab] = useState('ROUTING');
  const [newChassis, setNewChassis] = useState('');
  const [newNotebookId, setNewNotebookId] = useState('');
  const s = useNotebookSettings(isOpen);

  if (!isOpen) return null;

  const handleAddMapping = () => {
    if (!newChassis.trim() || !newNotebookId.trim()) return;
    s.setConfig(prev => ({
      ...prev,
      notebooks: { ...prev.notebooks, [newChassis.trim()]: { notebookId: newNotebookId.trim(), canonicalDriveEnabled: false } }
    }));
    setNewChassis(''); setNewNotebookId('');
  };

  const handleRemoveMapping = (key) => s.setConfig(prev => {
    const updated = { ...prev.notebooks };
    delete updated[key];
    return { ...prev, notebooks: updated };
  });

  const handleUpdateMapping = (key, value) => s.setConfig(prev => {
    const cur = prev.notebooks?.[key];
    return { ...prev, notebooks: { ...prev.notebooks, [key]: (typeof cur === 'object' && cur !== null) ? { ...cur, notebookId: value } : value } };
  });

  const tabCls = (id) => `pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
    activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
  }`;

  const drawer = (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex="-1" className="drawer-content w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col focus:outline-none">
        {s.error && (
          <div role="alert" className="p-3 text-sm text-rose-800 bg-rose-50">
            {s.error} {s.loadFailed && <button className="ml-3 underline" onClick={s.retryLoad}>Retry</button>}
          </div>
        )}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <h3 id="settings-title" className="font-bold text-slate-900 text-base">System Settings & Routing</h3>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-slate-200 px-6 pt-3 shrink-0">
          <button type="button" onClick={() => setActiveTab('ROUTING')} className={tabCls('ROUTING')}>Model Routing & Appearance</button>
          <button type="button" onClick={() => setActiveTab('NOTEBOOKS')} className={tabCls('NOTEBOOKS')}>Notebook Registry</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'ROUTING' && <ModelRoutingPanel theme={theme} onThemeChange={onThemeChange} />}
          {activeTab === 'NOTEBOOKS' && (s.loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-8 justify-center animate-pulse"><Loader className="w-4 h-4 animate-spin" /> Loading configuration...</div>
          ) : (
            <NotebookRegistryTab
              config={s.config} setConfig={s.setConfig} newChassis={newChassis} setNewChassis={setNewChassis}
              newNotebookId={newNotebookId} setNewNotebookId={setNewNotebookId} saving={s.saving}
              onAddMapping={handleAddMapping} onRemoveMapping={handleRemoveMapping} onUpdateMapping={handleUpdateMapping}
            />
          ))}
        </div>

        {activeTab === 'NOTEBOOKS' && (
          <div className="border-t border-slate-100 px-6 py-4 shrink-0">
            <button onClick={s.handleSave} disabled={s.saving || s.loading || s.loadFailed} className="w-full btn-primary justify-center disabled:opacity-40">
              {s.saved ? <><Check className="w-4 h-4" /> Saved!</> : s.saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Registry</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : drawer;
}
