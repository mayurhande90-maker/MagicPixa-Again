export const AdMakerStyles = {
  // Container
  modeGrid: "grid grid-cols-1 md:grid-cols-2 gap-3 h-full content-start",

  // Base Card - Apple/Bento Style - Fluid Height
  modeCard: "group relative w-full h-[clamp(100px,18vh,160px)] rounded-[1.5rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left cursor-pointer",
  
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
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-[min(1.5vh,20px)] z-10",
  
  // Icon Box (Glassmorphism) - Fluid Sizing
  iconGlass: "absolute top-3 left-3 w-[clamp(32px,5vh,48px)] h-[clamp(32px,5vh,48px)] rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  iconEcommerce: "text-blue-600",
  iconRealty: "text-purple-600",
  iconFood: "text-orange-600",
  iconSaaS: "text-teal-700",

  // Typography - Fluid Sizing
  title: "text-[clamp(13px,1.8vh,18px)] font-black text-gray-900 mb-0.5 tracking-tight group-hover:translate-x-1 transition-transform duration-300",
  desc: "text-[clamp(8px,1.1vh,10px)] text-gray-600 font-medium leading-relaxed max-w-[90%] group-hover:text-gray-800 transition-colors",

  // Action Indicator (Arrow circle)
  actionBtn: "absolute bottom-3 right-3 w-[clamp(24px,3.5vh,32px)] h-[clamp(24px,3.5vh,32px)] rounded-full bg-white flex items-center justify-center shadow-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-3 h-3 lg:w-4 lg:h-4 text-gray-900",

  // Form Layout
  backButton: "flex items-center gap-2 text-[clamp(8px,1.1vh,12px)] font-bold text-gray-400 hover:text-gray-700 transition-colors p-1.5 lg:p-2 rounded-lg hover:bg-gray-100 mb-2 lg:mb-4",
  formContainer: "space-y-[min(1.5vh,16px)] animate-fadeIn p-1",
  sectionHeader: "flex items-center gap-2 mb-2 lg:mb-3 border-b border-gray-100 pb-1.5 lg:pb-2",
  stepBadge: "flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-indigo-100 text-indigo-700 text-[clamp(8px,1vh,10px)] font-bold",
  sectionTitle: "text-[clamp(8px,1.1vh,12px)] font-bold text-gray-500 uppercase tracking-wider",
  
  // Segment Toggle
  segmentContainer: "flex bg-gray-50 p-1 rounded-xl border border-gray-100 w-full mb-4",
  segmentButton: "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
  segmentActive: "bg-white text-indigo-600 shadow-sm",
  segmentInactive: "text-gray-400 hover:text-gray-600",

  // Input Groups
  grid2: "grid grid-cols-2 gap-2 lg:gap-3",

  // Blueprint Styles - Compact refinements
  blueprintGrid: "grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-5 gap-2",
  blueprintCard: "relative p-1.5 lg:p-2 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center gap-1 min-h-[clamp(50px,8vh,75px)] group overflow-hidden bg-white hover:shadow-md",
  blueprintCardSelected: "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20 shadow-md",
  blueprintCardInactive: "border-gray-100 hover:border-indigo-200",
  blueprintLabel: "text-[clamp(7.5px,1vh,9.5px)] font-black uppercase tracking-tight z-10 relative leading-none text-center",
  blueprintCheck: "absolute top-1 right-1 w-3 h-3 bg-indigo-600 rounded-full flex items-center justify-center text-white z-10 animate-scaleIn shadow-sm",

  // Smart Product Shelf Styles
  shelfContainer: "flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1",
  shelfCard: "relative shrink-0 w-[clamp(80px,12vh,110px)] h-[clamp(80px,12vh,110px)] rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden bg-white",
  shelfCardSelected: "border-indigo-600 ring-4 ring-indigo-100 shadow-md",
  shelfCardInactive: "border-gray-100 hover:border-indigo-300 hover:shadow-sm",
  
  shelfImage: "w-full h-full object-contain p-2",
  shelfCheck: "absolute top-1.5 right-1.5 bg-indigo-600 text-white p-0.5 rounded-full shadow-sm animate-scaleIn",
  
  shelfAdd: "flex flex-col items-center justify-center gap-1 text-gray-400 group hover:text-indigo-600",
  shelfAddIcon: "w-6 h-6 p-1.5 bg-gray-50 rounded-lg border border-gray-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all",
  shelfAddText: "text-[9px] font-black uppercase tracking-widest",

  // Model Selection (Consistency with Merchant Studio)
  modelSelectionGrid: "grid grid-cols-2 gap-3 mb-4",
  modelSelectionCard: "group relative w-full h-24 rounded-2xl border transition-all duration-300 ease-out flex flex-col items-center justify-center gap-2 overflow-hidden text-center cursor-pointer",
  modelSelectionCardSelected: "border-indigo-500/30 bg-gradient-to-br from-[#E0E7FF] to-[#EEF2FF] shadow-md ring-1 ring-indigo-500/20 -translate-y-0.5",
  modelSelectionCardInactive: "border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm hover:-translate-y-0.5",

  // Logo Preview Styles - Reduced height from h-32 to h-24 for side-by-side balance
  logoPreviewBox: "relative h-24 w-full bg-white border border-indigo-100 rounded-2xl flex items-center justify-center p-4 overflow-hidden group/logo shadow-sm",
  logoBlueprintBg: "absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#4D7CFF_1px,transparent_1px)] [background-size:16px_16px]",

  // New Bento Mode Selector Styles
  engineGrid: "grid grid-cols-2 gap-4 mb-8",
  engineCard: "group relative w-full h-[clamp(110px,16vh,140px)] rounded-[1.8rem] overflow-hidden border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer text-left flex flex-col justify-end p-5",
  engineCardSelected: "border-indigo-600 shadow-2xl shadow-indigo-500/20 ring-4 ring-indigo-500/5 scale-[1.02] z-10",
  engineCardInactive: "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg opacity-80 hover:opacity-100",
  
  engineOrb: "absolute w-40 h-40 rounded-full blur-2xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none -top-10 -right-10",
  engineOrbProduct: "bg-gradient-to-tr from-blue-300 to-cyan-200",
  engineOrbModel: "bg-gradient-to-tr from-purple-300 to-pink-200",

  engineIconBox: "absolute top-4 left-4 w-11 h-11 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110",
  engineIconProduct: "text-blue-600",
  engineIconModel: "text-purple-600",
  
  engineTitle: "text-sm font-black text-gray-900 tracking-tight leading-none mb-1 z-10",
  engineDesc: "text-[9px] font-bold text-gray-500 uppercase tracking-widest z-10",

  engineCheckBadge: "absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg animate-scaleIn border-2 border-white z-20",
};