
export const RestoreStyles = {
  // Mode Cards
  modeCard: "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all w-full text-left overflow-hidden group",
  modeCardSelected: "border-transparent bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg transform scale-[1.01]",
  modeCardInactive: "border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md",
  
  iconBox: "shrink-0 p-3 rounded-xl transition-colors",
  iconBoxSelected: "bg-white/20 text-white",
  iconBoxInactive: "bg-gray-50",
  
  title: "font-bold text-sm mb-1",
  titleSelected: "text-white",
  titleInactive: "text-gray-800",
  
  desc: "text-xs leading-snug",
  descSelected: "text-indigo-100",
  descInactive: "text-gray-400",
  
  identityBadge: "mt-2 flex items-center gap-1.5 opacity-90 animate-fadeIn",
  identityText: "text-[10px] font-bold text-white uppercase tracking-wide",
  
  decor: "absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none",
};
