
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
};
