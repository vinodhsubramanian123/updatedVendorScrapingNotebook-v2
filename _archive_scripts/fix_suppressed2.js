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
  
  // In frontend code, we cannot use __filename
  const isFrontend = file.includes('dashboard/');
  const errorContext = isFrontend ? 'a component' : "' + __filename + '";
  
  // Replace the previously injected wrong code
  content = content.replace(/catch\s*\(\w*\)\s*\{\s*console\.error\('Error in '\s*\+\s*__filename\s*\+\s*':',\s*\w*\);\s*\}/g, (match) => {
      // Find the parameter used in catch
      const matchErr = match.match(/catch\s*\(\s*(\w*)\s*\)/);
      const errName = matchErr ? matchErr[1] : 'e';
      return `catch (${errName}) { console.warn('Caught suppressed error in ${path.basename(file)}:', ${errName}); }`;
  });
  
  // Also handle any remaining empty catches properly
  content = content.replace(/catch\s*\{\s*\}/g, `catch (e) { console.warn('Caught suppressed error in ${path.basename(file)}:', e); }`);
  content = content.replace(/catch\s*\(\s*err\s*\)\s*\{\s*\}/g, `catch (err) { console.warn('Caught suppressed error in ${path.basename(file)}:', err); }`);
  content = content.replace(/catch\s*\(\s*_\s*\)\s*\{\s*\}/g, `catch (_) { console.warn('Caught suppressed error in ${path.basename(file)}:', _); }`);
  content = content.replace(/catch\s*\(\s*e\s*\)\s*\{\s*\}/g, `catch (e) { console.warn('Caught suppressed error in ${path.basename(file)}:', e); }`);


  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed __filename and empty catch in ' + file);
  }
});
