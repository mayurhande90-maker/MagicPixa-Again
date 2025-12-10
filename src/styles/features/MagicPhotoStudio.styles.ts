
export const PhotoStudioStyles = {
  // Mode Selection Cards - Premium Redesign
  modeCard: "group relative flex flex-col justify-start p-6 bg-white rounded-3xl border border-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/40 hover:-translate-y-1 overflow-hidden h-auto min-h-[180px] text-left",
  
  modeCardProduct: "hover:border-blue-200",
  modeCardModel: "hover:border-purple-200",

  modeBgGradient: "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
  modeBgProduct: "bg-gradient-to-br from-blue-50/50 via-transparent to-transparent",
  modeBgModel: "bg-gradient-to-br from-purple-50/50 via-transparent to-transparent",

  modeIconContainer: "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 shadow-sm z-10 border border-gray-50",
  modeIconProduct: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 group-hover:border-blue-500",
  modeIconModel: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-purple-200 group-hover:border-purple-500",

  modeTitle: "text-xl font-black text-gray-800 group-hover:text-gray-900 mb-2 leading-tight tracking-tight",
  modeDesc: "text-sm text-gray-500 font-medium leading-relaxed group-hover:text-gray-600 max-w-[90%]",
  
  actionArrow: "absolute top-6 right-6 opacity-0 transform -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300",
  actionArrowIcon: "w-5 h-5 text-gray-300 group-hover:text-gray-400",

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
