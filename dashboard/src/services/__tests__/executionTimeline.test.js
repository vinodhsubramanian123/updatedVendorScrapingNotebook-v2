import { describe, expect, it } from 'vitest';
import { reduceTimeline } from '../executionTimeline';

const owned = (_, id) => id === 'owned';
const start = { type: 'TASK_STARTED', task: 'PRESALES_QUERY', runId: 'owned', startTime: 1234 };
describe('run-scoped execution timeline', () => {
  it('ignores other tabs and stale completions', () => {
    const run = reduceTimeline(null, start, owned);
    expect(reduceTimeline(run, { ...start, runId: 'other' }, owned)).toBe(run);
    expect(reduceTimeline(run, { type: 'TASK_COMPLETED', runId: 'old' }, owned)).toBe(run);
    expect(reduceTimeline(run, { type: 'PROGRESS', percent: 40, runId: 'owned' }, owned).percent).toBe(40);
  });
  it('replays scoped logs and correctly describes an interrupted run', () => {
    const run = reduceTimeline(null, {
      type: 'RUN_SNAPSHOT', latestTask: { ...start, status: 'INTERRUPTED' },
      logs: [{ runId: 'other', text: 'other session' }, { type: 'LOG', runId: 'owned', text: 'Routing' }]
    }, owned);
    expect(run.status).toBe('INTERRUPTED');
    expect(run.events.map(item => item.label)).toEqual(['Routing']);
  });
  it('retains tool and escalation events and reports cancelled separately', () => {
    const run = ['TOOL_CALL', 'TOOL_RESULT', 'ESCALATION', 'TASK_COMPLETED'].reduce((state, type) => reduceTimeline(state, {
      runId: 'owned', type, cancelled: type === 'TASK_COMPLETED'
    }, owned), reduceTimeline(null, { ...start, task: 'EVAL_BOQ' }, owned));
    expect(run.events.map(e => e.type)).toEqual(['TOOL_CALL','TOOL_RESULT','ESCALATION','TASK_COMPLETED']);
    expect(run.status).toBe('CANCELLED');
  });
});
