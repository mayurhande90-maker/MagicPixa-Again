
export const PhotoStudioStyles = {
  // Mode Selection Cards
  modeCard: "group relative p-6 bg-white border-2 border-gray-100 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1",
  modeCardBlueHover: "hover:border-blue-500",
  modeCardPurpleHover: "hover:border-purple-500",
  modeIconBase: "p-3 rounded-full transition-colors",
  modeIconBlue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  modeIconPurple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
  modeTitle: "text-lg font-bold text-gray-800",
  modeDesc: "text-xs text-gray-500",

  // Prompt Pills
  promptContainer: "transition-all duration-300 mb-6",
  promptHeader: "flex items-center justify-between mb-3 ml-1",
  promptLabel: "text-xs font-bold text-gray-400 uppercase tracking-wider",
  promptClearBtn: "text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors",
  promptTag: "text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold tracking-wide",
  
  promptButton: "group relative w-auto inline-flex rounded-full p-[2px] transition-all duration-300 transform active:scale-95",
  promptButtonActive: "scale-[1.02] shadow-md",
  promptButtonInactive: "hover:scale-[1.01]",
  promptBorder: "absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-opacity duration-300",
  promptContent: "relative h-full w-full rounded-full flex items-center justify-center px-4 py-2 transition-colors duration-300",
  promptText: "text-xs font-medium italic text-left",
  promptTextActive: "text-white",
  promptTextInactive: "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 bg-white",

  // Category Buttons
  categoryBtn: "px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-300 transform",
  categoryBtnActive: "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105",
  categoryBtnInactive: "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm active:scale-95",
  
  // Navigation
  backButton: "flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100",
  
  // Loaders & Analysis
  analysisOverlay: "absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] rounded-3xl overflow-hidden flex items-center justify-center",
  analysisBadge: "bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10 z-40 animate-bounce-slight",
  scanLine: "absolute top-0 h-full w-[3px] bg-[#4D7CFF] shadow-[0_0_20px_#4D7CFF] animate-[scan-horizontal_1.5s_linear_infinite] z-30",
  scanGradient: "absolute top-0 h-full w-48 bg-gradient-to-l from-[#4D7CFF]/30 to-transparent animate-[scan-horizontal_1.5s_linear_infinite] -translate-x-full z-20",
};
