
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
  checkIconDark: "text-gray-900 drop-shadow-sm animate-scaleIn w-2.5 h-2.5"
};
