
export const PlannerStyles = {
    // Config Cards
    optionCard: "relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 h-full text-left hover:shadow-md",
    optionCardSelected: "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20",
    optionCardInactive: "border-gray-100 bg-white hover:border-indigo-200",
    
    optionIcon: "w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors",
    optionIconSelected: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30",
    optionIconInactive: "bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600",
    
    // Review Grid
    gridContainer: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
    dayCard: "bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow relative group",
    
    dayHeader: "p-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center",
    dayLabel: "text-xs font-bold text-gray-500 uppercase tracking-wide",
    editBtn: "p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors",
    
    dayContent: "p-4 flex-1 flex flex-col gap-3",
    topicInput: "w-full text-sm font-bold text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none transition-colors placeholder-gray-300",
    visualInput: "w-full text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-transparent focus:border-indigo-300 focus:bg-white focus:outline-none transition-all resize-none",
    
    // Result Gallery
    resultCard: "relative group aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm",
    resultImage: "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105",
    resultOverlay: "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4",
    
    // Progress Overlay
    progressContainer: "fixed inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-8",
    progressBar: "w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden mt-6",
    progressFill: "h-full bg-indigo-600 transition-all duration-300 ease-out",
};
