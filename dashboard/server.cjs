'use strict';
/**
 * dashboard/server.cjs — HPE OCA Catalog Intelligence Express Server Bridge
 *
 * REFACTORED: This file is now a thin orchestrator that:
 *   1. Sets up Express middleware
 *   2. Mounts all route modules (routes/)
 *   3. Wires cross-cutting concerns (catalog cache invalidation on task completion)
 *   4. Starts the server with Vite dev middleware or static asset serving
 *
 * All route logic lives in:
 *   routes/sse.cjs         — SSE stream
 *   routes/catalogs.cjs    — Catalog discovery, price analytics, history
 *   routes/tasks.cjs       — Scrape, rebuild, sync, kill-task
 *   routes/evaluation.cjs  — BOQ upload, preprocess, eval, export
 *   routes/notebook.cjs    — NotebookLM RAG, HITL, feedback
 *
 * All shared services live in:
 *   services/taskManager.cjs  — Mutex, broadcastSSE, startTask
 *   services/pathGuard.cjs    — assertSafePath (unified path security)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });

const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const TEMP_DIR = path.join(OUTPUTS_DIR, 'temp');
const HISTORY_DIR = path.join(OUTPUTS_DIR, 'history');

// Ensure required output directories exist at startup
[OUTPUTS_DIR, TEMP_DIR, HISTORY_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Services ─────────────────────────────────────────────────────────────────
const { getActiveTask, onTaskCompleted } = require('./services/taskManager.cjs');

// ── Route Modules ─────────────────────────────────────────────────────────────
const sseRouter = require('./routes/sse.cjs');
const catalogsRouter = require('./routes/catalogs.cjs');
const tasksRouter = require('./routes/tasks.cjs');
const evaluationRouter = require('./routes/evaluation.cjs');
const notebookRouter = require('./routes/notebook.cjs');

// ── GAP-2: Invalidate catalog cache cleanly via lifecycle listener ───────────
const { invalidateCatalogCache } = catalogsRouter;
onTaskCompleted(() => {
  invalidateCatalogCache();
});

// ── Express App ───────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static artifacts (JSON, TSV, PDF, Excel) securely
app.use('/artifacts', express.static(OUTPUTS_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.xlsx') || filePath.endsWith('.csv')) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// Serve Architecture Diagrams Viewer
const DIAGRAMS_DIR = path.resolve(__dirname, '..', 'diagrams');
app.use('/diagrams', express.static(DIAGRAMS_DIR));

// ── Mount Route Modules ───────────────────────────────────────────────────────
app.use('/api', sseRouter);
app.use('/api', catalogsRouter);
app.use('/api', tasksRouter);
app.use('/api', evaluationRouter);
app.use('/api', notebookRouter);


// ── Health Check Endpoint ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const activeTask = getActiveTask();
  res.json({
    status: 'OK',
    isTaskRunning: !!activeTask,
    activeTask: activeTask ? { type: activeTask.type, runId: activeTask.runId } : null,
    timestamp: new Date().toISOString()
  });
});

// ── Centralized JSON Error Handler (SMELL-S3) ─────────────────────────────────
const { sendErrorResponse } = require('./services/errorHandler.cjs');
app.use('/api', (err, req, res, next) => {
  console.error('Unhandled Server Error on API route:', err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.message?.startsWith('HTTP 403') ? 403 : 500);
  sendErrorResponse(res, status, err, { source: 'SERVER_BRIDGE_ERROR' });
});

// ── Vite Dev Middleware or Static Production Build ───────────────────────────
async function initAndStartServer() {
  const distPath = path.resolve(__dirname, 'dist');

  if (fs.existsSync(distPath)) {
    console.log(`📦 Serving production build from: ${distPath}`);
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/artifacts')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      console.log(`⚡ Initializing Vite dev middleware from: ${__dirname}`);
      const { createServer: createViteServer } = require('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
        root: __dirname
      });
      app.use(vite.middlewares);
      app.use(async (req, res, next) => {
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/artifacts')) return next();
        try {
          const indexPath = path.resolve(__dirname, 'index.html');
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (viteErr) {
      console.warn('Vite middleware initialization warning:', viteErr.message);
    }
  }

  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`⚡ HPE OCA Dashboard Server Bridge running on http://127.0.0.1:${PORT}`);
    console.log(`📁 Static artifacts served from: ${OUTPUTS_DIR}`);
  });

  // Graceful shutdown — prevent zombie processes on SIGTERM
  const shutdown = () => {
    const activeTask = getActiveTask();
    if (activeTask?.process) {
      try { activeTask.process.kill('SIGTERM'); } catch (_) {}
    }
    server.close(() => {
      console.log('⚡ Dashboard server shut down cleanly.');
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', () => process.emit('SIGTERM'));
}

initAndStartServer();
