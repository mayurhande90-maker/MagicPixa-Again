
export const RestoreStyles = {
  // Container for the bento cards
  modeGrid: "grid grid-cols-2 gap-4 mb-8",

  // Base Card Structure (High-end Apple/Bento Style) - Added fluid height
  modeCard: "group relative w-full h-[clamp(160px,22vh,210px)] rounded-[2rem] overflow-hidden transition-all duration-500 ease-out border text-left cursor-pointer",
  
  // Interactive States
  modeCardRestore: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", // Sophisticated tech blue
  modeCardColor: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", // Professional warm purple/pink
  
  modeCardSelected: "ring-2 ring-indigo-500 shadow-2xl shadow-indigo-500/20 scale-[1.02] z-10 border-transparent",
  modeCardInactive: "border-white/60 opacity-80 hover:opacity-100 hover:shadow-lg hover:-translate-y-1",

  // Animated Background Decorative Orbs
  orb: "absolute w-32 h-32 rounded-full blur-2xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none",
  orbRestore: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-8 -right-8",
  orbColor: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-8 -right-8",

  // Glassmorphic Icon Container - Applied fluid sizing and better padding
  iconGlass: "absolute top-5 left-5 w-[clamp(44px,7vh,58px)] h-[clamp(44px,7vh,58px)] rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60 p-2.5",
  
  // Text content at the bottom - Applied fluid typography
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-6 z-10",
  title: "text-[clamp(13px,2vh,18px)] font-black text-gray-900 mb-1 tracking-tight group-hover:translate-x-1 transition-transform duration-300 leading-tight",
  desc: "text-[clamp(8.5px,1.2vh,11px)] text-gray-500 font-bold leading-snug max-w-[95%] group-hover:text-gray-800 transition-colors uppercase tracking-wider",

  // Checkmark Badge for Selected State
  checkBadge: "absolute bottom-5 right-5 z-20",
  checkIconBox: "w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-fadeIn ring-2 ring-white",

  // Functional Meta Tags
  identityBadge: "flex items-center gap-1.5 mt-1.5 animate-fadeIn opacity-80",
  identityText: "text-[8px] font-black text-indigo-600 uppercase tracking-[0.15em]",
};
