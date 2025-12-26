
export const MockupStyles = {
  // Color Selection Container
  colorGrid: "flex flex-wrap items-center gap-2.5 mb-4",
  
  // Base Item Wrapper (Swatch + Label)
  colorItem: "flex flex-col items-center gap-1",
  
  // Swatch Buttons
  colorSwatch: "group relative w-7 h-7 rounded-lg border-2 transition-all duration-300 transform cursor-pointer overflow-hidden flex items-center justify-center shadow-sm",
  colorSwatchActive: "border-indigo-600 ring-4 ring-indigo-500/10 scale-110 z-10 shadow-lg",
  colorSwatchInactive: "border-gray-100 hover:border-gray-300 hover:-translate-y-0.5",
  
  // Labels
  colorLabel: "text-[7px] font-black text-gray-400 uppercase tracking-tighter transition-colors leading-none",
  colorLabelActive: "text-indigo-600",
  
  // Integrated Custom Control
  customGroup: "flex items-center bg-gray-50 border border-gray-200 rounded-xl p-0.5 h-8 transition-all focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5",
  customPicker: "relative w-7 h-full rounded-lg overflow-hidden cursor-pointer shrink-0 border border-white/20",
  customHexInput: "w-14 bg-transparent border-none px-1.5 text-[10px] font-mono font-bold text-gray-700 outline-none uppercase placeholder-gray-300",
  
  // Active Indicator
  checkIcon: "text-white drop-shadow-md animate-scaleIn w-2.5 h-2.5",
  checkIconDark: "text-gray-900 drop-shadow-sm animate-scaleIn w-2.5 h-2.5"
};
