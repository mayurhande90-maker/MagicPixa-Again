
export const MobileTryOnStyles = {
    // Theme Colors - Updated to Indigo/Blue
    accent: "text-indigo-600",
    accentBg: "bg-indigo-600",
    accentBorder: "border-indigo-100",
    accentLight: "bg-indigo-50",
    
    // Step Components
    stepLabel: "text-[8px] font-black uppercase tracking-[0.2em] transition-all",
    stepBar: "h-1.5 w-full rounded-full transition-all duration-500",
    
    // Options
    optionBtn: "shrink-0 px-6 py-3.5 rounded-2xl text-xs font-bold border transition-all duration-300 transform active:scale-95",
    optionActive: "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 shadow-xl",
    optionInactive: "bg-white text-slate-500 border-slate-100 shadow-sm",
    
    // Canvas
    canvasBox: "w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative bg-white shadow-2xl border border-gray-100",
    garmentShelf: "absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl animate-fadeIn",
    shelfItem: "w-10 h-12 bg-white rounded-lg border border-indigo-100 p-1 flex items-center justify-center overflow-hidden shadow-sm",
    
    // Animations
    weaveScan: "absolute inset-0 z-40 pointer-events-none",
    scanLine: "absolute top-0 h-full w-[2px] bg-indigo-400 shadow-[0_0_15px_#6366f1] animate-weave-scan",
    
    // Navigation
    backBtn: "p-2 rounded-full bg-gray-100 text-gray-500 active:bg-gray-200",
    creditsPill: "flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100",
    
    // Custom Refine Sheet Icon
    refineIcon: "w-5 h-5 text-indigo-600"
};
