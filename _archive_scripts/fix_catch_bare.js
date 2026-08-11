const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(process.cwd());

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace catch (e) { console.warn('Caught suppressed error in fix_catch_bare.js:', e);
content = content.replace(/catch\s*\{\s*/g, (match) => {
      return `catch (e) { console.warn('Caught suppressed error in ${path.basename(file)}:', e);\n`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed bare catch in ' + file);
  }
});
