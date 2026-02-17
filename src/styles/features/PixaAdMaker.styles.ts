
export const AdMakerStyles = {
  // Container
  modeGrid: "grid grid-cols-2 gap-3 h-full content-start px-4 py-2",
  // Added missing formContainer property
  formContainer: "space-y-8 p-2 animate-fadeIn flex flex-col h-full relative",

  // Base Card - Apple/Bento Style - Fluid Height
  modeCard: "group relative w-full h-[clamp(110px,16vh,140px)] rounded-[1.8rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left cursor-pointer",
  
  // Industry Variants (Gradients)
  cardEcommerce: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]", 
  cardRealty: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]", 
  cardFood: "bg-gradient-to-br from-[#FFF8E1] via-[#FFECB3] to-[#FFCC80]", 
  cardSaaS: "bg-gradient-to-br from-[#E0F2F1] via-[#B2DFDB] to-[#80CBC4]", 

  // Abstract Decoration (The "Orb")
  orb: "absolute w-40 h-40 rounded-full blur-2xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none -top-10 -right-10",
  // Added missing orbEcommerce property
  orbEcommerce: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-8 -right-8",

  // Icon Box (Glassmorphism) - Fluid Sizing
  iconGlass: "absolute top-3 left-3 w-10 h-10 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60",
  // Added missing iconEcommerce property
  iconEcommerce: "text-blue-600",
  
  // Content Layout
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-4 z-10",
  title: "text-[13px] font-black text-gray-900 tracking-tight leading-none mb-0.5",
  desc: "text-[8px] font-bold text-gray-500 uppercase tracking-widest",

  // Action Indicator
  actionBtn: "absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300",
  // Added missing actionIcon property
  actionIcon: "w-4 h-4 text-gray-900",

  // Form Layout refinements
  backButton: "flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100 mb-4",
  sectionTitle: "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1",
  // Added missing sectionHeader and stepBadge properties
  sectionHeader: "flex items-center gap-3 mb-4",
  stepBadge: "flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold ring-4 ring-white",
  
  // Engine Cards for Mode step
  engineGrid: "grid grid-cols-2 gap-4 mb-8",
  engineCard: "group relative w-full h-[clamp(110px,16vh,140px)] rounded-[1.8rem] overflow-hidden border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer text-left flex flex-col justify-end p-5",
  engineCardSelected: "border-indigo-600 shadow-2xl shadow-indigo-500/20 ring-4 ring-indigo-500/5 scale-[1.02] z-10",
  engineCardInactive: "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg opacity-80 hover:opacity-100",
  
  // Added missing engine state properties
  engineOrb: "absolute w-24 h-24 rounded-full blur-2xl transition-all duration-500 -top-8 -right-8 pointer-events-none opacity-0 group-hover:opacity-100",
  engineOrbProduct: "bg-blue-400/20 opacity-100",
  engineOrbModel: "bg-purple-400/20 opacity-100",
  engineIconBox: "absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110",
  engineIconProduct: "text-blue-600",
  engineIconModel: "text-purple-600",
  
  engineTitle: "text-sm font-black text-gray-900 tracking-tight leading-none mb-1 z-10",
  engineDesc: "text-[9px] font-bold text-gray-500 uppercase tracking-widest z-10",

  // Checkmark Badge
  engineCheckBadge: "absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg animate-scaleIn border-2 border-white z-20",

  // Added missing shelf (Inventory) properties
  shelfContainer: "flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1",
  shelfCard: "relative min-w-[80px] h-20 bg-white rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden flex items-center justify-center p-2 shadow-sm",
  shelfCardSelected: "border-indigo-500 shadow-md scale-[1.02]",
  shelfCardInactive: "border-gray-200 hover:border-indigo-200 hover:bg-gray-50",
  shelfImage: "w-full h-full object-contain",
  shelfCheck: "absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm",
  shelfAdd: "flex flex-col items-center gap-1 opacity-50",
  shelfAddText: "text-[8px] font-black uppercase tracking-tighter",

  // Added missing Blueprint (Layout) properties
  blueprintGrid: "grid grid-cols-3 gap-2 mb-6",
  blueprintCard: "relative p-3 h-20 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center justify-center text-center overflow-hidden",
  blueprintCardSelected: "border-indigo-600 bg-indigo-50/50 shadow-md",
  blueprintCardInactive: "border-gray-100 bg-white hover:border-indigo-200",
  blueprintLabel: "text-[9px] font-black text-gray-600 uppercase tracking-tighter leading-tight",
  blueprintCheck: "absolute top-1.5 right-1.5 text-indigo-600",

  // Added missing Model Selection properties
  modelSelectionGrid: "grid grid-cols-2 gap-4 mb-6",
  modelSelectionCard: "group relative w-full h-24 rounded-2xl border transition-all duration-300 ease-out flex flex-col items-center justify-center gap-2 overflow-hidden text-center cursor-pointer",
  modelSelectionCardSelected: "border-indigo-500/30 bg-gradient-to-br from-[#E0E7FF] to-[#EEF2FF] shadow-md ring-1 ring-indigo-500/20 -translate-y-0.5",
  modelSelectionCardInactive: "border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm hover:-translate-y-0.5",

  // Language Tabs
  languageButton: "flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all duration-200",
  langActive: "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200",
  langInactive: "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
};
