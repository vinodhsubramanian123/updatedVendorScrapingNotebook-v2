'use strict';
/**
 * dashboard/routes/sse.cjs — Server-Sent Events Route
 *
 * Owns the /api/stream-logs endpoint. Delegates client registration to
 * taskManager so all SSE broadcasts go through one channel.
 */

const express = require('express');
const router = express.Router();
const { addSseClient, removeSseClient } = require('../services/taskManager.cjs');

router.get('/stream-logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addSseClient(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Active' })}\n\n`);

  req.on('close', () => removeSseClient(res));
});

module.exports = router;
