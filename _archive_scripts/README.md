# Archive Scripts

This directory contains **deprecated one-time fix and patch scripts** from the development history of the HPE OCA Catalog Intelligence Pipeline.

## Purpose
These scripts were used during active development to perform targeted fixes such as:
- Resolving import errors and unused variable warnings
- Patching specific component files (App.jsx, Header, ResolutionMatrix, etc.)
- Fixing telemetry and catch block issues
- One-time chassis map corrections

## Status
**Safe to delete.** These scripts are no longer needed for regular operation. They are kept for audit trail and historical reference only.

## Contents
- `fix_*.js` — One-time automated fixers for lint/import/catch issues
- `patch_*.js` — Targeted patches for specific components or scripts
- `replace_titles*.js` — Title/text replacement utilities
- `temp*.json` / `temp_output.txt` — Temporary working files (can be deleted)

> **Do NOT run these scripts** unless you understand exactly what they modify. They contain hardcoded file paths and string replacements from specific points in the development timeline.
