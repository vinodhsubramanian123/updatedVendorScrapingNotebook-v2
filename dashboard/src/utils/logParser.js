'use strict';
/**
 * dashboard/src/utils/logParser.js — Standardized SSE / Pipeline Log Parser
 *
 * Normalizes string & structured JSON logs into leveled, formatted entries.
 */

export function parseLogStream(logStream = []) {
  return logStream.map((logObj, idx) => {
    const logStr = typeof logObj === 'object' && logObj !== null ? (logObj.text || '') : String(logObj);
    const match = logStr.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      const isSystem = match[2].includes('SYSTEM') || match[2].includes('START');
      const isError = match[2].includes('ERROR') || match[2].includes('FAIL') || match[2].includes('❌');
      const isSuccess = match[2].includes('SUCCESS') || match[2].includes('DONE') || match[2].includes('✅') || match[2].includes('PASS');
      const level = isError ? 'WARN' : isSuccess ? 'SUCCESS' : isSystem ? 'SYSTEM' : 'INFO';
      return { id: `log-${idx}`, timestamp: match[1], stage: 'PIPELINE', level, message: match[2] };
    }
    return {
      id: `log-${idx}`,
      timestamp: new Date().toISOString().substring(11, 23),
      stage: 'PIPELINE',
      level: 'INFO',
      message: logStr
    };
  });
}
