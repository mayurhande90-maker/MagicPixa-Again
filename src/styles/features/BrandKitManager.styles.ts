
export const BrandKitManagerStyles = {
  // Main Layout
  container: "p-[min(3vh,40px)] lg:p-[min(4vh,60px)] max-w-[1400px] mx-auto pb-32 animate-fadeIn",
  
  // --- LIST VIEW STYLES ---
  sectionTitle: "text-[clamp(20px,4vh,30px)] font-bold text-[#1A1A1E] mb-1 tracking-tight",
  sectionSubtitle: "text-gray-500 text-[clamp(10px,1.5vh,14px)] mb-[min(2vh,32px)]",

  // Grid
  brandGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[min(2vh,24px)]",

  // Add New Card
  addCard: "group relative h-[clamp(180px,25vh,256px)] rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden",
  addCardIcon: "w-[clamp(40px,7vh,64px)] h-[clamp(40px,7vh,64px)] bg-white rounded-full flex items-center justify-center shadow-sm text-gray-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300 mb-4",
  addCardText: "text-[clamp(10px,1.5vh,14px)] font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wider transition-colors",

  // Brand Card
  brandCard: "group relative h-[clamp(180px,25vh,256px)] bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col",
  brandCardHeader: "h-[45%] bg-gray-50/50 relative flex items-center justify-center p-[min(2vh,24px)] border-b border-gray-50 group-hover:bg-gray-50 transition-colors",
  brandCardLogo: "max-w-full max-h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105",
  brandCardFallback: "text-[clamp(24px,5vh,40px)] font-black text-gray-200 uppercase",
  brandCardBody: "p-[min(1.8vh,20px)] flex-1 flex flex-col justify-between",
  brandCardTitle: "font-bold text-[clamp(13px,1.8vh,18px)] text-gray-800 truncate group-hover:text-indigo-600 transition-colors",
  brandCardMeta: "text-[clamp(8px,1.1vh,12px)] text-gray-400 font-medium",
  brandCardPalette: "flex gap-1 mt-auto",
  brandCardSwatch: "w-5 h-5 rounded-full border border-gray-100 shadow-sm",
  deleteBtn: "absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10",

  // --- DETAIL VIEW STYLES ---
  detailHeader: "sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 -mx-6 -mt-6 px-[min(3vh,40px)] py-[min(1.5vh,24px)] mb-[min(3vh,32px)] flex flex-col md:flex-row justify-between items-center gap-4 transition-all",
  backBtn: "flex items-center gap-2 text-[clamp(8px,1vh,11px)] font-bold text-gray-500 hover:text-indigo-600 uppercase tracking-wide transition-colors mb-1",
  brandNameInput: "text-[clamp(18px,3.5vh,30px)] font-black text-[#1A1A1E] bg-transparent border-none focus:ring-0 p-0 placeholder-gray-300 w-full md:w-auto focus:outline-none transition-colors",
  
  actionGroup: "flex items-center gap-3",
  saveBtn: "flex items-center gap-2 bg-[#1A1A1E] text-white px-[min(2vh,24px)] py-[min(1.2vh,10px)] rounded-xl text-[clamp(11px,1.5vh,14px)] font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
  
  savingBadge: "flex items-center gap-2 text-[clamp(9px,1.2vh,12px)] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full",
  savedBadge: "flex items-center gap-2 text-[clamp(9px,1.2vh,12px)] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full",

  // Cards (Editor)
  card: "bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden",
  cardHeader: "px-[min(2vh,32px)] py-[min(1.5vh,20px)] border-b border-gray-100 flex items-center gap-3 bg-gray-50/50",
  cardIconBox: "p-[min(1vh,10px)] rounded-lg",
  cardTitle: "font-bold text-gray-800 text-[clamp(14px,2vh,18px)]",
  cardDesc: "text-[clamp(9px,1.2vh,12px)] text-gray-500",
  cardContent: "p-[min(2vh,32px)]",

  // Industry Card Grid (Responsive & Fluid)
  industryGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[min(1.5vh,16px)]",
  industryCard: "relative p-[min(1.5vh,16px)] rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 h-[clamp(90px,15vh,128px)] hover:shadow-md",
  industryCardSelected: "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20",
  industryCardInactive: "border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50",
  industryCardDisabled: "opacity-40 grayscale cursor-not-allowed border-gray-100 bg-gray-50",
  industryIconBox: "w-[clamp(32px,5vh,48px)] h-[clamp(32px,5vh,48px)] rounded-full flex items-center justify-center transition-all",
  industryLabel: "text-[clamp(10px,1.4vh,13px)] font-bold text-gray-800 uppercase tracking-wide",
  industrySub: "text-[clamp(8px,1vh,10px)] text-gray-400 font-medium leading-tight px-1",
  industryCheck: "absolute top-2 right-2 w-[clamp(16px,2.5vh,20px)] h-[clamp(16px,2.5vh,20px)] bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm animate-scaleIn",

  // Color Input
  colorInputWrapper: "group",
  colorLabel: "text-[clamp(8px,1.1vh,10px)] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block group-hover:text-gray-600 transition-colors",
  colorBox: "flex items-center gap-3 bg-white p-[min(0.8vh,8px)] rounded-xl border border-gray-200 shadow-sm group-hover:border-blue-300 group-hover:shadow-md transition-all",
  colorPreview: "relative w-[clamp(32px,5vh,40px)] h-[clamp(32px,5vh,40px)] rounded-lg overflow-hidden border border-gray-100 flex-shrink-0",
  colorField: "text-[clamp(10px,1.4vh,14px)] font-mono font-medium text-gray-700 bg-transparent border-none focus:ring-0 w-full uppercase outline-none",

  // Asset Uploader
  uploaderContainer: "flex flex-col h-full",
  uploaderHeader: "flex justify-between items-end mb-1.5",
  uploaderLabel: "text-[clamp(9px,1.3vh,12px)] font-bold text-gray-700 block",
  uploaderSubLabel: "text-[clamp(8px,1vh,10px)] text-gray-400 font-medium",
  uploaderBox: "group relative flex-1 min-h-[clamp(120px,20vh,180px)] rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden",
  uploaderBoxEmpty: "border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/30 cursor-pointer",
  uploaderBoxFilled: "border-gray-200 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-white",
  
  // Inputs
  inputLabel: "block text-[clamp(8px,1.1vh,12px)] font-bold text-gray-500 uppercase tracking-wide mb-1",
  inputField: "w-full p-[min(1.2vh,12px)] bg-gray-50 border border-gray-200 rounded-xl text-[clamp(11px,1.6vh,14px)] focus:border-indigo-500 outline-none transition-all font-medium text-gray-800",
  selectField: "w-full p-[min(1.2vh,12px)] bg-gray-50 border border-gray-200 rounded-xl text-[clamp(11px,1.6vh,14px)] focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium text-gray-800",

  // Preview Section
  previewCard: "bg-gradient-to-br from-[#1A1A1E] to-[#2C2C2E] p-1 rounded-3xl shadow-2xl",
  previewInner: "bg-white/5 backdrop-blur-xl p-[min(2vh,24px)] rounded-[20px] border border-white/10 text-white",
  previewHeader: "flex justify-between items-center mb-[min(2vh,24px)]",
  previewTag: "px-2 py-1 bg-white/10 rounded text-[clamp(8px,1vh,10px)] font-mono",
  previewLogoBox: "aspect-square rounded-xl flex items-center justify-center p-[min(2vh,24px)] relative",
};
