const fs = require('fs');
const path = require('path');

const fromDocsDir = path.join(__dirname, 'fromDocs');
const fromCodeDir = path.join(__dirname, 'fromCode');

const docsFiles = fs.readdirSync(fromDocsDir).filter(f => f.endsWith('.md')).sort();
const codeFiles = fs.readdirSync(fromCodeDir).filter(f => f.endsWith('.md')).sort();

const allDiagrams = [];

docsFiles.forEach((f, idx) => {
  const content = fs.readFileSync(path.join(fromDocsDir, f), 'utf8');
  const m = content.match(/```mermaid([\s\S]*?)```/);
  const id = 'doc_' + String(idx + 1).padStart(2, '0');
  const title = f.replace(/^[0-9]+_/, '').replace(/_/g, ' ').replace('.md', '');
  const cleanTitle = (idx + 1) + '. ' + title.charAt(0).toUpperCase() + title.slice(1);
  allDiagrams.push({
    id,
    cat: 'fromDocs',
    name: cleanTitle,
    file: f,
    code: m ? m[1].trim() : 'graph TD\n  A[No Mermaid Code Found]'
  });
});

codeFiles.forEach((f, idx) => {
  const content = fs.readFileSync(path.join(fromCodeDir, f), 'utf8');
  const m = content.match(/```mermaid([\s\S]*?)```/);
  const id = 'code_' + String(idx + 1).padStart(2, '0');
  const title = f.replace(/^[0-9]+_/, '').replace(/_/g, ' ').replace('.md', '');
  const cleanTitle = (idx + 1) + '. ' + title.charAt(0).toUpperCase() + title.slice(1);
  allDiagrams.push({
    id,
    cat: 'fromCode',
    name: cleanTitle,
    file: f,
    code: m ? m[1].trim() : 'graph TD\n  A[No Mermaid Code Found]'
  });
});

