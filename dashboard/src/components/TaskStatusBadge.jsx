import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

/**
 * TaskStatusBadge Component
 * 
 * Provides consistent, highly visible status indicator badges for individual scraping & pipeline tasks.
 * Supported lifecycle states:
 * - 'Pending' / 'QUEUED' / 'IDLE': Amber/Slate theme with clock icon
 * - 'Running' / 'IN_PROGRESS': Blue theme with animated spinning loader
 * - 'Complete' / 'COMPLETED' / 'SUCCESS': Emerald green theme with check icon
 * - 'Failed' / 'ERROR': Rose red theme with X-circle icon
 */
export default function TaskStatusBadge({
  status = 'Pending',
  exitCode = null,
  size = 'md',
  showIcon = true,
  className = ''
}) {
  // Normalize status state
  let normalized = 'PENDING';

  if (typeof exitCode === 'number') {
    normalized = exitCode === 0 ? 'COMPLETE' : 'FAILED';
  } else if (status) {
    const s = String(status).toUpperCase();
    if (s.includes('RUN') || s.includes('PROGRESS') || s.includes('EXEC') || s.includes('ACTIVE')) {
      normalized = 'RUNNING';
    } else if (s.includes('COMPLET') || s.includes('PASS') || s.includes('SUCCESS') || s.includes('OK')) {
      normalized = 'COMPLETE';
    } else if (s.includes('FAIL') || s.includes('ERR') || s.includes('CANCEL') || s.includes('KILL')) {
      normalized = 'FAILED';
    } else if (s.includes('PEND') || s.includes('QUEUE') || s.includes('WAIT') || s.includes('IDLE')) {
      normalized = 'PENDING';
    }
  }

  // Configuration map for visual badge styling
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
    FAILED: {
      label: exitCode !== null && exitCode !== undefined && exitCode !== 0 ? `Failed (Code ${exitCode})` : 'Failed',
      bgClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      dotClass: 'bg-rose-500',
      icon: XCircle,
      iconClass: 'text-rose-600 dark:text-rose-400'
    }
  };

  const currentConfig = config[normalized] || config.PENDING;
  const IconComponent = currentConfig.icon;

  // Size styling classes
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold rounded-md border',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold rounded-lg border shadow-xs',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold rounded-xl border shadow-sm'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <span
      className={`inline-flex items-center justify-center transition-all ${sizeClasses[size] || sizeClasses.md} ${currentConfig.bgClass} ${className}`}
      title={`Task Lifecycle State: ${currentConfig.label}`}
    >
      {showIcon && (
        <IconComponent className={`${iconSizes[size] || iconSizes.md} ${currentConfig.iconClass} shrink-0`} />
      )}
      <span>{currentConfig.label}</span>
    </span>
  );
}
