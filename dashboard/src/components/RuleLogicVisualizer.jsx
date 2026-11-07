import React, { useState, useEffect } from 'react';
import {
  GitBranch, ShieldCheck, AlertTriangle, Layers,
  Search, ChevronRight, ChevronDown, CheckCircle2,
  X
} from 'lucide-react';

const RULE_LEVELS = ['VENDOR', 'CHASSIS', 'CATEGORY', 'SUBCATEGORY', 'SKU'];

const LEVEL_LABELS = {
  VENDOR: { title: '1. Vendor Level Rules', desc: 'Global HPE portal rules, CTO/BTO exclusions, and supply constraints', color: 'border-purple-300 bg-purple-50/50 text-purple-950', badge: 'bg-purple-100 text-purple-900 border-purple-200' },
  CHASSIS: { title: '2. Chassis Form-Factor Rules', desc: 'Chassis thermal envelope, ambient caps, power supply lug requirements', color: 'border-blue-300 bg-blue-50/50 text-blue-950', badge: 'bg-blue-100 text-blue-900 border-blue-200' },
  CATEGORY: { title: '3. Category Mixing Rules', desc: 'Memory bit-width homogeny, storage controller cache battery rules', color: 'border-indigo-300 bg-indigo-50/50 text-indigo-950', badge: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  SUBCATEGORY: { title: '4. Subcategory Quantity Limits', desc: 'Maximum slot bounds, CPU socket count, DIMM slot constraints', color: 'border-amber-300 bg-amber-50/50 text-amber-950', badge: 'bg-amber-100 text-amber-900 border-amber-200' },
  SKU: { title: '5. SKU Direct Dependencies', desc: 'Explicit part-to-part mandatory cable, heatsink, and riser pairing rules', color: 'border-emerald-300 bg-emerald-50/50 text-emerald-950', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' }
};

function filterRulesForLevel(lvl, parsedRules, subcategoryConstraints, searchQuery) {
  let list = parsedRules.filter(r => r.level === lvl);

  if (lvl === 'SUBCATEGORY' && subcategoryConstraints.length > 0) {
    const extra = subcategoryConstraints.map(sc => ({
      level: 'SUBCATEGORY',
      ruleType: 'CAPACITY_BOUND',
      parentCategory: sc.parentCategory,
      subCategory: sc.subCategory,
      ruleText: `${sc.parentCategory} > ${sc.subCategory}: Constraint = "${sc.constraint || 'Max Capacity'}" (Max Qty: ${sc.maxQty || 'N/A'})`,
      isStrict: true
    }));
    list = [...list, ...extra];
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(r =>
      r.ruleText.toLowerCase().includes(q) ||
      Boolean(r.parentCategory?.toLowerCase().includes(q)) ||
      Boolean(r.subCategory?.toLowerCase().includes(q)) ||
      r.ruleType.toLowerCase().includes(q)
    );
  }

  return list;
}

function checkRuleActiveInBoq(ruleText, evalResults) {
  if (!evalResults) return null;
  const text = ruleText.toLowerCase();
  const prefix = text.slice(0, 20);

  const isViolated =
    Boolean(evalResults.mathDeductions?.some(d => text.includes(d.toLowerCase()) || d.toLowerCase().includes(prefix))) ||
    Boolean(evalResults.preflightPipeline?.stages?.some(s => s.detail?.toLowerCase().includes(prefix)));
  if (isViolated) return 'TRIGGERED_VIOLATION';

  const isSatisfied = Boolean(evalResults.candidates?.some(c => c.fixSummary?.some(f => text.includes(f.toLowerCase()))));
  if (isSatisfied) return 'SATISFIED_BY_FIX';

  return 'EVALUATED_PASS';
}

function RuleNodeItem({ rule, boqStatus }) {
  let statusIcon = <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.25px]" />;
  if (boqStatus === 'TRIGGERED_VIOLATION') {
    statusIcon = <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.25px]" />;
  } else if (boqStatus === 'SATISFIED_BY_FIX') {
    statusIcon = <CheckCircle2 className="w-4 h-4 text-blue-600 stroke-[2.25px]" />;
  }

  return (
    <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-all flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{statusIcon}</div>

      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {rule.ruleType || 'RULE'}
          </span>

          {rule.parentCategory && (
            <span className="text-[10px] font-semibold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">
              {rule.parentCategory} {rule.subCategory ? `> ${rule.subCategory}` : ''}
            </span>
          )}

          {rule.isStrict && (
            <span className="text-[10px] font-bold text-rose-900 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              STRICT HARD GATE
            </span>
          )}

          {boqStatus === 'TRIGGERED_VIOLATION' && (
            <span className="text-[10px] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-700 stroke-[2.25px]" />
              Active BOQ Non-Compliance Triggered
            </span>
          )}

          {boqStatus === 'SATISFIED_BY_FIX' && (
            <span className="text-[10px] font-bold text-blue-950 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-700 stroke-[2.25px]" />
              Satisfied by Candidate Fix
            </span>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-900 leading-relaxed">
          {rule.ruleText}
        </p>
      </div>
    </div>
  );
}

export default function RuleLogicVisualizer({ selectedChassis, evalResults, chassisName }) {
  const [rulesData, setRulesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeLevelFilter, setActiveLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({
    VENDOR: true,
    CHASSIS: true,
    CATEGORY: true,
    SUBCATEGORY: true,
    SKU: true
  });

  useEffect(() => {
    if (!selectedChassis) return;
    setLoading(true);
    fetch(`/api/catalog-rules?chassisDir=${encodeURIComponent(selectedChassis)}`)
      .then(res => res.json())
      .then(data => {
        setRulesData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching catalog rules:', err);
        setLoading(false);
      });
  }, [selectedChassis]);

  const toggleNode = (level) => {
    setExpandedNodes(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const parsedRules = rulesData?.parsedRules || [];
  const subcategoryConstraints = rulesData?.subcategoryConstraints || [];
  const visibleLevels = RULE_LEVELS.filter(lvl => activeLevelFilter === 'ALL' || activeLevelFilter === lvl);

  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200/80 pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-700 stroke-[2.25px]" />
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Scraped Catalog Rule Logic Visualizer (5-Level Hierarchy Tree)
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time tree visualization of Vendor, Chassis, Category, Subcategory, and SKU constraint rules for <span className="font-bold text-slate-800">{chassisName || selectedChassis || 'Selected Platform'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 stroke-[2.25px]" />
            {parsedRules.length + subcategoryConstraints.length} Scraped Rules Active
          </span>
          {rulesData?.isFallback && (
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
              Fallback Engine Mode
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 stroke-[2.25px]" />
          <input
            type="text"
            placeholder="Search rules by category, SKU keyword, TDP, socket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          {searchQuery && (
            <button
              aria-label="Close"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveLevelFilter('ALL')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              activeLevelFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Levels
          </button>
          {RULE_LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setActiveLevelFilter(lvl)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                activeLevelFilter === lvl
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center space-y-2">
          <GitBranch className="w-6 h-6 text-indigo-600 animate-spin mx-auto stroke-[2.25px]" />
          <p className="text-xs text-slate-600 font-medium">Parsing catalog rule graph from outputs...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleLevels.map(lvl => {
            const items = filterRulesForLevel(lvl, parsedRules, subcategoryConstraints, searchQuery);
            const meta = LEVEL_LABELS[lvl];
            const isExpanded = expandedNodes[lvl];

            if (searchQuery.trim() && items.length === 0) return null;

            return (
              <div key={lvl} className={`border rounded-xl transition-all ${meta.color}`}>
                <div
                  onClick={() => toggleNode(lvl)}
                  className="p-3.5 flex items-center justify-between cursor-pointer select-none border-b border-slate-200/60"
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-800 stroke-[2.25px]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-800 stroke-[2.25px]" />
                    )}
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-800 stroke-[2.25px]" />
                      <span className="font-extrabold text-xs text-slate-950 tracking-tight">
                        {meta.title}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                      {items.length} Rules
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 hidden md:block">
                    {meta.desc}
                  </p>
                </div>

                {isExpanded && (
                  <div className="p-3 bg-white/80 space-y-2 rounded-b-xl border-t border-slate-200/50">
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-500 italic px-2 py-1">
                        No scraped rules recorded at this level for current catalog query.
                      </p>
                    ) : (
                      items.map((r, idx) => (
                        <RuleNodeItem
                          key={idx}
                          rule={r}
                          boqStatus={checkRuleActiveInBoq(r.ruleText, evalResults)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
