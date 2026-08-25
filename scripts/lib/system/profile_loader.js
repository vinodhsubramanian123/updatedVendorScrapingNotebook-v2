'use strict';

const fs = require('fs');
const path = require('path');

const PROFILES_DIR = path.join(__dirname, '..', 'config', 'profiles');

/**
 * Loads the base default profile, and merges any product-specific override
 * based on the detected family and generation.
 * @param {string} family - Detected family (e.g. ProLiant)
 * @param {string} gen - Detected gen (e.g. Gen12)
 * @returns {Promise<object>} Merged profile object
 */
async function loadProfile(family, gen) {
  let defaultProfile = {};
  
  try {
    const defaultPath = path.join(PROFILES_DIR, 'default_profile.json');
    try {
      const stat = await fs.promises.stat(defaultPath);
      if (stat.isFile()) {
        defaultProfile = JSON.parse(await fs.promises.readFile(defaultPath, 'utf-8'));
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to load default_profile.json: ${err.message}`);
  }

  // Attempt to find a specific override profile based on family and gen
  let overrideProfile = {};
  try {
    let dirFiles = [];
    try {
      dirFiles = await fs.promises.readdir(PROFILES_DIR);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    if (dirFiles.length > 0) {
      const files = dirFiles.filter(f => f.endsWith('.json') && f !== 'default_profile.json');

      const fileReads = files.map(async file => {
        const filePath = path.join(PROFILES_DIR, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      });

      const profiles = await Promise.all(fileReads);

      for (const data of profiles) {
        const famMatch = data.family && family && data.family.toLowerCase() === family.toLowerCase();
        const genMatch = !data.gen || data.gen === '*' || (gen && data.gen.toLowerCase() === gen.toLowerCase());
        if (famMatch && genMatch) {
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

/**
 * Synchronous variant of loadProfile for legacy/synchronous utilities.
 */
const _profileCacheSync = new Map();

function _clearProfileCacheSync() {
  _profileCacheSync.clear();
}

function loadProfileSync(family, gen) {
  let defaultProfile = {};
  try {
    const defaultPath = path.join(PROFILES_DIR, 'default_profile.json');
    if (fs.existsSync(defaultPath)) {
      if (_profileCacheSync.has(defaultPath)) {
        defaultProfile = _profileCacheSync.get(defaultPath);
      } else {
        defaultProfile = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        _profileCacheSync.set(defaultPath, defaultProfile);
      }
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to load default_profile.json: ${err.message}`);
  }

  let overrideProfile = {};
  try {
    if (fs.existsSync(PROFILES_DIR)) {
      const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json') && f !== 'default_profile.json');
      for (const file of files) {
        const filePath = path.join(PROFILES_DIR, file);
        let data;
        if (_profileCacheSync.has(filePath)) {
          data = _profileCacheSync.get(filePath);
        } else {
          data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          _profileCacheSync.set(filePath, data);
        }
        const famMatch = data.family && family && data.family.toLowerCase() === family.toLowerCase();
        const genMatch = !data.gen || data.gen === '*' || (gen && data.gen.toLowerCase() === gen.toLowerCase());
        if (famMatch && genMatch) {
          overrideProfile = data;
          break;
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to parse profiles for overrides: ${err.message}`);
  }

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
  loadProfile,
  loadProfileSync,
  _clearProfileCacheSync
};
