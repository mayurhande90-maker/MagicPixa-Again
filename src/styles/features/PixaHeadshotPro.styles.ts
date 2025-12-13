
export const HeadshotStyles = {
  // Mode Cards
  modeCard: "relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all w-full text-center overflow-hidden group h-32 hover:shadow-lg cursor-pointer",
  modeCardSelected: "border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500/20",
  modeCardInactive: "border-gray-200 bg-white hover:border-blue-300",
  
  iconBox: "p-3 rounded-full mb-3 transition-colors",
  iconBoxSelected: "bg-blue-600 text-white shadow-sm",
  iconBoxInactive: "bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500",
  
  title: "font-bold text-xs mb-1",
  titleSelected: "text-blue-900",
  titleInactive: "text-gray-700",
  
  desc: "text-[9px] uppercase tracking-wide font-bold",
  descSelected: "text-blue-600",
  descInactive: "text-gray-400",
  
  grid: "grid grid-cols-2 lg:grid-cols-3 gap-3",
  
  // Custom Checkmark for selected state
  checkBadge: "absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5 shadow-sm animate-fadeIn",
};
