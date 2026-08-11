const fs = require('fs');
let content = fs.readFileSync('dashboard/src/App.jsx', 'utf8');
content = content.replace(/clearInterval\(pollInterval\);\s+pollIntervalsRef\.current\.delete\(pollInterval\);\s+pollIntervalsRef\.current\.delete\(pollInterval\);/g, 'clearInterval(pollInterval);\n                      pollIntervalsRef.current.delete(pollInterval);');

content = content.replace(/clearInterval\(matrixPoll\);\s+pollIntervalsRef\.current\.delete\(matrixPoll\);/g, 'clearInterval(matrixPoll);\n                      pollIntervalsRef.current.delete(matrixPoll);');
content = content.replace(/clearInterval\(matrixPoll\);\s+const finalAns/g, 'clearInterval(matrixPoll);\n                      pollIntervalsRef.current.delete(matrixPoll);\n                      const finalAns');
content = content.replace(/clearInterval\(matrixPoll\);\s+setEvalResults/g, 'clearInterval(matrixPoll);\n                      pollIntervalsRef.current.delete(matrixPoll);\n                      setEvalResults');

content = content.replace(/clearInterval\(pollInterval\);\s+const finalData/g, 'clearInterval(pollInterval);\n                      pollIntervalsRef.current.delete(pollInterval);\n                      const finalData');
content = content.replace(/clearInterval\(pollInterval\);\s+setRagData/g, 'clearInterval(pollInterval);\n                      pollIntervalsRef.current.delete(pollInterval);\n                      setRagData');


fs.writeFileSync('dashboard/src/App.jsx', content);
