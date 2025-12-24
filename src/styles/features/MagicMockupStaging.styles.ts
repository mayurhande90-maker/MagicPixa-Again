
export const MockupStagingStyles = {
    container: "space-y-8 p-1 animate-fadeIn flex flex-col h-full relative",
    
    // Bento Grid for Objects
    objectGrid: "grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6",
    objectCard: "relative p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center gap-2 min-h-[100px] bg-white hover:shadow-lg group overflow-hidden",
    objectCardSelected: "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20 shadow-md",
    objectCardInactive: "border-gray-100 hover:border-indigo-200",
    
    iconBox: "w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-hover:bg-white transition-all shadow-sm",
    iconBoxActive: "bg-white text-indigo-600 shadow-md",
    
    label: "text-[10px] font-black uppercase tracking-wider text-gray-600 group-hover:text-indigo-900 transition-colors",
    
    // Material Preview Gallery
    materialGrid: "grid grid-cols-2 gap-3",
    materialCard: "relative group aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
    materialCardSelected: "border-indigo-600 shadow-lg scale-[1.02]",
    materialCardInactive: "border-transparent hover:border-gray-200",
    materialThumb: "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
    materialInfo: "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end",
    materialName: "text-white font-black text-[10px] uppercase tracking-widest",
    
    // Interactive Canvas Overlays
    silhouetteOverlay: "absolute inset-0 flex items-center justify-center pointer-events-none z-20",
    placementDot: "absolute w-6 h-6 bg-white border-2 border-indigo-600 rounded-full cursor-pointer pointer-events-auto shadow-xl hover:scale-125 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all z-30",
    placementDotSelected: "bg-indigo-600 text-white scale-110 ring-4 ring-indigo-100",
    
    // Logic Badge
    statusBadge: "inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-100 shadow-sm animate-fadeIn",
    statusDot: "w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse",
    statusText: "text-[9px] font-black text-indigo-900 uppercase tracking-widest",

    // Suggester
    suggestBtn: "w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-500/5 mb-6 flex items-center justify-center gap-3 group",
    suggestIcon: "w-4 h-4 transition-transform group-hover:rotate-12",
};
