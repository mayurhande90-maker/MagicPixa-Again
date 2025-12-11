
export const BrandStylistStyles = {
  // Container for the mode cards
  modeGrid: "grid grid-cols-2 gap-3 mb-6",

  // Base Card Style (Premium)
  modeCard: "group relative w-full h-32 rounded-2xl overflow-hidden transition-all duration-500 ease-out border text-left flex flex-col justify-end p-4",
  
  // Interactive States
  modeCardReplica: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE] border-blue-100 hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1", // Cool Blue
  modeCardRemix: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC] border-purple-100 hover:shadow-lg hover:shadow-purple-100 hover:-translate-y-1", // Warm Purple
  modeCardInactive: "bg-white border-gray-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100",

  // Animated Background Orbs
  orb: "absolute w-40 h-40 rounded-full blur-3xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none",
  orbReplica: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-12 -right-12",
  orbRemix: "bg-gradient-to-tr from-purple-300 to-pink-200 -top-12 -right-12",

  // Glassmorphic Icon Container
  iconGlass: "absolute top-3 left-3 w-9 h-9 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  iconReplica: "text-blue-600",
  iconRemix: "text-purple-600",
  iconInactive: "text-gray-400",

  // Typography
  modeTitle: "text-sm font-black text-gray-900 mb-0.5 tracking-tight relative z-10 group-hover:translate-x-0.5 transition-transform duration-300",
  titleReplica: "text-blue-900",
  titleRemix: "text-purple-900",
  titleInactive: "text-gray-600",

  modeDesc: "text-[10px] font-medium leading-tight relative z-10 max-w-[90%]",
  descReplica: "text-blue-600/80",
  descRemix: "text-purple-600/80",
  descInactive: "text-gray-400",

  // Language Tabs
  languageButton: "flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all duration-200",
  langActive: "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200",
  langInactive: "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
};
