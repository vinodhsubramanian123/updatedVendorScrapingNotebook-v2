'use strict';

const fs = require('fs');
const path = require('path');

const PROFILES_DIR = path.join(__dirname, '..', 'config', 'profiles');

/**
 * Loads the base default profile, and merges any product-specific override
 * based on the detected family and generation.
 * @param {string} family - Detected family (e.g. ProLiant)
 * @param {string} gen - Detected gen (e.g. Gen12)
 * @returns {object} Merged profile object
 */
function loadProfile(family, gen) {
  let defaultProfile = {};
  
  try {
    const defaultPath = path.join(PROFILES_DIR, 'default_profile.json');
    if (fs.existsSync(defaultPath)) {
      defaultProfile = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to load default_profile.json: ${err.message}`);
  }

  // Attempt to find a specific override profile based on family and gen
  let overrideProfile = {};
  try {
    if (fs.existsSync(PROFILES_DIR)) {
      const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json') && f !== 'default_profile.json');
      for (const file of files) {
        const filePath = path.join(PROFILES_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        if (data.family === family && data.gen === gen) {
          overrideProfile = data;
          break;
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to parse profiles for overrides: ${err.message}`);
  }

  // Deep merge component mapping, overriding defaults
  const mergedMapping = { ...(defaultProfile.component_mapping || {}) };
  if (overrideProfile.component_mapping) {
    for (const [category, keywords] of Object.entries(overrideProfile.component_mapping)) {
      if (!mergedMapping[category]) mergedMapping[category] = [];
      mergedMapping[category] = Array.from(new Set([...mergedMapping[category], ...keywords]));
    }
  }

  return {
    scraping_tuning: {
      ...(defaultProfile.scraping_tuning || {}),
      ...(overrideProfile.scraping_tuning || {})
    },
    component_mapping: mergedMapping
  };
}

module.exports = {
  loadProfile
};
