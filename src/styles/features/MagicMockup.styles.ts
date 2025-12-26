
export const MockupStyles = {
  // Color Selection
  colorGrid: "flex flex-wrap items-start gap-2.5 mb-4",
  colorItem: "flex flex-col items-center gap-1",
  colorSwatch: "group relative w-7 h-7 rounded-lg border-2 transition-all duration-300 transform cursor-pointer overflow-hidden flex items-center justify-center shadow-sm",
  colorSwatchActive: "border-indigo-600 ring-4 ring-indigo-500/10 scale-110 z-10 shadow-lg",
  colorSwatchInactive: "border-gray-100 hover:border-gray-300 hover:-translate-y-0.5",
  colorLabel: "text-[7px] font-black text-gray-400 uppercase tracking-tighter transition-colors leading-none",
  colorLabelActive: "text-indigo-600",
  customGroup: "flex items-center bg-gray-50 border border-gray-200 rounded-xl p-0.5 h-8 transition-all focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5",
  customPicker: "relative w-7 h-full rounded-lg overflow-hidden cursor-pointer shrink-0 border border-white/20",
  customHexInput: "w-14 bg-transparent border-none px-1.5 text-[10px] font-mono font-bold text-gray-700 outline-none uppercase placeholder-gray-300",
  checkIcon: "text-white drop-shadow-md animate-scaleIn w-2.5 h-2.5",
  checkIconDark: "text-gray-900 drop-shadow-sm animate-scaleIn w-2.5 h-2.5",

  // Placement Canvas
  placementCanvas: "relative w-full h-full bg-gray-50 rounded-[2.5rem] flex items-center justify-center overflow-hidden border border-gray-100 shadow-inner",
  silhouetteLayer: "absolute inset-0 flex items-center justify-center pointer-events-none opacity-20",
  logoProxy: "absolute border-2 border-indigo-500 bg-white/20 backdrop-blur-[1px] shadow-2xl cursor-move group select-none flex items-center justify-center overflow-hidden",
  logoProxyActive: "ring-4 ring-indigo-500/20 border-indigo-600 z-30",
  logoPreview: "w-full h-full object-contain pointer-events-none p-1",
  
  // Resizers
  handle: "absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full z-40 shadow-md hover:scale-125 transition-transform",
  handleNW: "-top-2 -left-2 cursor-nwse-resize",
  handleNE: "-top-2 -right-2 cursor-nesw-resize",
  handleSW: "-bottom-2 -left-2 cursor-nesw-resize",
  handleSE: "-bottom-2 -right-2 cursor-nwse-resize",

  // Indicators
  coordBadge: "absolute top-6 left-6 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 z-40 pointer-events-none",
  coordText: "text-[9px] font-mono font-black text-white/90 uppercase tracking-widest",
  
  instructionPill: "absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-100 shadow-lg z-40 pointer-events-none flex items-center gap-2",
  instructionText: "text-[10px] font-bold text-gray-500 uppercase tracking-wider"
};
