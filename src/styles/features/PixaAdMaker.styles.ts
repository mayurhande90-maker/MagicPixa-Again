export const AdMakerStyles = {
  // Container
  modeGrid: "grid grid-cols-2 lg:grid-cols-3 gap-3 h-full content-start px-4 py-2",
  formContainer: "space-y-8 p-2 animate-fadeIn flex flex-col h-full relative",

  // Base Card - Apple/Bento Style
  modeCard: "group relative w-full h-[100px] sm:h-[clamp(110px,16vh,140px)] rounded-[1.8rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left cursor-pointer",
  
  // Industry Variants (Gradients)
  cardEcommerce: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", 
  cardFmcg: "bg-gradient-to-br from-[#E8F5E9] via-[#F1F8E9] to-[#F9FBE7]",
  cardFashion: "bg-gradient-to-br from-[#FCE4EC] via-[#F8BBD0] to-[#F48FB1]",
  cardRealty: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", 
  cardFood: "bg-gradient-to-br from-[#FFF8E1] via-[#FFECB3] to-[#FFCC80]", 
  cardSaas: "bg-gradient-to-br from-[#E0F2F1] via-[#B2DFDB] to-[#80CBC4]", 
  cardEducation: "bg-gradient-to-br from-[#FFF3E0] via-[#FFE0B2] to-[#FFCC80]",
  cardServices: "bg-gradient-to-br from-[#E8EAF6] via-[#C5CAE9] to-[#9FA8DA]",

  // Abstract Decoration (The "Orb")
  orb: "absolute w-40 h-40 rounded-full blur-2xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none -top-10 -right-10",
  orbEcommerce: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-8 -right-8",
  orbFmcg: "bg-gradient-to-tr from-green-300 to-lime-200 -top-8 -right-8",
  orbFashion: "bg-gradient-to-tr from-pink-300 to-rose-200 -top-8 -right-8",
  orbRealty: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-8 -right-8",
  orbFood: "bg-gradient-to-tr from-orange-300 to-amber-200 -top-8 -right-8",
  orbSaas: "bg-gradient-to-tr from-teal-300 to-cyan-200 -top-8 -right-8",
  orbEducation: "bg-gradient-to-tr from-amber-300 to-orange-200 -top-8 -right-8",
  orbServices: "bg-gradient-to-tr from-indigo-300 to-blue-200 -top-8 -right-8",

  // Icon Box (Glassmorphism)
  iconGlass: "absolute top-3 left-3 w-10 h-10 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  iconEcommerce: "text-blue-600",
  iconFmcg: "text-green-600",
  iconFashion: "text-pink-600",
  iconRealty: "text-purple-600",
  iconFood: "text-orange-600",
  iconSaas: "text-teal-600",
  iconEducation: "text-amber-600",
  iconServices: "text-indigo-600",
  
  // Content Layout
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-4 z-10",
  title: "text-[13px] font-black text-gray-900 tracking-tight leading-none mb-0.5",
  desc: "text-[8px] font-bold text-gray-500 uppercase tracking-widest",

  // Action Indicator
  actionBtn: "absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300",
  actionIcon: "w-4 h-4 text-gray-900",

  backButton: "flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100 mb-4",
  
  // Engine Cards for Mode step
  engineGrid: "grid grid-cols-2 gap-4 mb-8",
  engineCard: "group relative w-full h-[clamp(110px,16vh,140px)] rounded-[1.8rem] overflow-hidden border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer text-left flex flex-col justify-end p-5",
  engineCardInactive: "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg opacity-80 hover:opacity-100",
  engineCardActive: "bg-indigo-50/50 border-indigo-500 shadow-lg ring-2 ring-indigo-500/20",
  
  engineOrb: "absolute w-24 h-24 rounded-full blur-2xl transition-all duration-500 -top-8 -right-8 pointer-events-none opacity-0 group-hover:opacity-100",
  engineOrbProduct: "bg-blue-400/20 opacity-100",
  engineOrbModel: "bg-purple-400/20 opacity-100",
  engineIconBox: "absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110",
  engineIconProduct: "text-blue-600",
  engineIconModel: "text-purple-600",

  // Scan Animation
  scanOverlay: "absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] rounded-3xl overflow-hidden flex items-center justify-center",
  analysisBadge: "bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10 z-40 animate-bounce-slight",
  scanLine: "absolute top-0 h-full w-[3px] bg-[#4D7CFF] shadow-[0_0_20px_#4D7CFF] animate-[scan-horizontal_1.5s_linear_infinite] z-30",
  scanGradient: "absolute top-0 h-full w-48 bg-gradient-to-l from-[#4D7CFF]/30 to-transparent animate-[scan-horizontal_1.5s_linear_infinite] -translate-x-full z-20",
  scanText: "text-xs font-bold tracking-widest uppercase",
  
  // AI Suggestions
  suggestionContainer: "space-y-3 mt-4 animate-fadeIn",
  suggestionCapsule: "group relative p-4 rounded-2xl border-2 border-transparent bg-white hover:bg-indigo-50/30 transition-all duration-300 cursor-pointer overflow-hidden",
  suggestionCapsuleActive: "!border-indigo-500 !bg-indigo-50/50 shadow-md",
  suggestionGradientBorder: "absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10",
  suggestionGradientBorderActive: "opacity-100",
  suggestionText: "text-sm font-medium text-gray-700 italic leading-relaxed",
  suggestionHeadline: "text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 block",

  // Generate Button
  generateButton: "w-full py-4 rounded-2xl bg-[#F9D230] text-[#1A1A1E] font-black text-sm uppercase tracking-widest shadow-lg shadow-yellow-500/30 hover:scale-[1.02] hover:bg-[#dfbc2b] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-auto flex items-center justify-center gap-2 border-none",
};
