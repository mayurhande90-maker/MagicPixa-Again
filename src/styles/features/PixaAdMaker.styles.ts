
export const AdMakerStyles = {
  // Main Selection Grid
  modeGrid: "grid grid-cols-1 sm:grid-cols-2 gap-4 h-full content-start",

  // Bento Style Mode Cards
  modeCard: "group relative w-full h-[clamp(120px,20vh,160px)] rounded-[2rem] overflow-hidden transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-gray-200 hover:-translate-y-1 border border-white/60 text-left cursor-pointer",
  
  // Specific Industry Colors
  cardEcommerce: "bg-gradient-to-br from-[#E3F2FD] via-[#F1F8FF] to-[#E1F5FE]",
  cardFmcg: "bg-gradient-to-br from-[#E8F5E9] via-[#F1F8E9] to-[#DCEDC8]",
  cardFashion: "bg-gradient-to-br from-[#FCE4EC] via-[#F8BBD0] to-[#F48FB1]",
  cardRealty: "bg-gradient-to-br from-[#F3E5F5] via-[#FFF3E0] to-[#FCE4EC]",
  cardFood: "bg-gradient-to-br from-[#FFF8E1] via-[#FFECB3] to-[#FFCC80]",
  cardSaas: "bg-gradient-to-br from-[#E0F2F1] via-[#B2DFDB] to-[#80CBC4]",
  cardEducation: "bg-gradient-to-br from-[#FFF3E0] via-[#FFE0B2] to-[#FFCC80]",
  cardServices: "bg-gradient-to-br from-[#EDE7F6] via-[#D1C4E9] to-[#B39DDB]",

  // Decorative Elements
  orb: "absolute w-48 h-48 rounded-full blur-3xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none",
  orbEcommerce: "bg-gradient-to-tr from-blue-300 to-cyan-200 -top-10 -right-10",
  orbRealty: "bg-gradient-to-tr from-purple-300 to-orange-200 -top-10 -right-10",
  orbFood: "bg-gradient-to-tr from-orange-400 to-yellow-300 -top-10 -right-10",
  orbSaaS: "bg-gradient-to-tr from-teal-400 to-emerald-300 -top-10 -right-10",

  // Layouts
  contentWrapper: "absolute inset-0 flex flex-col justify-end p-6 z-10",
  iconGlass: "absolute top-4 left-4 w-12 h-12 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/60 p-2",
  
  title: "text-lg font-black text-gray-900 mb-1 tracking-tight group-hover:translate-x-1 transition-transform duration-300 leading-tight",
  desc: "text-[10px] text-gray-600 font-bold uppercase tracking-widest max-w-[90%] group-hover:text-gray-800 transition-colors",

  actionBtn: "absolute bottom-6 right-6 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75",
  actionIcon: "w-4 h-4 text-gray-900",

  // Navigation & Grouping
  backButton: "flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors mb-4",
  formContainer: "space-y-8 animate-fadeIn",
  sectionHeader: "flex items-center gap-2 mb-4 border-b border-gray-100 pb-2",
  stepBadge: "flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black",
  sectionTitle: "text-xs font-black text-gray-500 uppercase tracking-[0.15em]",
};
