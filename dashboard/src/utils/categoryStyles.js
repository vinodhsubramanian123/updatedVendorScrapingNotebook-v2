'use strict';
/**
 * dashboard/src/utils/categoryStyles.js — Centralized Category Styling
 *
 * Shared badge and pill styling across hardware category tags.
 */

export function getCategoryStyle(cat = '') {
  const c = String(cat).toLowerCase();
  if (c.includes('compute') || c.includes('cpu') || c.includes('processor')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (c.includes('memory') || c.includes('ram') || c.includes('dimm')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (c.includes('storage') || c.includes('drive') || c.includes('controller') || c.includes('cage')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (c.includes('network') || c.includes('ocp') || c.includes('adapter') || c.includes('nic')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  if (c.includes('power') || c.includes('psu') || c.includes('supply')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (c.includes('service') || c.includes('care') || c.includes('support') || c.includes('warranty')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}
