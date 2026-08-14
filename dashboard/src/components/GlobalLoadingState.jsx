import React from 'react';
import { 
  Loader2, 
  Cpu, 
  Database, 
  Server, 
  Sparkles, 
  Zap, 
} from 'lucide-react';

/**
 * GlobalLoadingState Component
 * 
 * Renders global pending status overlays, progress steppers, and structural skeleton cards
 * utilizing the `.skeleton` animation class defined in `styles/index.css`.
 * 
 * Supports modes:
 * - `banner`: Active top processing banner with skeleton progress pulse
 * - `matrix`: Skeleton placeholder for the 5-Tier Strategic Resolution Matrix
 * - `catalog`: Skeleton placeholder for the Master Catalog Explorer
 * - `card`: Generic skeleton card layout
 * - `full`: Full dashboard page skeleton layout
 */
export default function GlobalLoadingState({
  isTaskRunning = false,
  isQueryingRag = false,
  isLoadingData = false,
  activeProgress = null,
  operationName = 'Heavy Operation in Progress',
  mode = 'banner',
  className = '',
  children
}) {
  const isProcessing = isTaskRunning || isQueryingRag || isLoadingData;

  // Determine primary display title and icon based on active operation
  let title = operationName;
  let subtitle = activeProgress?.detail || activeProgress?.action || 'Processing engine pipelines...';
  let IconComponent = Cpu;

  if (isQueryingRag) {
    title = 'Querying NotebookLM QuickSpecs RAG';
    subtitle = 'Synthesizing vendor documentation citations and grounding rule validations...';
    IconComponent = Sparkles;
  } else if (activeProgress?.task?.includes('SCRAPE') || operationName.includes('Scrape')) {
    title = 'HPE OCA Vendor Portal CDP Scraping';
    subtitle = activeProgress?.action || 'Connecting to Chrome CDP session and extracting live catalog SKUs...';
    IconComponent = Server;
  } else if (activeProgress?.task?.includes('EVAL') || operationName.includes('BOQ')) {
    title = 'Executing 6-Aspect Hardware Rule Engine';
    subtitle = activeProgress?.action || 'Auditing thermal TDP, memory channel math, and -48VDC power rules...';
    IconComponent = Zap;
  } else if (activeProgress?.task?.includes('REBUILD')) {
    title = 'Rebuilding Catalog & Constraint Graph';
    subtitle = activeProgress?.action || 'Re-synthesizing rule sets and generating catalog artifacts...';
    IconComponent = Database;
  }

  // Calculate percentage if available
  const currentStep = activeProgress?.currentStep || 0;
  const totalSteps = activeProgress?.totalSteps || 0;
  const percent = totalSteps > 0 
    ? Math.min(100, Math.round((currentStep / totalSteps) * 100))
    : (isTaskRunning ? 45 : isQueryingRag ? 70 : 0);

  // If not processing and mode is 'banner', render children or null
  if (!isProcessing && mode === 'banner') {
    return children ? <>{children}</> : null;
  }

  return (
    <div className={`space-y-4 ${className}`} id="global-loading-state-container">
      {/* 1. Global Processing Banner Overlay */}
      {isProcessing && mode !== 'catalog' && (
        <div 
          id="global-loading-banner"
          className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all animate-fade-in-up"
        >
          {/* Subtle Skeleton Pulsing Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Breathing Icon Badge */}
              <div className="p-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl animate-breathe shrink-0">
                <IconComponent className="w-6 h-6 text-blue-400 animate-spin-slow" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {title}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-300 border border-blue-400/30">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-300" />
                    Processing
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-mono">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Right Side Stats / Progress */}
            <div className="flex items-center gap-4 text-xs font-mono">
              {totalSteps > 0 && (
                <div className="text-slate-300 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg">
                  Step <strong className="text-blue-400">{currentStep}</strong> / {totalSteps}
                </div>
              )}
              <div className="text-white font-bold text-base bg-blue-900/40 border border-blue-500/30 px-3 py-1 rounded-lg">
                {percent}%
              </div>
            </div>
          </div>

          {/* Animated Progress Bar using Skeleton styling */}
          <div className="mt-4 relative">
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700 p-0.5">
              <div 
                className={`h-full rounded-full progress-bar-fill relative overflow-hidden ${isProcessing ? 'animate-stripes bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400'}`}
                style={{ width: `${Math.max(percent, 8)}%` }}
              >
                <div className="absolute inset-0 bg-white/10 animate-breathe" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Skeleton Wireframe Layouts */}
      {(mode === 'full' || mode === 'matrix' || mode === 'catalog' || (isProcessing && mode === 'banner')) && (
        <div id="skeleton-wireframe-grid" className="space-y-4 pt-2">
          {/* Skeleton Section Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <div className="skeleton h-5 w-48 rounded-md" />
              <div className="skeleton h-4 w-20 rounded-full" />
            </div>
            <div className="skeleton h-4 w-32 rounded-md" />
          </div>

          {/* Skeleton Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="glass-card p-5 space-y-3 border border-slate-200/80">
              <div className="flex justify-between items-center">
                <div className="skeleton h-4 w-28 rounded-md" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-8 w-full rounded-lg" />
              <div className="space-y-2 pt-2">
                <div className="skeleton h-3 w-3/4 rounded-sm" />
                <div className="skeleton h-3 w-1/2 rounded-sm" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="skeleton h-4 w-20 rounded-md" />
                <div className="skeleton h-4 w-12 rounded-md" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-card p-5 space-y-3 border border-slate-200/80">
              <div className="flex justify-between items-center">
                <div className="skeleton h-4 w-32 rounded-md" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-8 w-full rounded-lg" />
              <div className="space-y-2 pt-2">
                <div className="skeleton h-3 w-5/6 rounded-sm" />
                <div className="skeleton h-3 w-2/3 rounded-sm" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="skeleton h-4 w-24 rounded-md" />
                <div className="skeleton h-4 w-14 rounded-md" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-card p-5 space-y-3 border border-slate-200/80">
              <div className="flex justify-between items-center">
                <div className="skeleton h-4 w-24 rounded-md" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-8 w-full rounded-lg" />
              <div className="space-y-2 pt-2">
                <div className="skeleton h-3 w-4/5 rounded-sm" />
                <div className="skeleton h-3 w-1/3 rounded-sm" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="skeleton h-4 w-20 rounded-md" />
                <div className="skeleton h-4 w-16 rounded-md" />
              </div>
            </div>
          </div>

          {/* Detailed Table Skeleton Row */}
          <div className="glass-card p-5 space-y-3 border border-slate-200/80">
            <div className="skeleton h-5 w-56 rounded-md mb-2" />
            <div className="space-y-2">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-8 w-8 rounded-lg shrink-0" />
                    <div className="space-y-1">
                      <div className="skeleton h-3.5 w-40 rounded-sm" />
                      <div className="skeleton h-2.5 w-28 rounded-sm" />
                    </div>
                  </div>
                  <div className="skeleton h-6 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isProcessing && children}
    </div>
  );
}
