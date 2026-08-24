import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { SUBSYSTEM_DEFS } from '../../services/topologyGraphBuilder';

const HUB_POSITIONS = {
  COMPUTE:       { angle: -140, radius: 260 },
  MEMORY:        { angle: -40,  radius: 260 },
  STORAGE:       { angle: -175, radius: 290 },
  PCIE_NETWORK:  { angle: -5,   radius: 290 },
  POWER_THERMAL: { angle: 135,  radius: 260 },
  SERVICES:      { angle: 45,   radius: 260 }
};

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

  // Reset zoom & pan
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Zoom handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.4));

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 2.5));
  };

  // Drag-to-pan handlers
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

  // Compute 2D coordinates for all nodes in layout
  const layout = useMemo(() => {
    if (!graphData || !graphData.rootNode) return { nodeCoords: {}, paths: [] };

    const width = 1400;
    const height = 900;
    const centerX = width / 2;
    const centerY = height / 2;

    const coords = {};
    const paths = [];

    // Root Chassis Coordinate
    coords[graphData.rootNode.id] = { x: centerX, y: centerY, node: graphData.rootNode };

    // Subsystem Hubs & Children Coordinates
    SUBSYSTEM_DEFS.forEach(sub => {
      const hubConfig = HUB_POSITIONS[sub.id] || { angle: 0, radius: 260 };
      const rad = (hubConfig.angle * Math.PI) / 180;
      const hubX = centerX + hubConfig.radius * Math.cos(rad);
      const hubY = centerY + hubConfig.radius * Math.sin(rad);

      const hubNodeId = `node-sub-${sub.id}`;
      const hubNode = graphData.nodes.find(n => n.id === hubNodeId);

      coords[hubNodeId] = { x: hubX, y: hubY, node: hubNode };

      // Root to Hub Bezier Curve
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

      // Filter children for this subsystem
      let children = graphData.nodes.filter(n => 
        n.subsystem === sub.id && 
        n.type !== 'SUBSYSTEM_HUB' && 
        (activeFilter === 'ALL' || activeFilter === sub.id || (activeFilter === 'GAPS' && (n.type === 'GAP_MISSING' || n.status === 'FIX_APPLIED')))
      );

      // Arrange children branching outward
      const isLeftSide = hubX < centerX;
      const childSpacingY = 56;
      const totalHeight = (children.length - 1) * childSpacingY;
      const startY = hubY - totalHeight / 2;

      children.forEach((child, cIdx) => {
        const childX = isLeftSide ? hubX - 220 : hubX + 220;
        const childY = startY + cIdx * childSpacingY;

        coords[child.id] = { x: childX, y: childY, node: child };

        // Hub to Child Path
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
  }, [graphData, activeFilter]);

  return (
    <div className="relative w-full h-[650px] bg-slate-950 overflow-hidden select-none rounded-xl border border-slate-800">
      {/* Zoom / Canvas Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-lg">
        <button aria-label="Zoom In"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button aria-label="Zoom Out"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button aria-label="Reset View"
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

      {/* Canvas Viewport */}
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
            {/* Background Grid Pattern */}
            <pattern id="topology-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>
            {/* Glow Filters */}
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

          {/* Grid Background */}
          <rect width={layout.width || 1400} height={layout.height || 900} fill="url(#topology-grid)" />

          {/* Connector Paths */}
          {layout.paths.map(path => {
            const dx = path.x2 - path.x1;
            const cx1 = path.x1 + dx * 0.45;
            const cy1 = path.y1;
            const cx2 = path.x1 + dx * 0.55;
            const cy2 = path.y2;
            const d = `M ${path.x1} ${path.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${path.x2} ${path.y2}`;

            const isGap = path.status === 'GAP_MISSING';
            const isFix = path.status === 'FIX_APPLIED';
            const isAmbiguous = path.status === 'NEEDS_HUMAN_CLARIFICATION';

            return (
              <path
                key={path.id}
                d={d}
                fill="none"
                stroke={isGap ? '#f43f5e' : isAmbiguous ? '#f59e0b' : isFix ? '#38bdf8' : path.type === 'BUS_LINK' ? '#10b981' : '#334155'}
                strokeWidth={isGap || isAmbiguous ? 2.5 : path.type === 'BUS_LINK' ? 2.5 : 1.5}
                strokeDasharray={isGap ? '6,6' : isAmbiguous ? '4,4' : 'none'}
                className={isGap || isAmbiguous ? 'animate-pulse' : ''}
                opacity={0.85}
              />
            );
          })}

          {/* Render Nodes */}
          {Object.entries(layout.nodeCoords).map(([id, item]) => {
            const { x, y, node } = item;
            if (!node) return null;

            const isSelected = selectedNode?.id === node.id;
            const isRoot = node.type === 'CHASSIS_ROOT';
            const isHub = node.type === 'SUBSYSTEM_HUB';
            const isGap = node.type === 'GAP_MISSING';
            const isFix = node.status === 'FIX_APPLIED';
            const isAmbiguous = node.status === 'NEEDS_HUMAN_CLARIFICATION';

            if (isRoot) {
              return (
                <g
                  key={id}
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

            if (isHub) {
              return (
                <g
                  key={id}
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
                    {node.subsystem.length > 8 ? node.subsystem.substring(0, 7) + '..' : node.subsystem}
                  </text>
                  <text y="14" textAnchor="middle" fill="#94a3b8" fontSize="9" pointerEvents="none">
                    {node.itemCount || 0} items
                  </text>
                </g>
              );
            }

            // SKU Item / Gap Node
            const rectW = 200;
            const rectH = 46;
            const rectX = -rectW / 2;
            const rectY = -rectH / 2;

            return (
              <g
                key={id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectNode(node)}
                className="topology-interactive-node cursor-pointer group"
              >
                {/* Node Box */}
                <rect
                  x={rectX}
                  y={rectY}
                  width={rectW}
                  height={rectH}
                  rx="8"
                  fill={isGap ? '#450a0a' : isAmbiguous ? '#451a03' : isFix ? '#082f49' : '#0f172a'}
                  stroke={isSelected ? '#ffffff' : isGap ? '#f43f5e' : isAmbiguous ? '#f59e0b' : isFix ? '#38bdf8' : '#10b981'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={isGap ? '5,4' : isAmbiguous ? '4,3' : 'none'}
                  className="transition-all duration-150 group-hover:stroke-white"
                />

                {/* SKU Code */}
                <text
                  x={rectX + 12}
                  y={rectY + 18}
                  fill={isGap ? '#fca5a5' : isAmbiguous ? '#fcd34d' : isFix ? '#7dd3fc' : '#34d399'}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {isGap ? '⚠️ GAP' : isAmbiguous ? '⚠️ ' + node.sku : node.sku}
                </text>

                {/* Status Badge */}
                {isFix && (
                  <text
                    x={rectX + rectW - 10}
                    y={rectY + 18}
                    textAnchor="end"
                    fill="#38bdf8"
                    fontSize="9"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    [FIXED]
                  </text>
                )}
                {isAmbiguous && (
                  <text
                    x={rectX + rectW - 10}
                    y={rectY + 18}
                    textAnchor="end"
                    fill="#f59e0b"
                    fontSize="9"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    [HITL]
                  </text>
                )}

                {/* Label / Description */}
                <text
                  x={rectX + 12}
                  y={rectY + 34}
                  fill="#cbd5e1"
                  fontSize="10"
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {node.label.length > 24 ? node.label.substring(0, 22) + '...' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend Footer */}
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
