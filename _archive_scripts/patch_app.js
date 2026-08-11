const fs = require('fs');
let content = fs.readFileSync('dashboard/src/App.jsx', 'utf8');

if (!content.includes('const pollIntervalsRef = useRef(new Set());')) {
  content = content.replace(
    '  const [globalSearchTerm, setGlobalSearchTerm] = useState(\'\');',
    '  const [globalSearchTerm, setGlobalSearchTerm] = useState(\'\');\n  const pollIntervalsRef = useRef(new Set());\n\n  useEffect(() => {\n    const intervals = pollIntervalsRef.current;\n    return () => {\n      intervals.forEach(clearInterval);\n    };\n  }, []);'
  );
}

content = content.replace(/const matrixPoll = setInterval\(/g, 'const matrixPoll = setInterval(');
content = content.replace(/const pollInterval = setInterval\(/g, 'const pollInterval = setInterval(');

// Actually, I can just do:
content = content.replace(/const matrixPoll = setInterval\(/g, 'const matrixPoll = setInterval(');
content = content.replace(/let polls = 0;/g, 'let polls = 0;');

// Let's use string replacement to add to ref.
content = content.replace(
  'const matrixPoll = setInterval(async () => {',
  'const matrixPoll = setInterval(async () => {\n                    pollIntervalsRef.current.add(matrixPoll);'
);
content = content.replace(
  'clearInterval(matrixPoll);',
  'clearInterval(matrixPoll);\n                      pollIntervalsRef.current.delete(matrixPoll);'
);
content = content.replace(
  'clearInterval(matrixPoll);',
  'clearInterval(matrixPoll);\n                        pollIntervalsRef.current.delete(matrixPoll);'
);

content = content.replace(
  'const pollInterval = setInterval(async () => {',
  'const pollInterval = setInterval(async () => {\n        pollIntervalsRef.current.add(pollInterval);'
);
content = content.replace(
  'clearInterval(pollInterval);',
  'clearInterval(pollInterval);\n          pollIntervalsRef.current.delete(pollInterval);'
);
content = content.replace(
  'clearInterval(pollInterval);',
  'clearInterval(pollInterval);\n            pollIntervalsRef.current.delete(pollInterval);'
);

fs.writeFileSync('dashboard/src/App.jsx', content);
