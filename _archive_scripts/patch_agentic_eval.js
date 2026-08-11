const fs = require('fs');

let content = fs.readFileSync('scripts/agentic_eval.js', 'utf8');

// Add a sleep function
content = content.replace(
  "const { queryLocalKnowledgeBase } = require('./lib/local_rag_search.js');",
  "const { queryLocalKnowledgeBase } = require('./lib/local_rag_search.js');\nconst sleep = ms => new Promise(r => setTimeout(r, ms));"
);

// Add retry logic for sendMessage
const retryBlock = `
    let retryCount = 0;
    while (true) {
      try {
        response = await chat.sendMessage({ message: toolResponses });
        break;
      } catch (err) {
        if (err.status === 429 && retryCount < 3) {
          console.warn('⚠️ Rate limit hit. Waiting 15s before retrying...');
          await sleep(15000);
          retryCount++;
        } else {
          throw err;
        }
      }
    }
`;

content = content.replace(
  "response = await chat.sendMessage({ message: toolResponses });",
  retryBlock
);

fs.writeFileSync('scripts/agentic_eval.js', content);
