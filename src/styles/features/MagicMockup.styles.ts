export const MockupStyles = {
  // Color Selection Container
  colorGrid: "flex flex-wrap items-start gap-2.5 mb-4",
  
  // Base Item Wrapper (Swatch + Label)
  colorItem: "flex flex-col items-center gap-1",
  
  // Swatch Buttons
  colorSwatch: "group relative w-7 h-7 rounded-lg border-2 transition-all duration-300 transform cursor-pointer overflow-hidden flex items-center justify-center shadow-sm",
  colorSwatchActive: "border-indigo-600 ring-4 ring-indigo-500/10 scale-110 z-10 shadow-lg",
  colorSwatchInactive: "border-gray-100 hover:border-gray-300 hover:-translate-y-0.5",
  
  // Custom Color Square
  customColorBtn: "relative w-7 h-7 rounded-lg border-2 border-gray-100 bg-white flex flex-col items-center justify-center transition-all hover:border-indigo-300 hover:shadow-md group active:scale-95 overflow-hidden",
  customColorPreview: "w-full h-full shadow-inner transition-transform group-hover:scale-110",
  
  // Labels
  colorLabel: "text-[7px] font-black text-gray-400 uppercase tracking-tighter transition-colors leading-none",
  colorLabelActive: "text-indigo-600",
  
  // Active Indicator
  checkIcon: "text-white drop-shadow-md animate-scaleIn w-2.5 h-2.5",
  checkIconDark: "text-gray-900 drop-shadow-sm animate-scaleIn w-2.5 h-2.5",

  // Interactive Placement Canvas
  // Fix: Added missing placementCanvas style required by MagicMockup.tsx
  placementCanvas: "relative w-full h-[500px] bg-gray-50 flex items-center justify-center overflow-hidden rounded-[2.5rem] border border-gray-200 cursor-crosshair group shadow-inner",
  
  // Fix: Added missing silhouetteLayer style required by MagicMockup.tsx
  silhouetteLayer: "absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-10",
  
  // Fix: Added missing logoProxy and active variant styles required by MagicMockup.tsx
  logoProxy: "absolute border-2 border-dashed border-indigo-500 bg-indigo-50/20 transition-all cursor-move z-20 group",
  logoProxyActive: "border-solid border-indigo-600 bg-indigo-50/40 shadow-2xl ring-2 ring-indigo-500/20 scale-[1.02]",
  
  // Fix: Added missing logoPreview style required by MagicMockup.tsx
  logoPreview: "w-full h-full object-contain pointer-events-none",
  
  // Resizing Handles
  // Fix: Added missing handle and orientation styles required by MagicMockup.tsx
  handle: "absolute w-3 h-3 bg-white border border-indigo-600 rounded-full z-30 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm",
  handleNW: "-top-1.5 -left-1.5 cursor-nw-resize",
  handleNE: "-top-1.5 -right-1.5 cursor-ne-resize",
  handleSW: "-bottom-1.5 -left-1.5 cursor-sw-resize",
  handleSE: "-bottom-1.5 -right-1.5 cursor-se-resize",
  
  // HUD Info
  // Fix: Added missing coordBadge and coordText styles required by MagicMockup.tsx
  coordBadge: "absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 z-40",
  coordText: "text-[10px] font-mono text-white whitespace-nowrap",
  
  // Fix: Added missing instructionPill and instructionText styles required by MagicMockup.tsx
  instructionPill: "absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-2 z-40 animate-fadeIn",
  instructionText: "text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap",

  // Custom Color Controls
  // Fix: Added missing customGroup, customPicker, and customHexInput styles required by MagicMockup.tsx
  customGroup: "flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1 hover:border-indigo-300 transition-colors",
  customPicker: "relative w-6 h-6 rounded-md overflow-hidden shrink-0 border border-gray-200 shadow-sm",
  customHexInput: "w-12 bg-transparent text-[10px] font-bold text-gray-600 outline-none uppercase px-1 font-mono"
};