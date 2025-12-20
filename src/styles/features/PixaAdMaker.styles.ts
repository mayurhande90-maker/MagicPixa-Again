
export const AdMakerStyles = {
  // Container
  modeGrid: "grid grid-cols-1 md:grid-cols-2 gap-3 h-full content-start",

  // Base Card - Apple/Bento Style
  modeCard: "group relative w-full h-40 rounded-[1.5rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left cursor-pointer",
  
  // Industry Variants (Gradients)
  cardEcommerce: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", // Blue
  cardRealty: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", // Purple/Orange
  cardFood: "bg-gradient-to-br from-[#FFF8E1] via-[#FFECB3] to-[#FFCC80]", // Amber/Orange
  cardSaaS: "bg-gradient-to-br from-[#E0F2F1] via-[#B2DFDB] to-[#80CBC4]", // Teal/Emerald

  // Abstract Decoration (The "Orb")
  orb: "absolute w-48 h-48 rounded-full blur-3xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none",
  orbEcommerce: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-10 -right-10",
  orbRealty: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-10 -right-10",
  orbFood: "bg-gradient-to-tr from-orange-400 to-yellow-300 -top-10 -right-10",
  orbSaaS: "bg-gradient-to-tr from-teal-400 to-emerald-300 -top-10 -right-10",

  // Content Layout
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-5 z-10",
  
  // Icon Box (Glassmorphism)
  iconGlass: "absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  iconEcommerce: "text-blue-600",
  iconRealty: "text-purple-600",
  iconFood: "text-orange-600",
  iconSaaS: "text-teal-700",

  // Typography
  title: "text-lg font-black text-gray-900 mb-0.5 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  desc: "text-[10px] text-gray-600 font-medium leading-relaxed max-w-[90%] group-hover:text-gray-800 transition-colors",

  // Action Indicator (Arrow circle)
  actionBtn: "absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-4 h-4 text-gray-900",

  // Form Layout
  backButton: "flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100 mb-4",
  formContainer: "space-y-6 animate-fadeIn p-1",
  sectionHeader: "flex items-center gap-2 mb-3 border-b border-gray-100 pb-2",
  stepBadge: "flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold",
  sectionTitle: "text-xs font-bold text-gray-500 uppercase tracking-wider",
  
  // Input Groups
  grid2: "grid grid-cols-2 gap-3",

  // Blueprint Styles
  blueprintGrid: "grid grid-cols-2 sm:grid-cols-3 gap-3",
  blueprintCard: "relative p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center gap-2 min-h-[90px] group overflow-hidden bg-white hover:shadow-md",
  blueprintCardSelected: "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20",
  blueprintCardInactive: "border-gray-100 hover:border-indigo-200",
  blueprintLabel: "text-[10px] font-bold uppercase tracking-wider z-10 relative",
  blueprintCheck: "absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white z-10 animate-scaleIn",
};
