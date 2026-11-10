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

module.exports = router;
