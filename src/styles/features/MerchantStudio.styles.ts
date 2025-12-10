
export const MerchantStyles = {
  // Mode Cards
  modeCard: "flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all w-full group relative overflow-hidden text-center h-32",
  modeCardBlueSelected: "border-blue-500 bg-blue-50 shadow-md",
  modeCardPurpleSelected: "border-purple-500 bg-purple-50 shadow-md",
  modeCardInactive: "border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50",
  modeIcon: "mb-2 transition-transform group-hover:scale-110",
  
  // Pack Cards
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
