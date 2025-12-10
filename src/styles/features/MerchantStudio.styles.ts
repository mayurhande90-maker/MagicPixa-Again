
export const MerchantStyles = {
  // New Sophisticated Mode Cards (Bento Style)
  modeGrid: "grid grid-cols-2 gap-3", // Side-by-side grid with slightly tighter gap

  // Changed aspect-square to h-44 to make them smaller/more compact
  modeCard: "group relative w-full h-44 rounded-[1.5rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left",
  
  // Variants
  modeCardApparel: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", // Purple/Warm
  modeCardProduct: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", // Blue/Cool

  // Decoration
  orb: "absolute w-32 h-32 rounded-full blur-2xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110",
  orbApparel: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-8 -right-8",
  orbProduct: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-8 -right-8",

  iconGlass: "absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-4 z-10",
  
  title: "text-sm font-black text-gray-900 mb-0.5 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  desc: "text-[10px] text-gray-600 font-medium leading-relaxed max-w-[90%] group-hover:text-gray-800 transition-colors",

  actionBtn: "absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-4 h-4 text-gray-900",
  
  // --- PACK SELECTION STYLES (NEW) ---
  packGrid: "grid grid-cols-3 gap-3 w-full mb-6",

  // Reduced height to h-28 for a smaller, compact look
  packCard: "group relative w-full h-28 rounded-2xl overflow-hidden transition-all duration-300 ease-out text-left border flex flex-col",
  
  // Pack States with Gradients
  packCardSelected: "border-indigo-500/30 ring-2 ring-indigo-500/10 shadow-lg -translate-y-1 bg-gradient-to-br from-[#E0E7FF] via-[#EEF2FF] to-[#F5F3FF]", 
  packCardInactive: "border-gray-200 bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 hover:from-white hover:to-indigo-50",

  // Pack Decor
  packOrb: "absolute w-20 h-20 rounded-full blur-xl transition-all duration-500 -top-6 -right-6 pointer-events-none",
  packOrbSelected: "opacity-60 bg-gradient-to-tr from-blue-400 to-indigo-300 scale-110",
  packOrbInactive: "opacity-0 group-hover:opacity-10 bg-gray-400",

  // Pack Badge
  packPopular: "absolute top-0 right-0 bg-gradient-to-bl from-[#F9D230] to-yellow-500 text-white text-[8px] font-bold px-2 py-1 rounded-bl-xl z-20 shadow-sm",

  // Pack Content
  packContent: "relative z-10 p-3 flex flex-col h-full justify-between",
  packLabel: "text-[9px] font-black uppercase tracking-wider",
  packCount: "text-2xl font-black text-gray-900 leading-none",
  packUnit: "text-[8px] font-bold text-gray-400 ml-0.5",
  packCost: "flex items-center gap-1 text-[9px] font-bold text-gray-500 bg-white/60 backdrop-blur-sm w-fit px-1.5 py-0.5 rounded-full border border-gray-100/50",
  
  // Results
  heroResultContainer: "lg:w-2/3 h-[50vh] lg:h-full bg-white relative border-b lg:border-b-0 lg:border-r border-gray-200 cursor-zoom-in group/hero",
  heroLabel: "absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10 border border-white/10 uppercase tracking-wider",
  heroDownloadBtn: "absolute bottom-6 right-6 bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 hover:scale-105 transition-transform border border-gray-100 pointer-events-auto",
  
  resultGridContainer: "lg:w-1/3 h-[50vh] lg:h-full bg-gray-50 overflow-y-auto custom-scrollbar relative",
  resultThumbnail: "bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 group relative cursor-zoom-in hover:shadow-md transition-shadow",
  
  scrollCue: "absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-200/50 to-transparent pointer-events-none flex items-end justify-center pb-2",
  scrollCueBadge: "bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-bold text-gray-500 shadow-sm animate-bounce",
};
