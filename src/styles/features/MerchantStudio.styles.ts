
export const MerchantStyles = {
  // New Sophisticated Mode Cards (Bento Style)
  modeGrid: "grid grid-cols-1 gap-4", // Vertical stack or grid depending on preference, usually grid for 2 items

  modeCard: "group relative w-full h-40 rounded-[1.5rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left",
  
  // Variants
  modeCardApparel: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", // Purple/Warm
  modeCardProduct: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", // Blue/Cool

  // Decoration
  orb: "absolute w-48 h-48 rounded-full blur-3xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110",
  orbApparel: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-12 -right-12",
  orbProduct: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-12 -right-12",

  iconGlass: "absolute top-5 left-5 w-12 h-12 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-6 z-10",
  
  title: "text-xl font-black text-gray-900 mb-1 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  desc: "text-xs text-gray-600 font-medium leading-relaxed max-w-[90%] group-hover:text-gray-800 transition-colors",

  actionBtn: "absolute bottom-5 right-5 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-4 h-4 text-gray-900",
  
  // Pack Cards (Existing styles kept for functionality)
  packCard: "relative flex flex-col items-start p-3 rounded-xl border-2 transition-all w-full text-left h-full",
  packCardSelected: "border-indigo-500 bg-indigo-50/50 shadow-sm",
  packCardInactive: "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50",
  packPopularBadge: "absolute -top-2.5 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1",
  packPrice: "flex items-center gap-1 text-xs font-bold",
  
  // Results
  heroResultContainer: "lg:w-2/3 h-[50vh] lg:h-full bg-white relative border-b lg:border-b-0 lg:border-r border-gray-200 cursor-zoom-in group/hero",
  heroLabel: "absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10 border border-white/10 uppercase tracking-wider",
  heroDownloadBtn: "absolute bottom-6 right-6 bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 hover:scale-105 transition-transform border border-gray-100 pointer-events-auto",
  
  resultGridContainer: "lg:w-1/3 h-[50vh] lg:h-full bg-gray-50 overflow-y-auto custom-scrollbar relative",
  resultThumbnail: "bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 group relative cursor-zoom-in hover:shadow-md transition-shadow",
  
  scrollCue: "absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-200/50 to-transparent pointer-events-none flex items-end justify-center pb-2",
  scrollCueBadge: "bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-bold text-gray-500 shadow-sm animate-bounce",
};
