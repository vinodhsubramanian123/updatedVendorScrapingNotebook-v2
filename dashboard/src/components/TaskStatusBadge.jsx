import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, Ban } from 'lucide-react';

const STATUS_PATTERNS = [
  { state: 'CANCELLED', tokens: ['CANCEL', 'KILL', 'ABORT'] },
  { state: 'INTERRUPTED', tokens: ['INTERRUPT', 'RESTART'] },
  { state: 'ACTION_REQUIRED', tokens: ['ACTION_REQUIRED', 'CLARIF', 'BLOCKED'] },
  { state: 'RUNNING', tokens: ['RUN', 'PROGRESS', 'EXEC', 'ACTIVE'] },
  { state: 'COMPLETE', tokens: ['COMPLET', 'PASS', 'SUCCESS', 'OK'] },
  { state: 'FAILED', tokens: ['FAIL', 'ERR'] },
  { state: 'PENDING', tokens: ['PEND', 'QUEUE', 'WAIT', 'IDLE'] }
];

function normalizeTaskStatus(status, exitCode) {
  if (status) {
    const s = String(status).toUpperCase();
    const explicit = STATUS_PATTERNS.find(entry => entry.state !== 'PENDING' && entry.tokens.some(t => s.includes(t)));
    if (explicit) return explicit.state;
  }
  if (typeof exitCode === 'number') {
    return exitCode === 0 ? 'COMPLETE' : 'FAILED';
  }
  if (!status) return 'PENDING';
  const s = String(status).toUpperCase();
  const match = STATUS_PATTERNS.find(entry => entry.tokens.some(t => s.includes(t)));
  return match ? match.state : 'PENDING';
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold rounded-md border',
  md: 'text-xs px-2.5 py-1 gap-1.5 font-bold rounded-lg border shadow-xs',
  lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold rounded-xl border shadow-sm'
};

const ICON_SIZES = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4'
};

/**
 * TaskStatusBadge Component
 *
 * Provides consistent, highly visible status indicator badges for individual scraping & pipeline tasks.
 */
export default function TaskStatusBadge({
  status = 'Pending',
  exitCode = null,
  size = 'md',
  showIcon = true,
  className = ''
}) {
  const normalized = normalizeTaskStatus(status, exitCode);
  const hasNonZeroExit = exitCode !== null && exitCode !== undefined && exitCode !== 0;

  const config = {
    PENDING: {
      label: 'Pending',
      bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      dotClass: 'bg-amber-500 animate-pulse',
      icon: Clock,
      iconClass: 'text-amber-600 dark:text-amber-400'
    },
    RUNNING: {
      label: 'Running',
      bgClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 ring-1 ring-blue-500/20',
      dotClass: 'bg-blue-500 animate-ping',
      icon: Loader2,
      iconClass: 'text-blue-600 dark:text-blue-400 animate-spin'
    },
    COMPLETE: {
      label: 'Complete',
      bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600 dark:text-emerald-400'
    },
    ACTION_REQUIRED: {
      label: 'Action Required',
      bgClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
      dotClass: 'bg-amber-500',
      icon: AlertTriangle,
      iconClass: 'text-amber-600 dark:text-amber-400'
    },
    INTERRUPTED: {
      label: 'Interrupted',
      bgClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
      dotClass: 'bg-amber-500',
      icon: AlertTriangle,
      iconClass: 'text-amber-600 dark:text-amber-400'
    },
    CANCELLED: {
      label: 'Cancelled',
      bgClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/40',
      dotClass: 'bg-slate-500',
      icon: Ban,
      iconClass: 'text-slate-600 dark:text-slate-400'
    },
    FAILED: {
      label: hasNonZeroExit ? `Failed (Code ${exitCode})` : 'Failed',
      bgClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      dotClass: 'bg-rose-500',
      icon: XCircle,
      iconClass: 'text-rose-600 dark:text-rose-400'
    }
  };

  const currentConfig = config[normalized] || config.PENDING;
  const IconComponent = currentConfig.icon;

  return (
    <span
      className={`inline-flex items-center justify-center transition-all ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${currentConfig.bgClass} ${className}`}
      title={`Task Lifecycle State: ${currentConfig.label}`}
    >
      {showIcon && (
        <IconComponent className={`${ICON_SIZES[size] || ICON_SIZES.md} ${currentConfig.iconClass} shrink-0`} />
      )}
      <span>{currentConfig.label}</span>
    </span>
  );
}
