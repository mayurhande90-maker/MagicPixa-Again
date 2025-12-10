
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
  
  // --- PACK SELECTION STYLES (PREMIUM) ---
  packGrid: "grid grid-cols-3 gap-4 w-full mb-8", // Increased gap for premium spacing

  // Base Card Structure
  packCard: "group relative w-full h-32 rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-left border flex flex-col items-start p-1",

  // Interactive States
  packCardSelected: "border-indigo-500/30 bg-gradient-to-b from-white to-indigo-50/80 shadow-[0_12px_24px_-8px_rgba(99,102,241,0.25)] -translate-y-1.5 ring-1 ring-indigo-500/20 z-10",
  packCardInactive: "border-gray-100 bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1",

  // Content Container
  packContent: "relative z-10 w-full h-full p-3 flex flex-col justify-between",

  // Typography - Label
  packLabel: "text-[9px] font-black uppercase tracking-[0.15em] transition-colors",
  packLabelSelected: "text-indigo-600",
  packLabelInactive: "text-gray-400 group-hover:text-gray-600",

  // Typography - Count
  packCountContainer: "flex items-baseline gap-1 mt-1",
  packCount: "text-4xl font-black tracking-tighter leading-none transition-all duration-300",
  packCountSelected: "text-indigo-900 drop-shadow-sm scale-110 origin-left",
  packCountInactive: "text-gray-200 group-hover:text-gray-700",
  packUnit: "text-[9px] font-bold text-gray-400 uppercase tracking-wide",

  // Cost Pill (Premium Tag)
  packCost: "flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all w-fit mt-auto shadow-sm",
  packCostSelected: "bg-indigo-600 text-white shadow-indigo-500/40",
  packCostInactive: "bg-gray-50 text-gray-500 border border-gray-100 group-hover:bg-[#1A1A1E] group-hover:text-white group-hover:border-transparent",

  // Decor & Badges
  packOrb: "absolute w-24 h-24 rounded-full blur-2xl transition-all duration-500 -top-8 -right-8 pointer-events-none opacity-0 group-hover:opacity-100",
  packOrbSelected: "bg-indigo-400/20 opacity-100",
  packOrbInactive: "bg-gray-200/30",

  packPopular: "absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black px-2.5 py-1 rounded-bl-xl z-20 shadow-sm uppercase tracking-wider",
  
  // Results
  heroResultContainer: "lg:w-2/3 h-[50vh] lg:h-full bg-white relative border-b lg:border-b-0 lg:border-r border-gray-200 cursor-zoom-in group/hero",
  heroLabel: "absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10 border border-white/10 uppercase tracking-wider",
  heroDownloadBtn: "absolute bottom-6 right-6 bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 hover:scale-105 transition-transform border border-gray-100 pointer-events-auto",
  
  resultGridContainer: "lg:w-1/3 h-[50vh] lg:h-full bg-gray-50 overflow-y-auto custom-scrollbar relative",
  resultThumbnail: "bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 group relative cursor-zoom-in hover:shadow-md transition-shadow",
  
  scrollCue: "absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-200/50 to-transparent pointer-events-none flex items-end justify-center pb-2",
  scrollCueBadge: "bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-bold text-gray-500 shadow-sm animate-bounce",
};
