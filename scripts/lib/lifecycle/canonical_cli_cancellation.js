'use strict';
// Private CLI-only bridge. Programmatic callers continue to own their signals.
async function runCliPipeline(options, pipeline, channel = process) {
  if (channel.env.PRESALES_TERMINAL_OWNER !== '1') return pipeline(options);
  const controller = new AbortController();
  let cleaned = false;
  const onMessage = message => {
    if (message?.type === 'PRESALES_CANCEL' && !controller.signal.aborted) controller.abort(message.reason);
  };
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try { channel.removeListener('message', onMessage); } catch { /* Cleanup cannot replace the primary outcome. */ }
    try { if (channel.connected) channel.disconnect(); } catch { /* Attempt IPC release independently; preserve the primary outcome. */ }
  };
  channel.on('message', onMessage);
  try {
    if (channel.connected) channel.send({ type: 'PRESALES_CANCELLATION_READY' }, () => {});
    return await pipeline({ ...options, signal: controller.signal });
  } finally {
    cleanup();
  }
}

module.exports = { runCliPipeline };