const diagramsJson = JSON.stringify(allDiagrams);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HPE ProLiant AI Studio — Architecture Diagrams Viewer</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070b14;
      --card-bg: #0d1527;
      --card-border: #1e293b;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.2);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --sidebar-w: 360px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      height: 100vh;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    /* Sidebar */
    .sidebar {
      width: var(--sidebar-w);
      background: var(--card-bg);
      border-right: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 20;
    }
    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--card-border);
      background: rgba(13, 21, 39, 0.95);
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      background: var(--accent-glow);
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 8px;
    }
    .sidebar-header h1 {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
    }
    .search-box {
      margin-top: 12px;
      position: relative;
    }
    .search-box input {
      width: 100%;
      background: #070b14;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      color: #fff;
      outline: none;
      transition: all 0.2s;
    }
    .search-box input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    .nav-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
    }
    .nav-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      padding: 8px 8px 6px;
      margin-top: 8px;
    }
    .nav-item {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      border: 1px solid transparent;
      color: #cbd5e1;
      font-size: 12.5px;
      font-weight: 500;
      padding: 9px 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 3px;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }
    .nav-item.active {
      background: var(--accent-glow);
      border-color: rgba(16, 185, 129, 0.4);
      color: #10b981;
      font-weight: 600;
    }

    /* Main Content Area */
    .main-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: #0b1120;
      position: relative;
    }
    .top-bar {
      height: 60px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      background: #0d1527;
      z-index: 10;
    }
    .diagram-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }
    .diagram-tag {
      font-size: 11px;
      background: #1e293b;
      color: #38bdf8;
      padding: 4px 10px;
      border-radius: 6px;
      margin-left: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }
    .toolbar-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hint-text {
      font-size: 12px;
      color: #64748b;
      margin-right: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .action-btn {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .action-btn:hover {
      background: #334155;
      color: #fff;
      border-color: #64748b;
    }
    .action-btn.primary {
      background: #065f46;
      color: #6ee7b7;
      border-color: #059669;
    }
    .action-btn.primary:hover {
      background: #047857;
      color: #fff;
    }

    /* Infinite Canvas Viewport */
    .viewport {
      flex: 1;
      width: 100%;
      height: calc(100vh - 60px);
      overflow: hidden;
      position: relative;
      cursor: grab;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
      background-size: 24px 24px;
    }
    .viewport:active {
      cursor: grabbing;
    }
    #mermaidTarget {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #mermaidTarget svg {
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
    }

    /* High-Contrast Crisp Mermaid Styling */
    .mermaid .node rect, 
    .mermaid .node circle, 
    .mermaid .node polygon {
      fill: #1e293b !important;
      stroke: #10b981 !important;
      stroke-width: 2px !important;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    }
    .mermaid .cluster rect {
      fill: #0f172a !important;
      stroke: #334155 !important;
      stroke-width: 1.5px !important;
      rx: 12px !important;
    }
    .mermaid text {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      fill: #ffffff !important;
    }
    .mermaid .cluster text {
      font-size: 16px !important;
      font-weight: 800 !important;
      fill: #34d399 !important;
      letter-spacing: -0.01em;
    }
    .mermaid .edgeLabel {
      background-color: #0f172a !important;
      color: #38bdf8 !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 4px 8px !important;
      border-radius: 6px !important;
      border: 1px solid #1e293b !important;
    }
    .mermaid .edgePath path {
      stroke: #38bdf8 !important;
      stroke-width: 2px !important;
    }
    .mermaid .arrowheadPath {
      fill: #38bdf8 !important;
    }
    .mermaid .actor {
      fill: #1e293b !important;
      stroke: #10b981 !important;
      stroke-width: 2px !important;
    }
    .mermaid text.actor > tspan {
      fill: #ffffff !important;
      font-weight: 700 !important;
      font-size: 15px !important;
    }
    .mermaid .messageText {
      fill: #e2e8f0 !important;
      font-size: 13px !important;
      font-weight: 500 !important;
    }
    .mermaid .note {
      fill: #1e1b4b !important;
      stroke: #818cf8 !important;
      stroke-width: 1.5px !important;
    }
    .mermaid .noteText {
      fill: #e0e7ff !important;
      font-weight: 600 !important;
    }
    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--accent);
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo-badge">⚡ Visual Architecture</div>
      <h1>HPE ProLiant AI Studio</h1>
      <div class="search-box">
        <input type="text" id="search" placeholder="Filter 22 diagrams..." oninput="filterDiagrams()">
      </div>
    </div>
    <div class="nav-list" id="navList"></div>
  </aside>

  <!-- Main View -->
  <main class="main-view">
    <header class="top-bar">
      <div>
        <span class="diagram-title" id="activeTitle">Loading...</span>
        <span class="diagram-tag" id="activeCategory">fromDocs</span>
      </div>
      <div class="toolbar-controls">
        <span class="hint-text">💡 Mouse wheel: Zoom | Click & Drag: Pan</span>
        <button class="action-btn primary" onclick="fitToScreen()">🎯 Fit to Screen</button>
        <button class="action-btn" onclick="zoomIn()">🔍 Zoom +</button>
        <button class="action-btn" onclick="zoomOut()">🔍 Zoom -</button>
        <button class="action-btn" onclick="resetZoom()">↺ Reset</button>
      </div>
    </header>
    <div class="viewport" id="viewport">
      <div id="mermaidTarget"></div>
    </div>
  </main>

  <script>
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '15px',
        darkMode: true,
        background: '#0b1120',
        primaryColor: '#1e293b',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#10b981',
        lineColor: '#38bdf8',
        secondaryColor: '#1e1b4b',
        secondaryTextColor: '#f8fafc',
        secondaryBorderColor: '#818cf8',
        tertiaryColor: '#0f172a',
        tertiaryTextColor: '#f8fafc',
        tertiaryBorderColor: '#64748b',
        noteBkgColor: '#1e1b4b',
        noteTextColor: '#e0e7ff',
        noteBorderColor: '#818cf8',
        clusterBkg: '#0f172a',
        clusterBorder: '#334155',
        titleColor: '#34d399',
        edgeLabelBackground: '#0f172a',
        actorBkg: '#1e293b',
        actorBorder: '#10b981',
        actorTextColor: '#ffffff',
        signalColor: '#38bdf8',
        signalTextColor: '#f8fafc'
      }
    });

    const diagrams = ${diagramsJson};
    let panZoomInstance = null;
    let activeId = 'doc_01';

    function renderNav() {
      const nav = document.getElementById('navList');
      nav.innerHTML = '';

      const docItems = diagrams.filter(d => d.cat === 'fromDocs');
      const codeItems = diagrams.filter(d => d.cat === 'fromCode');

      const addGroup = (title, items) => {
        const header = document.createElement('div');
        header.className = 'nav-section-title';
        header.innerText = title;
        nav.appendChild(header);

        items.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'nav-item ' + (item.id === activeId ? 'active' : '');
          btn.id = 'nav_' + item.id;
          btn.innerText = item.name;
          btn.onclick = () => loadDiagram(item);
          nav.appendChild(btn);
        });
      };

      addGroup('📁 From Documentation (11)', docItems);
      addGroup('📁 From Source Code (11)', codeItems);
    }

    async function loadDiagram(item) {
      activeId = item.id;
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const activeNav = document.getElementById('nav_' + item.id);
      if (activeNav) activeNav.classList.add('active');

      document.getElementById('activeTitle').innerText = item.name;
      document.getElementById('activeCategory').innerText = item.cat;

      if (panZoomInstance) {
        panZoomInstance.destroy();
        panZoomInstance = null;
      }

      const target = document.getElementById('mermaidTarget');
      target.removeAttribute('data-processed');
      target.innerHTML = item.code;
      
      try {
        await mermaid.run({ nodes: [target] });
        
        const svgEl = target.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = '100%';
          svgEl.style.maxWidth = 'none';
          
          panZoomInstance = svgPanZoom(svgEl, {
            zoomEnabled: true,
            controlIconsEnabled: false,
            fit: true,
            center: true,
            minZoom: 0.1,
            maxZoom: 20,
            zoomScaleSensitivity: 0.2
          });

          panZoomInstance.fit();
          panZoomInstance.center();
          panZoomInstance.zoomBy(0.9);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    }

    function fitToScreen() {
      if (panZoomInstance) {
        panZoomInstance.fit();
        panZoomInstance.center();
        panZoomInstance.zoomBy(0.9);
      }
    }

    function zoomIn() {
      if (panZoomInstance) panZoomInstance.zoomIn();
    }

    function zoomOut() {
      if (panZoomInstance) panZoomInstance.zoomOut();
    }

    function resetZoom() {
      if (panZoomInstance) {
        panZoomInstance.reset();
        panZoomInstance.fit();
        panZoomInstance.center();
      }
    }

    function filterDiagrams() {
      const query = document.getElementById('search').value.toLowerCase();
      diagrams.forEach(d => {
        const el = document.getElementById('nav_' + d.id);
        if (el) {
          el.style.display = d.name.toLowerCase().includes(query) ? 'block' : 'none';
        }
      });
    }

    renderNav();
    loadDiagram(diagrams[0]);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'viewer.html'), html, 'utf8');
console.log('✅ Generated high-definition pan-zoom diagrams/viewer.html!');
