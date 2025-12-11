
export const BrandStylistStyles = {
  // Container for the mode cards
  modeGrid: "grid grid-cols-2 gap-4 mb-6",

  // Base Card Style (Matches PhotoStudio structure)
  modeCard: "group relative w-full h-48 rounded-[1.5rem] overflow-hidden transition-all duration-500 ease-out border text-left",
  
  // Interactive States
  modeCardReplica: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE] border-blue-200 shadow-xl shadow-blue-100 hover:-translate-y-1 ring-1 ring-blue-300", 
  modeCardRemix: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC] border-purple-200 shadow-xl shadow-purple-100 hover:-translate-y-1 ring-1 ring-purple-300", 
  modeCardInactive: "bg-white border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-200 hover:shadow-lg scale-95 hover:scale-100",

  // Animated Background Orbs
  orb: "absolute w-48 h-48 rounded-full blur-3xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none",
  orbReplica: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-10 -right-10",
  orbRemix: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-10 -right-10",

  // Glassmorphic Icon Container
  iconGlass: "absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  iconReplica: "text-blue-600",
  iconRemix: "text-purple-600",
  iconInactive: "text-gray-400",

  // Content Layout
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-5 z-10",

  // Typography
  modeTitle: "text-lg font-black text-gray-900 mb-1 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  
  modeDesc: "text-[10px] font-medium leading-relaxed text-gray-600 max-w-[90%] group-hover:text-gray-800",

  // Action Button (Arrow)
  actionBtn: "absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-4 h-4 text-gray-900",

  // Language Tabs
  languageButton: "flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all duration-200",
  langActive: "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200",
  langInactive: "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
};
