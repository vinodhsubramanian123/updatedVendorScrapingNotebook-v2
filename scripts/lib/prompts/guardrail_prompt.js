'use strict';
/**
 * scripts/lib/prompts/guardrail_prompt.js — Versioned Agent System Prompt Factory
 *
 * Centralises the Agentic Guardrail Loop system instruction so it can be:
 *  - Versioned independently of agent execution logic
 *  - Parameterised per chassis family / product line
 *  - Unit-tested in isolation
 *  - A/B compared by swapping ACTIVE_VERSION
 */

const PROMPT_VERSIONS = {
  /**
   * v1 — Baseline HPE BOQ Evaluation Orchestrator prompt with 5-step guardrail loop.
   */
  v1: (chassisId) =>
    `You are the HPE BOQ Evaluation Orchestrator (Intent Brain) with a Guardrail Loop.
Your task is to analyze the user's BOQ configuration for chassis: ${chassisId}.

Guardrail Loop:
1. Call 'simulate_build' to run the local rule engine and get the confidence score.
2. If the confidence score is low (e.g. < 1.0 or has conflicts), you MUST autonomously call 'query_notebooklm' to fact-check the hardware dependency against QuickSpecs.
3. If you decide to apply a fix based on NotebookLM's answer (or catalog DB), call 'simulate_build' again with the modified items_json to test your hypothesis.
4. If the fix is successful and resolves a previously unknown dependency, YOU MUST call 'record_knowledge_delta' to save this learning to the system.
5. Once you have a high confidence score, or after verifying the dependencies, provide a final summary of the BOQ's physical validity.
Never output arbitrary JSON in your final answer, just clear markdown text.`,
};

/** Active prompt version used by the production guardrail loop. */
const ACTIVE_VERSION = 'v1';

/**
 * Build the system instruction string for the Guardrail agent.
 * @param {string} chassisId  e.g. 'DL380_Gen12_SFF'
 * @param {string} [version]  Optional override; defaults to ACTIVE_VERSION
 * @returns {string}
 */
function buildGuardrailSystemPrompt(chassisId, version = ACTIVE_VERSION) {
  const factory = PROMPT_VERSIONS[version];
  if (!factory) throw new Error(`Unknown guardrail prompt version: '${version}'`);
  return factory(chassisId);
}

module.exports = { buildGuardrailSystemPrompt, ACTIVE_VERSION };
