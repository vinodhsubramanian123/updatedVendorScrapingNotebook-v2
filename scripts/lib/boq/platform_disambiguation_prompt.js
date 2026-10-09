'use strict';

function formatDisambiguationPrompt(routedResponse, queryText = '') {
  if (!routedResponse?.hitlRequired || !routedResponse.ambiguityDetails) return null;
  const { candidates = [], error, chassisKey } = routedResponse.ambiguityDetails;
  const candidateList = Array.isArray(candidates) ? [...new Set(candidates.filter(c => typeof c === 'string' && c.trim()))] : [];
  return {
    question: `Ambiguity detected for "${queryText || routedResponse.query || 'this configuration'}": ${error || 'Multiple product generations match'}. Which platform would you like to target?`,
    options: candidateList.map(c => c.replace(/_/g, ' ')),
    is_multi_select: false,
    rawCandidates: candidateList,
    chassisKey
  };
}

function parseDisambiguationChoice(selectedOption = '', candidateList = []) {
  if (typeof selectedOption !== 'string' || !Array.isArray(candidateList)) return null;
  const clean = value => value.toLowerCase().replace(/^\(recommended\)\s*/i, '').replace(/^hpe\s+(?:proliant\s+)?/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const selected = clean(selectedOption);
  const matches = [...new Set(candidateList.filter(c => typeof c === 'string' && clean(c) === selected))];
  return matches.length === 1 ? matches[0] : null;
}

module.exports = {
  formatDisambiguationPrompt,
  parseDisambiguationChoice
};
