
export const MockupStyles = {
  // Color Swatches
  colorGrid: "grid grid-cols-5 sm:grid-cols-7 gap-3 mb-4",
  colorSwatch: "group relative w-10 h-10 rounded-2xl border-2 transition-all duration-300 transform cursor-pointer overflow-hidden flex items-center justify-center shadow-sm",
  colorSwatchActive: "border-indigo-600 ring-4 ring-indigo-500/10 scale-110 z-10 shadow-lg",
  colorSwatchInactive: "border-gray-100 hover:border-gray-300 hover:-translate-y-1",
  
  // Custom Color Trigger
  customColorBtn: "w-10 h-10 rounded-2xl border-2 border-gray-100 bg-white flex flex-col items-center justify-center gap-1 transition-all hover:border-indigo-300 hover:shadow-md hover:-translate-y-1 group active:scale-95",
  customColorPreview: "w-5 h-5 rounded-lg shadow-inner transition-transform group-hover:scale-110",
  customLabel: "text-[7px] font-black text-gray-400 uppercase tracking-tighter group-hover:text-indigo-600",
  
  // Active Indicator
  checkIcon: "text-white drop-shadow-md animate-scaleIn",
  checkIconDark: "text-gray-900 drop-shadow-sm animate-scaleIn"
};
