'use strict';
/**
 * dashboard/routes/sse.cjs — Server-Sent Events Route
 *
 * Owns the /api/stream-logs endpoint. Delegates client registration to
 * taskManager so all SSE broadcasts go through one channel.
 */

const express = require('express');
const router = express.Router();
const { addSseClient, removeSseClient, getRunSnapshot } = require('../services/taskManager.cjs');

router.get('/stream-logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addSseClient(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Active' })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'RUN_SNAPSHOT', ...getRunSnapshot() })}\n\n`);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);

  req.on('close', () => { clearInterval(heartbeat); removeSseClient(res); });
});

router.get('/run-snapshot', (req, res) => res.json(getRunSnapshot()));

router.get(['/run/:runId', '/runs/:runId'], (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const { isValidRunId, getRunById } = require('../services/runState.cjs');
  const { runId } = req.params;
  if (!isValidRunId(runId)) {
    return res.status(400).json({ error: 'Invalid run ID format', code: 'INVALID_RUN_ID', runId });
  }
  let run = getRunById(runId);
  const tracePath = path.join(__dirname, '..', '..', 'outputs', 'history', 'runs', `${runId}.json`);
  if (fs.existsSync(tracePath)) {
    try {
      const trace = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
      if (!run) {
        run = {
          runId,
          task: trace.taskType || null,
          product: trace.product || null,
          startTime: trace.startTime,
          durationMs: trace.durationMs,
          exitCode: trace.exitCode,
          status: trace.status || (trace.exitCode === 0 ? 'COMPLETED' : 'FAILED'),
          logs: trace.logs || []
        };
      } else if ((!Array.isArray(run.logs) || run.logs.length === 0) && Array.isArray(trace.logs)) {
        run = { ...run, logs: trace.logs };
      }
    } catch (_) {}
  }
  if (!run) return res.status(404).json({ error: 'Run not found', runId });
  res.json({ run, ...run });
});

module.exports = router;
