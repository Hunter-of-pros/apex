import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Sun, Contrast, Sliders } from 'lucide-react';

interface PacsViewerProps {
  imageUrl?: string;
  heatmapUrl?: string;
  isLowQuality?: boolean;
  lowQualityReason?: string;
}

export const PacsViewer: React.FC<PacsViewerProps> = ({
  imageUrl,
  heatmapUrl,
  isLowQuality,
  lowQualityReason
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(65);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Handle hotkeys (H to toggle heatmap, + / - for zoom, R to reset, I to invert)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setShowHeatmap((prev) => !prev);
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3.5, z + 0.25));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.5, z - 0.25));
      } else if (e.key === 'r' || e.key === 'R') {
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
        setBrightness(100);
        setContrast(100);
        setInvert(false);
      } else if (e.key === 'i' || e.key === 'I') {
        setInvert((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetAll = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setInvert(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050608] relative select-none overflow-hidden border-r border-border-subtle">
      {/* PACS Viewport Toolbar */}
      <div className="bg-bg-secondary/90 border-b border-border-subtle p-2 flex flex-wrap items-center justify-between text-2xs font-mono text-text-secondary z-20">
        {/* Left Tools: Zoom, Pan, Invert, Reset */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1 hover:bg-bg-tertiary rounded-xs text-text-muted hover:text-text-primary border border-border-subtle"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center text-text-primary font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3.5, z + 0.25))}
            className="p-1 hover:bg-bg-tertiary rounded-xs text-text-muted hover:text-text-primary border border-border-subtle"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <span className="text-border-subtle mx-1">|</span>

          <button
            onClick={() => setInvert(!invert)}
            className={`px-2 py-1 rounded-xs border transition-colors ${
              invert
                ? 'bg-accent-subtle text-accent border-accent'
                : 'hover:bg-bg-tertiary text-text-secondary border-border-subtle'
            }`}
            title="Invert film grayscale (I)"
          >
            Invert Film
          </button>

          <button
            onClick={resetAll}
            className="p-1 hover:bg-bg-tertiary rounded-xs text-text-muted hover:text-text-primary border border-border-subtle"
            title="Reset viewport (R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Tools: Window/Level & Grad-CAM Heatmap Opacity */}
        <div className="flex items-center space-x-3">
          {/* Brightness */}
          <div className="flex items-center space-x-1">
            <Sun className="w-3 h-3 text-text-muted" />
            <input
              type="range"
              min="50"
              max="160"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-16 h-1 bg-bg-tertiary accent-accent cursor-pointer"
              title="Window / Brightness"
            />
          </div>

          {/* Contrast */}
          <div className="flex items-center space-x-1">
            <Contrast className="w-3 h-3 text-text-muted" />
            <input
              type="range"
              min="50"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-16 h-1 bg-bg-tertiary accent-accent cursor-pointer"
              title="Level / Contrast"
            />
          </div>

          <span className="text-border-subtle">|</span>

          {/* Grad-CAM Toggle & Opacity Slider */}
          {heatmapUrl && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-2 py-0.5 rounded-xs border text-2xs font-semibold transition-colors ${
                  showHeatmap
                    ? 'bg-amber-950/40 text-amber-300 border-amber-600/70'
                    : 'bg-bg-primary text-text-muted border-border-subtle hover:text-text-secondary'
                }`}
                title="Toggle Grad-CAM Heatmap Overlay (H)"
              >
                Grad-CAM: {showHeatmap ? 'ON' : 'OFF'}
              </button>

              {showHeatmap && (
                <div className="flex items-center space-x-1">
                  <Sliders className="w-3 h-3 text-text-muted" />
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                    className="w-16 h-1 bg-bg-tertiary accent-amber-500 cursor-pointer"
                    title="Heatmap Opacity"
                  />
                  <span className="text-[10px] w-6">{heatmapOpacity}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Low Quality Alert Banner */}
      {isLowQuality && (
        <div className="bg-quality-alert-bg border-b border-quality-alert-border text-quality-alert-fg px-3 py-1.5 flex items-center justify-between text-2xs font-mono z-10">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs">⚑ QUALITY ALERT:</span>
            <span>{lowQualityReason || 'Degraded acquisition. Blur or exposure limits diagnostic confidence.'}</span>
          </div>
          <span className="font-semibold uppercase">PRIORITY FORCED ESCALATION</span>
        </div>
      )}

      {/* Main PACS Canvas Area */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* DICOM Anatomical Orientation Markers */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-text-muted font-mono text-2xs font-bold pointer-events-none z-10 bg-black/40 px-1 rounded-xs">
          S (SUPERIOR)
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-text-muted font-mono text-2xs font-bold pointer-events-none z-10 bg-black/40 px-1 rounded-xs">
          I (INFERIOR)
        </div>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-2xs font-bold pointer-events-none z-10 bg-black/40 px-1 rounded-xs">
          R (RIGHT)
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-2xs font-bold pointer-events-none z-10 bg-black/40 px-1 rounded-xs">
          L (LEFT)
        </div>

        {/* Radiograph and Grad-CAM Layers */}
        <div
          className="relative transition-transform duration-75 ease-out select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(1)' : ''}`,
            transformOrigin: 'center center'
          }}
        >
          {imageUrl ? (
            <div className="relative">
              {/* Raw Radiograph Layer */}
              <img
                src={imageUrl}
                alt="Thoracic Radiograph"
                className="max-h-[640px] max-w-[640px] object-contain pointer-events-none select-none shadow-2xl"
                draggable={false}
              />

              {/* Transparent Grad-CAM Overlay Layer */}
              {heatmapUrl && showHeatmap && (
                <img
                  src={heatmapUrl}
                  alt="Grad-CAM Activation Map"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none mix-blend-screen"
                  style={{ opacity: heatmapOpacity / 100 }}
                  draggable={false}
                />
              )}
            </div>
          ) : (
            <div className="text-text-muted font-mono text-xs">
              No radiological image attached.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Viewer Footnote */}
      <div className="bg-bg-secondary/70 border-t border-border-subtle px-3 py-1 flex items-center justify-between text-2xs font-mono text-text-muted select-none">
        <span>PROJECTION: ERECT POSTEROANTERIOR (PA) • 512×512 DXT MATRIX</span>
        <span>HEATMAP: GRAD-CAM RESIDUAL (DENSEBLOCK-4)</span>
      </div>
    </div>
  );
};
