import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import { SUBSYSTEM_DEFS } from '../../services/topologyGraphBuilder';

const HUB_POSITIONS = {
  COMPUTE:       { angle: -140, radius: 260 },
  MEMORY:        { angle: -40,  radius: 260 },
  STORAGE:       { angle: -175, radius: 290 },
  PCIE_NETWORK:  { angle: -5,   radius: 290 },
  POWER_THERMAL: { angle: 135,  radius: 260 },
  SERVICES:      { angle: 45,   radius: 260 }
};

function matchesTopologyFilter(node, subId, activeFilter) {
  if (node.subsystem !== subId || node.type === 'SUBSYSTEM_HUB') return false;
  if (activeFilter === 'ALL' || activeFilter === subId) return true;
  return activeFilter === 'GAPS' && (node.type === 'GAP_MISSING' || node.status === 'FIX_APPLIED');
}

function computeTopologyLayout(graphData, activeFilter) {
  if (!graphData?.rootNode) return { nodeCoords: {}, paths: [] };

  const width = 1400;
  const height = 900;
  const centerX = width / 2;
  const centerY = height / 2;

  const coords = {};
  const paths = [];

  coords[graphData.rootNode.id] = { x: centerX, y: centerY, node: graphData.rootNode };

  SUBSYSTEM_DEFS.forEach(sub => {
    const hubConfig = HUB_POSITIONS[sub.id] || { angle: 0, radius: 260 };
    const rad = (hubConfig.angle * Math.PI) / 180;
    const hubX = centerX + hubConfig.radius * Math.cos(rad);
    const hubY = centerY + hubConfig.radius * Math.sin(rad);

    const hubNodeId = `node-sub-${sub.id}`;
    const hubNode = graphData.nodes.find(n => n.id === hubNodeId);

    coords[hubNodeId] = { x: hubX, y: hubY, node: hubNode };

    paths.push({
      id: `path-root-${sub.id}`,
      sourceId: graphData.rootNode.id,
      targetId: hubNodeId,
      x1: centerX,
      y1: centerY,
      x2: hubX,
      y2: hubY,
      type: 'BUS_LINK',
      status: 'VALID'
    });

    const children = graphData.nodes.filter(n => matchesTopologyFilter(n, sub.id, activeFilter));
    const isLeftSide = hubX < centerX;
    const childSpacingY = 56;
    const totalHeight = (children.length - 1) * childSpacingY;
    const startY = hubY - totalHeight / 2;

    children.forEach((child, cIdx) => {
      const childX = isLeftSide ? hubX - 220 : hubX + 220;
      const childY = startY + cIdx * childSpacingY;

      coords[child.id] = { x: childX, y: childY, node: child };

      paths.push({
        id: `path-${hubNodeId}-${child.id}`,
        sourceId: hubNodeId,
        targetId: child.id,
        x1: hubX,
        y1: hubY,
        x2: childX,
        y2: childY,
        type: child.type === 'GAP_MISSING' ? 'DEPENDENCY_GAP' : 'COMPONENT_LINK',
        status: child.status
      });
    });
  });

  return { nodeCoords: coords, paths, width, height };
}

function TopologyConnectorPath({ path }) {
  const dx = path.x2 - path.x1;
  const cx1 = path.x1 + dx * 0.45;
  const cy1 = path.y1;
  const cx2 = path.x1 + dx * 0.55;
  const cy2 = path.y2;
  const d = `M ${path.x1} ${path.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${path.x2} ${path.y2}`;

  const isGap = path.status === 'GAP_MISSING';
  const isFix = path.status === 'FIX_APPLIED';
  const isAmbiguous = path.status === 'NEEDS_HUMAN_CLARIFICATION';

  let strokeColor = '#334155';
  if (isGap) strokeColor = '#f43f5e';
  else if (isAmbiguous) strokeColor = '#f59e0b';
  else if (isFix) strokeColor = '#38bdf8';
  else if (path.type === 'BUS_LINK') strokeColor = '#10b981';

  const isHighlighted = isGap || isAmbiguous || path.type === 'BUS_LINK';

  return (
    <path
      d={d}
      fill="none"
      stroke={strokeColor}
      strokeWidth={isHighlighted ? 2.5 : 1.5}
      strokeDasharray={isGap ? '6,6' : isAmbiguous ? '4,4' : 'none'}
      className={isGap || isAmbiguous ? 'animate-pulse' : ''}
      opacity={0.85}
    />
  );
}

