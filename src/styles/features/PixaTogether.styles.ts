
export const PixaTogetherStyles = {
  modeCard: "flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 w-full group relative overflow-hidden text-center h-32 border",
  modeCardSelected: "bg-white border-indigo-100 shadow-xl shadow-indigo-500/10 scale-[1.02] ring-1 ring-indigo-50",
  modeCardInactive: "bg-white border-gray-100 hover:border-gray-200 hover:shadow-md opacity-80 hover:opacity-100",
  
  modeGradient: "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600",
  
  iconContainer: "mb-3 p-2.5 rounded-full transition-transform group-hover:scale-110",
  iconSelected: "bg-indigo-50 text-indigo-600",
  iconInactive: "bg-gray-50 text-gray-400 group-hover:text-gray-600",
  
  title: "font-bold text-sm mb-1",
  desc: "text-[10px] uppercase tracking-wide",
  
  proModeBanner: "animate-fadeIn bg-blue-50/50 p-5 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed shadow-sm",
  
  visualCardA: "relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden shadow-md border-2 border-white transform -rotate-3 hover:rotate-0 transition-transform duration-300 z-10",
  visualCardB: "relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden shadow-md border-2 border-white transform rotate-3 hover:rotate-0 transition-transform duration-300 z-20",
  
  visualLabel: "absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm",
  
  refPoseOverlay: "absolute bottom-4 right-4 w-32 aspect-[3/4] bg-white rounded-xl shadow-2xl border-4 border-white transform rotate-6 z-30 animate-fadeInUp",
  refPoseBadge: "absolute top-2 right-2 bg-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase",

  // New Engine Card Styles
  engineGrid: "flex flex-col gap-3",
  engineCard: "relative w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer overflow-hidden group hover:shadow-md",
  engineCardSelected: "border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 shadow-lg ring-1 ring-indigo-500/20",
  engineCardInactive: "border-gray-100 bg-white hover:border-indigo-200",
  
  engineIconBox: "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
  engineIconSelected: "bg-white text-indigo-600 shadow-sm",
  engineIconInactive: "bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500",
  
  engineTitle: "font-black text-sm text-gray-900 mb-1 relative z-10",
  engineDesc: "text-[10px] font-bold uppercase tracking-wider relative z-10",
  engineDescSelected: "text-indigo-600",
  engineDescInactive: "text-gray-400 group-hover:text-indigo-400",
};
