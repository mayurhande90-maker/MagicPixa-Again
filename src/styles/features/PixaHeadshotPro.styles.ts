
export const HeadshotStyles = {
  // Mode Cards
  modeCard: "relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all w-full text-center overflow-hidden group h-36 hover:shadow-lg cursor-pointer",
  modeCardSelected: "border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500/20",
  modeCardInactive: "border-gray-200 bg-white hover:border-blue-300",
  
  // Updated Icon Box: Removed padding/backgrounds (circles)
  iconBox: "mb-3 transition-all duration-300",
  iconBoxSelected: "text-blue-600 scale-110 drop-shadow-sm",
  iconBoxInactive: "text-gray-300 group-hover:text-blue-500 group-hover:scale-105",
  
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
