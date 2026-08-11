const fs = require('fs');
let content = fs.readFileSync('dashboard/server.cjs', 'utf8');

content = content.replace("  const XLSX = require('xlsx-js-style');", "");

if (!content.includes("const XLSX = require('xlsx-js-style');")) {
  content = content.replace("const express = require('express');", "const express = require('express');\nconst XLSX = require('xlsx-js-style');");
}

fs.writeFileSync('dashboard/server.cjs', content);
