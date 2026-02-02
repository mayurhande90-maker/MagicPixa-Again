
export const MobileInteriorStyles = {
    // Mode Switcher (Home vs Office)
    modeGrid: "grid grid-cols-2 gap-3 mb-6 px-1",
    modeCard: "group relative w-full h-[clamp(110px,15vh,140px)] rounded-[1.8rem] overflow-hidden border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer text-left flex flex-col justify-end p-5",
    modeCardSelected: "border-indigo-600 shadow-2xl shadow-indigo-500/20 ring-4 ring-indigo-500/5 scale-[1.02] z-10",
    modeCardInactive: "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg opacity-80 hover:opacity-100",
    
    modeOrb: "absolute w-32 h-32 rounded-full blur-2xl opacity-60 transition-all duration-700 ease-in-out group-hover:opacity-80 group-hover:scale-110 pointer-events-none -top-10 -right-10",
    modeOrbHome: "bg-gradient-to-tr from-amber-300 to-orange-200",
    modeOrbOffice: "bg-gradient-to-tr from-blue-300 to-indigo-200",

    modeIconBox: "absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110",
    modeIconHome: "text-orange-600",
    modeIconOffice: "text-blue-600",
    
    modeTitle: "text-sm font-black text-gray-900 tracking-tight leading-none mb-1 z-10",
    modeDesc: "text-[9px] font-bold text-gray-500 uppercase tracking-widest z-10",

    // Step Components
    stepLabel: "text-[8px] font-black uppercase tracking-[0.2em] transition-all",
    stepBar: "h-1.5 w-full rounded-full transition-all duration-500",
    
    // Scan Animation
    scanLine: "absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_#6366f1] animate-neural-scan z-40",
    
    // Status Pills
    statusBadge: "inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg animate-fadeIn",
    statusDot: "w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse",
    statusText: "text-[9px] font-black text-white uppercase tracking-widest",
};