function TopologyNodeGraphic({ item, selectedNode, onSelectNode }) {
  const { x, y, node } = item;
  if (!node) return null;

  const isSelected = selectedNode?.id === node.id;
  if (node.type === 'CHASSIS_ROOT') {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        onClick={() => onSelectNode(node)}
        className="topology-interactive-node cursor-pointer group"
      >
        <circle r="60" fill="#0f172a" stroke="#10b981" strokeWidth="3" filter="url(#glow-emerald)" />
        <circle r="48" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <text y="-8" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="sans-serif" pointerEvents="none">
          DL380 Gen12
        </text>
        <text y="10" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace" pointerEvents="none">
          {node.sku}
        </text>
        <text y="24" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" pointerEvents="none">
          CTO Base Chassis
        </text>
      </g>
    );
  }

  if (node.type === 'SUBSYSTEM_HUB') {
    const shortSub = node.subsystem.length > 8 ? node.subsystem.substring(0, 7) + '..' : node.subsystem;
    return (
      <g
        transform={`translate(${x}, ${y})`}
        onClick={() => onSelectNode(node)}
        className="topology-interactive-node cursor-pointer group"
      >
        <circle
          r="40"
          fill="#1e293b"
          stroke={node.hasGaps ? '#f43f5e' : '#0284c7'}
          strokeWidth="2"
          strokeDasharray={node.hasGaps ? '4,4' : 'none'}
          className={node.hasGaps ? 'animate-pulse' : ''}
        />
        <circle r="32" fill="#0f172a" />
        <text y="-4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" pointerEvents="none">
          {shortSub}
        </text>
        <text y="14" textAnchor="middle" fill="#94a3b8" fontSize="9" pointerEvents="none">
          {node.itemCount || 0} items
        </text>
      </g>
    );
  }

  const isGap = node.type === 'GAP_MISSING';
  const isFix = node.status === 'FIX_APPLIED';
  const isAmbiguous = node.status === 'NEEDS_HUMAN_CLARIFICATION';

  const rectW = 200;
  const rectH = 46;
  const rectX = -rectW / 2;
  const rectY = -rectH / 2;

  let boxFill = '#0f172a';
  let strokeColor = '#10b981';
  let textColor = '#34d399';
  let skuDisplay = node.sku;

  if (isGap) {
    boxFill = '#450a0a';
    strokeColor = '#f43f5e';
    textColor = '#fca5a5';
    skuDisplay = '⚠️ GAP';
  } else if (isAmbiguous) {
    boxFill = '#451a03';
    strokeColor = '#f59e0b';
    textColor = '#fcd34d';
    skuDisplay = '⚠️ ' + node.sku;
  } else if (isFix) {
    boxFill = '#082f49';
    strokeColor = '#38bdf8';
    textColor = '#7dd3fc';
  }

  const shortLabel = node.label.length > 24 ? node.label.substring(0, 22) + '...' : node.label;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelectNode(node)}
      className="topology-interactive-node cursor-pointer group"
    >
      <rect
        x={rectX}
        y={rectY}
        width={rectW}
        height={rectH}
        rx="8"
        fill={boxFill}
        stroke={isSelected ? '#ffffff' : strokeColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeDasharray={isGap ? '5,4' : isAmbiguous ? '4,3' : 'none'}
        className="transition-all duration-150 group-hover:stroke-white"
      />

      <text
        x={rectX + 12}
        y={rectY + 18}
        fill={textColor}
        fontSize="11"
        fontWeight="bold"
        fontFamily="monospace"
        pointerEvents="none"
      >
        {skuDisplay}
      </text>

      {isFix && (
        <text x={rectX + rectW - 10} y={rectY + 18} textAnchor="end" fill="#38bdf8" fontSize="9" fontWeight="bold" pointerEvents="none">
          [FIXED]
        </text>
      )}
      {isAmbiguous && (
        <text x={rectX + rectW - 10} y={rectY + 18} textAnchor="end" fill="#f59e0b" fontSize="9" fontWeight="bold" pointerEvents="none">
          [HITL]
        </text>
      )}

      <text x={rectX + 12} y={rectY + 34} fill="#cbd5e1" fontSize="10" fontFamily="sans-serif" pointerEvents="none">
        {shortLabel}
      </text>
    </g>
  );
}

export default function BoqTopologyCanvas({
  graphData,
  selectedNode,
  onSelectNode,
  activeFilter = 'ALL'
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.4));

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 2.5));
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.topology-interactive-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const layout = useMemo(() => computeTopologyLayout(graphData, activeFilter), [graphData, activeFilter]);
  const isEmptyState = !graphData?.rootNode || Object.keys(layout.nodeCoords).length === 0;

  return (
    <div className="relative w-full h-[650px] bg-slate-950 overflow-hidden select-none rounded-xl border border-slate-800">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-lg">
        <button
          aria-label="Zoom In"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          aria-label="Zoom Out"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          aria-label="Reset View"
          onClick={handleResetView}
          title="Reset View"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1 font-semibold">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width || 1400} ${layout.height || 900}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <defs>
            <pattern id="topology-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width={layout.width || 1400} height={layout.height || 900} fill="url(#topology-grid)" />

          {layout.paths.map(path => (
            <TopologyConnectorPath key={path.id} path={path} />
          ))}

          {Object.entries(layout.nodeCoords).map(([id, item]) => (
            <TopologyNodeGraphic
              key={id}
              item={item}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
            />
          ))}
        </svg>
      </div>

      {isEmptyState && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-md text-center shadow-2xl backdrop-blur-md pointer-events-auto animate-fade-in">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2">No Hardware Topology Loaded</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-1">
              Evaluate a candidate BOQ in Stage 1 or load a sample configuration to visualize its 23-node subsystem tree and physical bus links.
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Connected SKU
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          Strategy Fix
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          Missing Dependency Gap
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          Needs Human Review
        </span>
      </div>
    </div>
  );
}
