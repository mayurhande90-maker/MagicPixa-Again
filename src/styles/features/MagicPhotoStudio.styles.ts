
export const PhotoStudioStyles = {
  // Container
  modeGrid: "grid grid-cols-1 md:grid-cols-2 gap-6",

  // Base Card - Apple/Bento Style
  modeCard: "group relative w-full h-64 rounded-[2rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-gray-200 hover:-translate-y-2 border border-white/60 text-left",
  
  // Product Variant
  modeCardProduct: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", // Soft tech blue
  // Model Variant
  modeCardModel: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", // Soft warm/purple

  // Abstract Decoration (The "Orb")
  orb: "absolute w-64 h-64 rounded-full blur-3xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110",
  orbProduct: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-20 -right-20",
  orbModel: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-20 -right-20",

  // Content Layout
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-8 z-10",
  
  // Icon Box (Glassmorphism)
  iconGlass: "absolute top-6 left-6 w-16 h-16 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  iconProduct: "text-blue-600",
  iconModel: "text-purple-600",

  // Typography
  title: "text-2xl font-black text-gray-900 mb-2 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  desc: "text-sm text-gray-600 font-medium leading-relaxed max-w-[90%] group-hover:text-gray-800 transition-colors",

  // Action Indicator (Arrow circle)
  actionBtn: "absolute bottom-6 right-6 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-5 h-5 text-gray-900",

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

  // Category Grid
  categoryGrid: "grid grid-cols-2 gap-3",

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
