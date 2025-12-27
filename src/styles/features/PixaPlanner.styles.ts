
export const PlannerStyles = {
    // Config Cards
    optionCard: "relative p-[min(2vh,16px)] lg:p-[min(2.5vh,20px)] rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 h-full text-left hover:shadow-md",
    optionCardSelected: "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20",
    optionCardInactive: "border-gray-100 bg-white hover:border-indigo-200",
    
    optionIcon: "w-[clamp(32px,5vh,48px)] h-[clamp(32px,5vh,48px)] flex items-center justify-center mb-2 transition-all duration-300",
    optionIconSelected: "scale-110",
    optionIconInactive: "opacity-60 group-hover:opacity-100 group-hover:scale-105",
    
    // Thinking Log
    logContainer: "w-full max-h-[min(30vh,300px)] overflow-y-auto custom-scrollbar scroll-smooth bg-[#0F172A] rounded-2xl p-[min(3vh,24px)] border border-white/10 shadow-2xl mt-[min(4vh,32px)]",
    logHeader: "flex items-center gap-2 mb-[min(2vh,16px)] border-b border-white/10 pb-[min(1.5vh,12px)]",
    logTitle: "text-[clamp(8px,1.1vh,10px)] font-black text-indigo-400 uppercase tracking-[0.2em]",
    logItem: "flex items-start gap-3 mb-[min(1.5vh,12px)] animate-fadeIn",
    logDot: "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
    logText: "text-[clamp(10px,1.4vh,13px)] text-gray-300 font-medium leading-relaxed text-left",

    // Review Grid
    gridContainer: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[min(2vh,20px)]",
    dayCard: "bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow relative group",
    
    dayHeader: "p-[min(1.5vh,12px)] border-b border-gray-100 bg-gray-50/50 flex justify-between items-center",
    dayLabel: "text-[clamp(9px,1.2vh,11px)] font-bold text-gray-500 uppercase tracking-wide",
    editBtn: "p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors",
    
    dayContent: "p-[min(2vh,16px)] flex-1 flex flex-col gap-[min(1.5vh,12px)]",
    topicInput: "w-full text-[clamp(12px,1.6vh,15px)] font-bold text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none transition-colors placeholder-gray-300",
    visualInput: "w-full text-[clamp(10px,1.4vh,12px)] text-gray-600 bg-gray-50 p-[min(1.2vh,10px)] rounded-lg border border-transparent focus:border-indigo-300 focus:bg-white focus:outline-none transition-all resize-none",
    
    // Result Gallery
    resultCard: "relative group aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm",
    resultImage: "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105",
    resultOverlay: "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4",
    
    // Progress Overlay
    progressContainer: "fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-[min(4vh,32px)]",
    progressBar: "w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden mt-[min(3vh,24px)]",
    progressFill: "h-full bg-indigo-600 transition-all duration-300 ease-out",
};
