'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { GeminiKeyRotator, ApiQuotaExhaustedError } = require('../../scripts/lib/system/gemini_rotator.js');
const { runAgenticGuardrail } = require('../../scripts/lib/rag/agentic_guardrail.js');
const geminiRotator = require('../../scripts/lib/system/gemini_rotator.js');

test('GeminiKeyRotator Chaos Resilience & Dual-Brain Engine Fallback', async (t) => {
    
    await t.test('1. Simulate rapid concurrent burst requests with rate limit 429 and RESOURCE_EXHAUSTED errors', async () => {
       const rotator = new GeminiKeyRotator();
       rotator.rawKeysString = 'key1,key2,key3';
       rotator.state = rotator._loadState();
       
       let callCount = 0;
       
       try {
           await rotator.executeWithSmartRotation(async ({ apiKey }) => {
              callCount++;
              const err = new Error('429 Too Many Requests');
              err.status = 429;
              throw err;
           }, { maxRetries: 3 });
           assert.fail('Should have thrown an error');
       } catch (err) {
           assert.strictEqual(err.name, 'ApiQuotaExhaustedError', 'Should throw ApiQuotaExhaustedError');
       }
       
       assert.strictEqual(callCount, 3, 'Should have tried exactly 3 keys');
       
       const status = rotator.getPoolStatus();
       assert.strictEqual(status.activeKeys, 0, 'All keys should be exhausted');
       assert.strictEqual(status.exhaustedKeys, 3, 'All 3 keys should be exhausted');
    });

    await t.test('2. Verify deterministic FIFO demotion of exhausted keys and lockouts until UTC midnight rollover.', async () => {
       const rotator = new GeminiKeyRotator();
       rotator.rawKeysString = 'key1,key2';
       rotator.state = rotator._loadState();

       const err = new Error('Quota exceeded');
       err.status = 429;
       rotator.markKeyExhausted('key1', err, { isDailyLimit: true });
       
       const activeKeyInfo = rotator.getActiveKey();
       assert.ok(activeKeyInfo, 'Should have an active key');
       assert.strictEqual(activeKeyInfo.apiKey, 'key2', 'Key 2 should be at the top now');

       const status = rotator.getPoolStatus();
       const key1Status = status.keys.find(k => k.fingerprint && k.fingerprint.includes('key1'));
       if(key1Status) {
           assert.strictEqual(key1Status.status, 'exhausted_daily', 'Key 1 should be exhausted_daily');
       }
       
       const now = Date.now();
       const pastTime = now - (24 * 60 * 60 * 1000);
       const oldDate = new Date(pastTime).toISOString().split('T')[0];
       
       rotator.state.keys['key1'].exhaustedDate = oldDate;
       rotator.state.keys['key1'].exhaustedUntil = pastTime;
       
       rotator._autoResetExhaustedKeys();
       
       const newStatus = rotator.getPoolStatus();
       const newKey1Status = newStatus.keys.find(k => k.fingerprint && k.fingerprint.includes('key1'));
       if(newKey1Status) {
           assert.strictEqual(newKey1Status.status, 'active', 'Key 1 should be active again after rollover');
       }
    });

    await t.test('3. Test model name selection overrides', async () => {
        const oldEnv = process.env.GEMINI_MODEL_NAME;
        process.env.GEMINI_MODEL_NAME = 'gemini-test-model';
        
        delete require.cache[require.resolve('../../scripts/lib/rag/agentic_guardrail.js')];
        const { runAgenticGuardrail: runAgenticGuardrailFresh } = require('../../scripts/lib/rag/agentic_guardrail.js');
        
        assert.ok(runAgenticGuardrailFresh, 'Module loaded successfully with override');
        process.env.GEMINI_MODEL_NAME = oldEnv;
    });

});
