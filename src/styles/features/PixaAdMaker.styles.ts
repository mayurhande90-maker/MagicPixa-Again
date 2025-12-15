
export const AdMakerStyles = {
  // Container
  modeGrid: "grid grid-cols-1 md:grid-cols-2 gap-4 h-full content-start",

  // Base Card - Apple/Bento Style
  modeCard: "group relative w-full h-48 rounded-[2rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left cursor-pointer",
  
  // Industry Variants (Gradients)
  cardEcommerce: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", // Blue
  cardRealty: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", // Purple/Orange
  cardFood: "bg-gradient-to-br from-[#FFF8E1] via-[#FFECB3] to-[#FFCC80]", // Amber/Orange
  cardSaaS: "bg-gradient-to-br from-[#E0F2F1] via-[#B2DFDB] to-[#80CBC4]", // Teal/Emerald

  // Abstract Decoration (The "Orb")
  orb: "absolute w-64 h-64 rounded-full blur-3xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none",
  orbEcommerce: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-20 -right-20",
  orbRealty: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-20 -right-20",
  orbFood: "bg-gradient-to-tr from-orange-400 to-yellow-300 -top-20 -right-20",
  orbSaaS: "bg-gradient-to-tr from-teal-400 to-emerald-300 -top-20 -right-20",

  // Content Layout
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-6 z-10",
  
  // Icon Box (Glassmorphism)
  iconGlass: "absolute top-5 left-5 w-14 h-14 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  iconEcommerce: "text-blue-600",
  iconRealty: "text-purple-600",
  iconFood: "text-orange-600",
  iconSaaS: "text-teal-700",

  // Typography
  title: "text-xl font-black text-gray-900 mb-1 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  desc: "text-xs text-gray-600 font-medium leading-relaxed max-w-[90%] group-hover:text-gray-800 transition-colors",

  // Action Indicator (Arrow circle)
  actionBtn: "absolute bottom-5 right-5 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-5 h-5 text-gray-900",

  // Form Layout
  backButton: "flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100 mb-4",
  formContainer: "space-y-6 animate-fadeIn p-1",
  sectionHeader: "flex items-center gap-2 mb-3 border-b border-gray-100 pb-2",
  stepBadge: "flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold",
  sectionTitle: "text-xs font-bold text-gray-500 uppercase tracking-wider",
  
  // Input Groups
  grid2: "grid grid-cols-2 gap-3",
};
