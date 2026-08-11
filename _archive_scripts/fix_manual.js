const fs = require('fs');

function addTooltipImport(content) {
  if (content.includes("import Tooltip")) return content;
  const lastImportIndex = content.lastIndexOf('import ');
  if (lastImportIndex !== -1) {
    const nextNewline = content.indexOf('\n', lastImportIndex);
    return content.slice(0, nextNewline) + "\nimport Tooltip from './Tooltip';" + content.slice(nextNewline);
  }
  return "import Tooltip from './Tooltip';\n" + content;
}

function processFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (let [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  if (content !== original) {
    content = addTooltipImport(content);
    fs.writeFileSync(file, content, 'utf8');
  }
}

processFile('dashboard/src/components/Header.jsx', [
  [
    /<button\s+onClick=\{\(\) => setSearchTerm\(''\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<X className="[^"]+" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => setSearchTerm(\'\')} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 transition-colors p-1"><X className="w-4 h-4" /></button></Tooltip>'
  ],
  [
    /<button\s+onClick=\{\(\) => setIsAiSearchOpen\(true\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<Sparkles className="[^"]+" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => setIsAiSearchOpen(true)} className="absolute right-10 top-2 text-purple-400 hover:text-purple-600 transition-colors p-1"><Sparkles className="w-4 h-4" /></button></Tooltip>'
  ],
  [
    /<button\s+onClick=\{\(\) => setIsAiSearchOpen\(false\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<X className="[^"]+" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => setIsAiSearchOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button></Tooltip>'
  ]
]);

processFile('dashboard/src/components/CatalogExplorer.jsx', [
  [
    /<button\s+onClick=\{\(\) => setShowOnlyChanges\(!showOnlyChanges\)\}\s+className=\{`[^`]+`\}\s+title="([^"]+)"\s*>\s*<Filter className="w-4 h-4" \/>\s*Only Changed\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => setShowOnlyChanges(!showOnlyChanges)} className={`btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 ${showOnlyChanges ? \'bg-indigo-50 text-indigo-700 border-indigo-200\' : \'\'}`}><Filter className="w-4 h-4" /> Only Changed</button></Tooltip>'
  ],
  [
    /<button\s+onClick=\{\(\) => handleAuditHistory\(sku\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<History className="w-3.5 h-3.5" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => handleAuditHistory(sku)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1"><History className="w-3.5 h-3.5" /></button></Tooltip>'
  ],
  [
    /<button\s+onClick=\{\(\) => handleViewPriceTrail\(sku\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<TrendingDown className="w-3.5 h-3.5" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => handleViewPriceTrail(sku)} className="text-slate-400 hover:text-emerald-600 transition-colors p-1"><TrendingDown className="w-3.5 h-3.5" /></button></Tooltip>'
  ]
]);

processFile('dashboard/src/components/ResolutionMatrix.jsx', [
  [
    /<button\s+onClick=\{\(\) => handleCopyList\(strategy\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*\{copiedRank === strategy\.rank \? <Check className="w-3 h-3 text-emerald-600" \/> : <Copy className="w-3 h-3" \/>\}\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => handleCopyList(strategy)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">{copiedRank === strategy.rank ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}</button></Tooltip>'
  ]
]);

processFile('dashboard/src/components/ScraperTriggerCard.jsx', [
  [
    /<button\s+onClick=\{exportLogs\}\s+disabled=\{logStream\.length === 0\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<Download className="w-3\.5 h-3\.5" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={exportLogs} disabled={logStream.length === 0} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-50"><Download className="w-3.5 h-3.5" /></button></Tooltip>'
  ]
]);

processFile('dashboard/src/components/ScrapingHistorySection.jsx', [
  [
    /<button\s+onClick=\{\(\) => handleViewTrace\(run\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<Terminal className="w-3\.5 h-3\.5" \/> Inspect Logs\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => handleViewTrace(run)} className="btn-primary text-[11px] py-1 px-2.5 h-auto"><Terminal className="w-3.5 h-3.5" /> Inspect Logs</button></Tooltip>'
  ]
]);

processFile('dashboard/src/components/TelemetryCard.jsx', [
  [
    /<div\s+className="[^"]+"\s+onClick=\{\(\) => setIsEvaluationsModalOpen\(true\)\}\s+title="([^"]+)"\s*>/g,
    '<Tooltip content="$1" className="w-full"><div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors w-full" onClick={() => setIsEvaluationsModalOpen(true)}>'
  ],
  [
    /<div\s+className="[^"]+"\s+onClick=\{\(\) => setIsConfidenceModalOpen\(true\)\}\s+title="([^"]+)"\s*>/g,
    '<Tooltip content="$1" className="w-full"><div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors w-full" onClick={() => setIsConfidenceModalOpen(true)}>'
  ],
  [
    /<div\s+className="[^"]+"\s+onClick=\{\(\) => setIsDeltasModalOpen\(true\)\}\s+title="([^"]+)"\s*>/g,
    '<Tooltip content="$1" className="w-full"><div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-purple-50 hover:border-purple-200 transition-colors w-full" onClick={() => setIsDeltasModalOpen(true)}>'
  ],
  [
    /<div\s+className="[^"]+"\s+onClick=\{\(\) => setIsViolationsModalOpen\(true\)\}\s+title="([^"]+)"\s*>/g,
    '<Tooltip content="$1" className="w-full"><div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors w-full" onClick={() => setIsViolationsModalOpen(true)}>'
  ],
  [
    /<div\s+className="[^"]+"\s+onClick=\{\(\) => setIsDurationModalOpen\(true\)\}\s+title="([^"]+)"\s*>/g,
    '<Tooltip content="$1" className="w-full"><div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full" onClick={() => setIsDurationModalOpen(true)}>'
  ]
]);

processFile('dashboard/src/components/SettingsDrawer.jsx', [
  [
    /<button\s+onClick=\{\(\) => handleRemoveMapping\(chassis\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<Trash2 className="w-4 h-4" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => handleRemoveMapping(chassis)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></Tooltip>'
  ]
]);

processFile('dashboard/src/components/RulesConfiguration.jsx', [
  [
    /<button\s+onClick=\{\(\) => setSearchQuery\(''\)\}\s+className="[^"]+"\s+title="([^"]+)"\s*>\s*<X className="w-4 h-4" \/>\s*<\/button>/g,
    '<Tooltip content="$1"><button onClick={() => setSearchQuery(\'\')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button></Tooltip>'
  ]
]);

// Since div replacement leaves dangling </div>, we need to fix TelemetryCard.jsx
let tc = fs.readFileSync('dashboard/src/components/TelemetryCard.jsx', 'utf8');
tc = tc.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '</div>\n          </div>\n        </Tooltip>');
// Wait, that's not reliable. Let's fix TelemetryCard separately.
