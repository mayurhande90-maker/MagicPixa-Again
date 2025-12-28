
export const RestoreStyles = {
  // Container for the bento cards
  modeGrid: "grid grid-cols-2 gap-3 mb-8",

  // Base Card Structure (High-end Apple/Bento Style)
  modeCard: "group relative w-full h-48 rounded-[1.5rem] overflow-hidden transition-all duration-500 ease-out border text-left cursor-pointer",
  
  // Interactive States
  modeCardRestore: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", // Sophisticated tech blue
  modeCardColor: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", // Professional warm purple/pink
  
  modeCardSelected: "ring-2 ring-indigo-500 shadow-2xl shadow-indigo-500/20 scale-[1.02] z-10 border-transparent",
  modeCardInactive: "border-white/60 opacity-80 hover:opacity-100 hover:shadow-lg hover:-translate-y-1",

  // Animated Background Decorative Orbs
  orb: "absolute w-32 h-32 rounded-full blur-2xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none",
  orbRestore: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-8 -right-8",
  orbColor: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-8 -right-8",

  // Glassmorphic Icon Container
  iconGlass: "absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  
  // Text content at the bottom
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-5 z-10",
  title: "text-sm font-black text-gray-900 mb-0.5 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  desc: "text-[10px] text-gray-500 font-bold leading-relaxed max-w-[90%] group-hover:text-gray-800 transition-colors uppercase tracking-wider",

  // Checkmark Badge for Selected State
  checkBadge: "absolute bottom-4 right-4 z-20",
  checkIconBox: "w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-fadeIn ring-2 ring-white",

  // Functional Meta Tags
  identityBadge: "flex items-center gap-1.5 mt-1 animate-fadeIn opacity-80",
  identityText: "text-[8px] font-black text-indigo-600 uppercase tracking-[0.15em]",
};
