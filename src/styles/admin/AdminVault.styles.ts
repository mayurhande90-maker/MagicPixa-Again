
export const VaultStyles = {
  container: "space-y-8 animate-fadeIn",
  
  // Folder Grid
  folderGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
  
  // Folder Card
  folderCard: "group relative bg-white rounded-3xl border border-gray-200 p-6 flex flex-col items-center text-center gap-4 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer overflow-hidden",
  folderOrb: "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500",
  folderIconBox: "w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all shadow-sm",
  folderTitle: "text-lg font-black text-gray-800 tracking-tight",
  folderCount: "text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] bg-gray-50 px-2 py-1 rounded-md",
  
  // Active Folder View
  header: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm",
  backBtn: "flex items-center gap-2 text-xs font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors mb-2",
  dnaInput: "w-full p-6 bg-gray-900 text-indigo-100 rounded-3xl border border-white/10 font-medium text-sm leading-relaxed focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none h-48 placeholder-gray-600 shadow-inner",
  
  // Upload Area
  uploadZone: "group relative h-64 rounded-[2.5rem] border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-400 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer",
  uploadIcon: "w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-indigo-600 shadow-sm transition-all group-hover:scale-110",

  // Asset Grid
  assetGrid: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6",
  assetCard: "group relative aspect-square rounded-[2rem] bg-white border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all",
  assetImage: "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
  assetDeleteBtn: "absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-red-500 shadow-xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-red-500 hover:text-white"
};
