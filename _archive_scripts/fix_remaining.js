const fs = require('fs');
let content = fs.readFileSync('dashboard/src/components/Header.jsx', 'utf8');

content = content.replace(/<button([^>]+)title="Clear search"([^>]*)>([\s\S]*?)<\/button>/g, '<Tooltip content="Clear search"><button$1$2>$3</button></Tooltip>');
content = content.replace(/<button([^>]+)title="Expand for Complex Multi-sentence \/ Natural Language Query Workspace"([^>]*)>([\s\S]*?)<\/button>/g, '<Tooltip content="Expand for Complex Multi-sentence / Natural Language Query Workspace"><button$1$2>$3</button></Tooltip>');
content = content.replace(/<button([^>]+)title="Close search popover \(Esc\)"([^>]*)>([\s\S]*?)<\/button>/g, '<Tooltip content="Close search popover (Esc)"><button$1$2>$3</button></Tooltip>');

// Wait, I messed up Header.jsx before with sed
// Let's just restore Header.jsx from git? No, we don't have git.
