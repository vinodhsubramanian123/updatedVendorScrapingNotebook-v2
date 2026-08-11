const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git')) {
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
  
  // Replace catch (e) { console.warn('Caught suppressed error in fix_suppressed.js:', e); }
  content = content.replace(/catch\s*\{\s*\}/g, "catch (e) { console.warn('Caught suppressed error in fix_suppressed.js:', e); }");
  // Replace catch (err) { console.warn('Caught suppressed error in fix_suppressed.js:', err); }
  content = content.replace(/catch\s*\(\s*err\s*\)\s*\{\s*\}/g, "catch (err) { console.warn('Caught suppressed error in fix_suppressed.js:', err); }");
  // Replace catch (_) { console.warn('Caught suppressed error in fix_suppressed.js:', _); }
  content = content.replace(/catch\s*\(\s*_\s*\)\s*\{\s*\}/g, "catch (_) { console.warn('Caught suppressed error in fix_suppressed.js:', _); }");
  // Replace catch (e) { console.warn('Caught suppressed error in fix_suppressed.js:', e); }
  content = content.replace(/catch\s*\(\s*e\s*\)\s*\{\s*\}/g, "catch (e) { console.warn('Caught suppressed error in fix_suppressed.js:', e); }");

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed empty catch in ' + file);
  }
});
