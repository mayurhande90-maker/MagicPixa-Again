
export const BrandKitManagerStyles = {
  // Main Layout
  container: "p-6 lg:p-10 max-w-[1400px] mx-auto pb-32 animate-fadeIn",
  
  // --- LIST VIEW STYLES ---
  
  // Section Title
  sectionTitle: "text-3xl font-bold text-[#1A1A1E] mb-2 tracking-tight",
  sectionSubtitle: "text-gray-500 text-sm mb-8",

  // Grid
  brandGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",

  // Add New Card
  addCard: "group relative h-64 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden",
  addCardIcon: "w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300 mb-4",
  addCardText: "text-sm font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wider transition-colors",

  // Brand Card
  brandCard: "group relative h-64 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col",
  brandCardHeader: "h-32 bg-gray-50/50 relative flex items-center justify-center p-6 border-b border-gray-50 group-hover:bg-gray-50 transition-colors",
  brandCardLogo: "max-w-full max-h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105",
  brandCardFallback: "text-4xl font-black text-gray-200 uppercase",
  brandCardBody: "p-5 flex-1 flex flex-col justify-between",
  brandCardTitle: "font-bold text-lg text-gray-800 truncate group-hover:text-indigo-600 transition-colors",
  brandCardMeta: "text-xs text-gray-400 font-medium",
  brandCardPalette: "flex gap-1.5 mt-3",
  brandCardSwatch: "w-6 h-6 rounded-full border border-gray-100 shadow-sm",
  deleteBtn: "absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10",

  // --- DETAIL VIEW STYLES ---
  
  // Header
  detailHeader: "sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 -mx-6 -mt-6 px-6 py-4 lg:px-10 lg:py-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 transition-all",
  backBtn: "flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 uppercase tracking-wide transition-colors mb-1",
  
  // Brand Name Input in Header
  brandNameInput: "text-2xl lg:text-3xl font-black text-[#1A1A1E] bg-transparent border-none focus:ring-0 p-0 placeholder-gray-300 w-full md:w-auto focus:outline-none transition-colors",
  
  // Header Actions
  actionGroup: "flex items-center gap-3",
  magicBtn: "flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 transition-all active:scale-95",
  saveBtn: "flex items-center gap-2 bg-[#1A1A1E] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
  
  // Save Indicators
  savingBadge: "flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full",
  savedBadge: "flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full",

  // Cards (Editor)
  card: "bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden",
  cardHeader: "px-8 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50",
  cardIconBox: "p-2 rounded-lg",
  cardTitle: "font-bold text-gray-800 text-lg",
  cardDesc: "text-xs text-gray-500",
  cardContent: "p-8",

  // Color Input
  colorInputWrapper: "group",
  colorLabel: "text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block group-hover:text-gray-600 transition-colors",
  colorBox: "flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm group-hover:border-blue-300 group-hover:shadow-md transition-all",
  colorPreview: "relative w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0",
  colorField: "text-sm font-mono font-medium text-gray-700 bg-transparent border-none focus:ring-0 w-full uppercase outline-none",

  // Asset Uploader
  uploaderContainer: "flex flex-col h-full",
  uploaderHeader: "flex justify-between items-end mb-2",
  uploaderLabel: "text-xs font-bold text-gray-700 block",
  uploaderSubLabel: "text-[10px] text-gray-400 font-medium",
  uploaderBox: "group relative flex-1 min-h-[180px] rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden",
  uploaderBoxEmpty: "border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/30 cursor-pointer",
  uploaderBoxFilled: "border-gray-200 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-white",
  
  // Inputs
  inputLabel: "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5",
  inputField: "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all font-medium text-gray-800",
  selectField: "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium text-gray-800",

  // Preview Section
  previewCard: "bg-gradient-to-br from-[#1A1A1E] to-[#2C2C2E] p-1 rounded-3xl shadow-2xl",
  previewInner: "bg-white/5 backdrop-blur-xl p-6 rounded-[20px] border border-white/10 text-white",
  previewHeader: "flex justify-between items-center mb-6",
  previewTag: "px-2 py-1 bg-white/10 rounded text-[10px] font-mono",
  previewLogoBox: "aspect-square rounded-xl flex items-center justify-center p-6 relative",
};
