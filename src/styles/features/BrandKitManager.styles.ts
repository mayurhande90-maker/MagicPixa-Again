
export const BrandKitManagerStyles = {
  // Main Layout
  container: "p-6 lg:p-10 max-w-[1400px] mx-auto pb-32 animate-fadeIn",
  
  // Header
  headerContainer: "flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 border-b border-gray-100 pb-6",
  headerTitleWrapper: "flex items-center gap-3 mb-2",
  headerIconBox: "p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200",
  headerTitle: "flex items-center gap-2 text-2xl font-bold text-[#1A1A1E] hover:text-indigo-600 transition-colors",
  headerSubtitle: "text-gray-500 text-sm",
  
  // Brand Menu
  menuDropdown: "absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fadeIn",
  menuHeader: "p-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider",
  menuItem: "group flex items-center justify-between hover:bg-indigo-50 p-3 transition-colors cursor-pointer",
  menuItemText: "flex-1 text-left text-sm font-bold text-gray-700 group-hover:text-indigo-700 truncate",
  menuAddBtn: "w-full p-3 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:bg-gray-50 border-t border-gray-100 transition-colors",

  // Action Buttons
  autoFillBtn: "text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-purple-100 transition-colors",
  saveIndicator: "flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100 shadow-sm transition-all animate-pulse",
  syncedIndicator: "flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100 shadow-sm transition-all",

  // Cards
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
  uploaderBox: "group relative flex-1 min-h-[140px] rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden",
  uploaderBoxEmpty: "border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/30 cursor-pointer",
  uploaderBoxFilled: "border-gray-200 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-white",
  
  // Inputs
  inputLabel: "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5",
  inputField: "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 outline-none transition-all",
  selectField: "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 outline-none transition-all cursor-pointer",

  // Preview Section
  previewCard: "bg-gradient-to-br from-[#1A1A1E] to-[#2C2C2E] p-1 rounded-3xl shadow-2xl",
  previewInner: "bg-white/5 backdrop-blur-xl p-6 rounded-[20px] border border-white/10 text-white",
  previewHeader: "flex justify-between items-center mb-6",
  previewTag: "px-2 py-1 bg-white/10 rounded text-[10px] font-mono",
  previewLogoBox: "aspect-square rounded-xl flex items-center justify-center p-6 relative",
};
